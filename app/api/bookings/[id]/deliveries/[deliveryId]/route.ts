import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/lib/models/Booking";
import { normalizeBooking, ensureDeliveriesArray } from "@/lib/booking-helpers";
import { errorMessage } from "@/lib/errorMessage";
import type { DeliveryInput } from "@/lib/types";

interface RouteParams {
  params: { id: string; deliveryId: string };
}

// PUT /api/bookings/:id/deliveries/:deliveryId — edit a recorded delivery
//
// Same atomic pattern as the create route: the new total (everyone
// else's deliveries + this delivery's NEW amount) is checked via
// $expr in the FILTER, and the write itself is a plain, standard
// $set with arrayFilters — not an aggregation-pipeline update — so
// it behaves consistently across MongoDB versions/drivers. Two
// simultaneous edits can't push the booking into negative pending
// tubes either.
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id: bookingId, deliveryId } = params;
    const { tubesDelivered, note }: DeliveryInput = await req.json();

    const num = Number(tubesDelivered);
    if (!tubesDelivered || isNaN(num) || num < 1) {
      return NextResponse.json(
        { success: false, error: "tubesDelivered must be a positive number." },
        { status: 400 }
      );
    }

    let deliveryObjectId: mongoose.Types.ObjectId;
    try {
      deliveryObjectId = new mongoose.Types.ObjectId(deliveryId);
    } catch {
      return NextResponse.json({ success: false, error: "Invalid delivery id." }, { status: 400 });
    }

    // Self-healing: repair legacy bookings where `deliveries` is null
    // instead of [] before matching/updating array elements on it.
    await ensureDeliveriesArray(Booking, bookingId);

    const sumExcludingThisDelivery = {
      $sum: {
        $map: {
          input: "$deliveries",
          as: "d",
          in: {
            $cond: [{ $eq: ["$$d._id", deliveryObjectId] }, 0, "$$d.tubesDelivered"],
          },
        },
      },
    };

    const updated = await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        "deliveries._id": deliveryObjectId,
        $expr: {
          $lte: [{ $add: [sumExcludingThisDelivery, num] }, "$tubes"],
        },
      },
      {
        $set: {
          "deliveries.$[elem].tubesDelivered": num,
          "deliveries.$[elem].note": note || "",
        },
      },
      {
        new: true,
        arrayFilters: [{ "elem._id": deliveryObjectId }],
      }
    ).lean();

    if (!updated) {
      const booking = await Booking.findById(bookingId).lean();
      if (!booking) {
        return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });
      }
      const found = (booking.deliveries || []).some(
        (d) => String(d._id) === deliveryId
      );
      if (!found) {
        return NextResponse.json({ success: false, error: "Delivery not found." }, { status: 404 });
      }
      return NextResponse.json(
        { success: false, error: "That amount would exceed the tubes booked." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: normalizeBooking(updated) });
  } catch (err) {
    console.error("PUT /api/bookings/:id/deliveries/:deliveryId error:", err);
    return NextResponse.json({ success: false, error: errorMessage(err) }, { status: 500 });
  }
}

// DELETE /api/bookings/:id/deliveries/:deliveryId — remove a recorded delivery
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id: bookingId, deliveryId } = params;

    const updated = await Booking.findByIdAndUpdate(
      bookingId,
      { $pull: { deliveries: { _id: deliveryId } } },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: normalizeBooking(updated) });
  } catch (err) {
    console.error("DELETE /api/bookings/:id/deliveries/:deliveryId error:", err);
    return NextResponse.json({ success: false, error: errorMessage(err) }, { status: 500 });
  }
}
