import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/lib/models/Booking";
import { normalizeBooking, ensureArrayFields } from "@/lib/booking-helpers";
import { errorMessage } from "@/lib/errorMessage";
import type { PaymentInput } from "@/lib/types";

export const dynamic = "force-dynamic";

interface RouteParams { params: { id: string } }

// GET /api/bookings/:id/payments
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const booking = await Booking.findById(params.id).lean();
    if (!booking) return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: normalizeBooking(booking).payments });
  } catch (err) {
    return NextResponse.json({ success: false, error: errorMessage(err) }, { status: 500 });
  }
}

// POST /api/bookings/:id/payments — record a new payment
// Also accepts an optional `promisedPaymentDate` so the user can set
// when the balance will be paid in the same request.
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id: bookingId } = params;
    const { amount, paidAt, note, promisedPaymentDate } = await req.json() as PaymentInput & { promisedPaymentDate?: string };

    const num = Number(amount);
    if (!amount || isNaN(num) || num < 1) {
      return NextResponse.json({ success: false, error: "Amount must be at least 1." }, { status: 400 });
    }

    const exists = await Booking.exists({ _id: bookingId });
    if (!exists) return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });

    await ensureArrayFields(Booking, bookingId);

    const newPayment = {
      _id: new mongoose.Types.ObjectId(),
      amount: num,
      paidAt: paidAt ? new Date(paidAt) : new Date(),
      note: note || "",
    };

    const updateDoc: Record<string, unknown> = { $push: { payments: newPayment } };
    // If a promise date is provided, save it on the booking too
    if (promisedPaymentDate !== undefined) {
      updateDoc.$set = { promisedPaymentDate };
    }

    const updated = await Booking.findByIdAndUpdate(bookingId, updateDoc, { new: true }).lean();
    if (!updated) return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });

    return NextResponse.json({ success: true, data: normalizeBooking(updated) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/bookings/:id/payments error:", err);
    return NextResponse.json({ success: false, error: errorMessage(err) }, { status: 500 });
  }
}
