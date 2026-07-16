import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/lib/models/Booking";
import { normalizeBooking, ensureArrayFields } from "@/lib/booking-helpers";
import { errorMessage } from "@/lib/errorMessage";
import type { RefundInput } from "@/lib/types";

interface RouteParams { params: { id: string } }

// GET /api/bookings/:id/refunds
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const booking = await Booking.findById(params.id).lean();
    if (!booking) return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: normalizeBooking(booking).refunds });
  } catch (err) {
    return NextResponse.json({ success: false, error: errorMessage(err) }, { status: 500 });
  }
}

// POST /api/bookings/:id/refunds — record a new refund
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id: bookingId } = params;
    const { tubesRefunded, amountRefunded, reason }: RefundInput = await req.json();

    const tubes = Number(tubesRefunded);
    const amount = Number(amountRefunded);

    if (isNaN(tubes) || tubes < 0) {
      return NextResponse.json({ success: false, error: "tubesRefunded must be a non-negative number." }, { status: 400 });
    }
    if (isNaN(amount) || amount < 0) {
      return NextResponse.json({ success: false, error: "amountRefunded must be a non-negative number." }, { status: 400 });
    }
    if (!reason?.trim()) {
      return NextResponse.json({ success: false, error: "A reason for the refund is required." }, { status: 400 });
    }

    const exists = await Booking.exists({ _id: bookingId });
    if (!exists) return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });

    await ensureArrayFields(Booking, bookingId);

    const newRefund = {
      _id: new mongoose.Types.ObjectId(),
      tubesRefunded: tubes,
      amountRefunded: amount,
      reason: reason.trim(),
      refundedAt: new Date(),
    };

    // Atomic: only allow if total refunded tubes (existing + new) doesn't
    // exceed tubes booked. tubesRefunded field doesn't exist on old docs, so
    // we use $sum on the array to compute it safely.
    const updated = await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        $expr: {
          $lte: [
            { $add: [{ $sum: "$refunds.tubesRefunded" }, tubes] },
            "$tubes",
          ],
        },
      },
      { $push: { refunds: newRefund } },
      { new: true }
    ).lean();

    if (!updated) {
      const current = await Booking.findById(bookingId).lean();
      const alreadyRefunded = (current?.refunds || []).reduce((s, r) => s + r.tubesRefunded, 0);
      const canRefund = (current?.tubes || 0) - alreadyRefunded;
      return NextResponse.json(
        { success: false, error: `Only ${canRefund} tubes can still be refunded.` },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: normalizeBooking(updated) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/bookings/:id/refunds error:", err);
    return NextResponse.json({ success: false, error: errorMessage(err) }, { status: 500 });
  }
}
