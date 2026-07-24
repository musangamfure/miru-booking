import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/lib/models/Booking";
import { normalizeBooking } from "@/lib/booking-helpers";
import { errorMessage } from "@/lib/errorMessage";
import type { PaymentInput } from "@/lib/types";

export const dynamic = "force-dynamic";

interface RouteParams { params: { id: string; paymentId: string } }

// PUT /api/bookings/:id/payments/:paymentId
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id: bookingId, paymentId } = params;
    const { amount, paidAt, note, promisedPaymentDate } = await req.json() as PaymentInput & { promisedPaymentDate?: string };

    const num = Number(amount);
    if (!amount || isNaN(num) || num < 1) {
      return NextResponse.json({ success: false, error: "Amount must be at least 1." }, { status: 400 });
    }

    let paymentObjectId: mongoose.Types.ObjectId;
    try { paymentObjectId = new mongoose.Types.ObjectId(paymentId); }
    catch { return NextResponse.json({ success: false, error: "Invalid payment id." }, { status: 400 }); }

    const setFields: Record<string, unknown> = {
      "payments.$[elem].amount": num,
      "payments.$[elem].note": note || "",
    };
    if (paidAt) setFields["payments.$[elem].paidAt"] = new Date(paidAt);
    if (promisedPaymentDate !== undefined) setFields.promisedPaymentDate = promisedPaymentDate;

    const updated = await Booking.findOneAndUpdate(
      { _id: bookingId, "payments._id": paymentObjectId },
      { $set: setFields },
      { new: true, arrayFilters: [{ "elem._id": paymentObjectId }] }
    ).lean();

    if (!updated) return NextResponse.json({ success: false, error: "Payment not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: normalizeBooking(updated) });
  } catch (err) {
    return NextResponse.json({ success: false, error: errorMessage(err) }, { status: 500 });
  }
}

// DELETE /api/bookings/:id/payments/:paymentId
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id: bookingId, paymentId } = params;
    const updated = await Booking.findByIdAndUpdate(
      bookingId,
      { $pull: { payments: { _id: paymentId } } },
      { new: true }
    ).lean();
    if (!updated) return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: normalizeBooking(updated) });
  } catch (err) {
    return NextResponse.json({ success: false, error: errorMessage(err) }, { status: 500 });
  }
}
