import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/lib/models/Booking";
import { normalizeBooking, ensureDeliveriesArray } from "@/lib/booking-helpers";
import { errorMessage } from "@/lib/errorMessage";
import type { DeliveryInput } from "@/lib/types";

interface RouteParams {
  params: { id: string };
}

// GET /api/bookings/:id/deliveries — list delivery history for a booking
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const booking = await Booking.findById(params.id).lean();
    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });
    }
    const { deliveries } = normalizeBooking(booking);
    return NextResponse.json({ success: true, data: deliveries });
  } catch (err) {
    console.error("GET /api/bookings/:id/deliveries error:", err);
    return NextResponse.json({ success: false, error: errorMessage(err) }, { status: 500 });
  }
}

// POST /api/bookings/:id/deliveries — record a new delivery
//
// IMPORTANT: the "remaining tubes" check and the array push happen as
// a SINGLE atomic MongoDB operation: a plain $push update, guarded by
// a $expr condition in the FILTER (not an aggregation-pipeline
// update — just a normal update operator, which every MongoDB
// version/driver combination supports reliably). If two requests race
// each other (e.g. a double click), MongoDB processes them one at a
// time; whichever lands second re-evaluates $expr against the
// ALREADY-UPDATED document and correctly fails instead of both
// succeeding and pushing pending tubes negative.
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const bookingId = params.id;
    const { tubesDelivered, note }: DeliveryInput = await req.json();

    const num = Number(tubesDelivered);
    if (!tubesDelivered || isNaN(num) || num < 1) {
      return NextResponse.json(
        { success: false, error: "tubesDelivered must be a positive number." },
        { status: 400 }
      );
    }

    const exists = await Booking.exists({ _id: bookingId });
    if (!exists) {
      return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });
    }

    // Self-healing: repair legacy bookings where `deliveries` is null
    // instead of [] — see ensureDeliveriesArray() for why this matters.
    await ensureDeliveriesArray(Booking, bookingId);

    const newDelivery = {
      _id: new mongoose.Types.ObjectId(),
      tubesDelivered: num,
      deliveredAt: new Date(),
      note: note || "",
    };

    const updated = await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        $expr: {
          $lte: [
            { $add: [{ $sum: "$deliveries.tubesDelivered" }, num] },
            "$tubes",
          ],
        },
      },
      { $push: { deliveries: newDelivery } },
      { new: true }
    ).lean();

    if (!updated) {
      // Booking exists but the atomic condition failed — meaning this
      // delivery (alone, or combined with one that just landed first)
      // would exceed the tubes booked.
      const current = await Booking.findById(bookingId).lean();
      const delivered = (current?.deliveries || []).reduce(
        (s, d) => s + (d.tubesDelivered || 0),
        0
      );
      const remaining = (current?.tubes || 0) - delivered;
      return NextResponse.json(
        {
          success: false,
          error: `Only ${remaining} tubes remaining. Cannot deliver ${num}.`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, data: normalizeBooking(updated) },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/bookings/:id/deliveries error:", err);
    return NextResponse.json({ success: false, error: errorMessage(err) }, { status: 500 });
  }
}
