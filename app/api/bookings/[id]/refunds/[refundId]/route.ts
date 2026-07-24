import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/lib/models/Booking";
import { normalizeBooking } from "@/lib/booking-helpers";
import { errorMessage } from "@/lib/errorMessage";
import type { RefundInput } from "@/lib/types";

export const dynamic = "force-dynamic";

interface RouteParams { params: { id: string; refundId: string } }

// PUT /api/bookings/:id/refunds/:refundId — edit a refund
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id: bookingId, refundId } = params;
    const { tubesRefunded, amountRefunded, reason }: RefundInput = await req.json();

    const tubes = Number(tubesRefunded);
    const amount = Number(amountRefunded);

    if (isNaN(tubes) || tubes < 0) return NextResponse.json({ success: false, error: "Invalid tubesRefunded." }, { status: 400 });
    if (isNaN(amount) || amount < 0) return NextResponse.json({ success: false, error: "Invalid amountRefunded." }, { status: 400 });
    if (!reason?.trim()) return NextResponse.json({ success: false, error: "Reason is required." }, { status: 400 });

    let refundObjectId: mongoose.Types.ObjectId;
    try { refundObjectId = new mongoose.Types.ObjectId(refundId); }
    catch { return NextResponse.json({ success: false, error: "Invalid refund id." }, { status: 400 }); }

    // Atomic: sum all OTHER refunds + new amount must not exceed tubes booked
    const sumExcludingThis = {
      $sum: {
        $map: {
          input: "$refunds",
          as: "r",
          in: { $cond: [{ $eq: ["$$r._id", refundObjectId] }, 0, "$$r.tubesRefunded"] },
        },
      },
    };

    const updated = await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        "refunds._id": refundObjectId,
        $expr: { $lte: [{ $add: [sumExcludingThis, tubes] }, "$tubes"] },
      },
      {
        $set: {
          "refunds.$[elem].tubesRefunded": tubes,
          "refunds.$[elem].amountRefunded": amount,
          "refunds.$[elem].reason": reason.trim(),
        },
      },
      { new: true, arrayFilters: [{ "elem._id": refundObjectId }] }
    ).lean();

    if (!updated) return NextResponse.json({ success: false, error: "Refund not found or amount exceeds tubes booked." }, { status: 400 });
    return NextResponse.json({ success: true, data: normalizeBooking(updated) });
  } catch (err) {
    return NextResponse.json({ success: false, error: errorMessage(err) }, { status: 500 });
  }
}

// DELETE /api/bookings/:id/refunds/:refundId
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id: bookingId, refundId } = params;
    const updated = await Booking.findByIdAndUpdate(
      bookingId,
      { $pull: { refunds: { _id: refundId } } },
      { new: true }
    ).lean();
    if (!updated) return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: normalizeBooking(updated) });
  } catch (err) {
    return NextResponse.json({ success: false, error: errorMessage(err) }, { status: 500 });
  }
}
