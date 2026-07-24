import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/lib/models/Booking";
import { normalizeBooking } from "@/lib/booking-helpers";
import { errorMessage } from "@/lib/errorMessage";
import type { BookingFormData } from "@/lib/types";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

// PUT /api/bookings/:id
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { name, phone, tubes, bookingDate, inoculationDate, location }: BookingFormData =
      await req.json();
    const updated = await Booking.findByIdAndUpdate(
      params.id,
      {
        name,
        phone,
        tubes: Number(tubes),
        bookingDate,
        inoculationDate: inoculationDate || bookingDate,
        location,
      },
      { new: true, runValidators: true }
    ).lean();
    if (!updated) return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: normalizeBooking(updated) });
  } catch (err) {
    console.error("PUT /api/bookings/:id error:", err);
    return NextResponse.json({ success: false, error: errorMessage(err) }, { status: 500 });
  }
}

// DELETE /api/bookings/:id
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const deleted = await Booking.findByIdAndDelete(params.id);
    if (!deleted) return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: { id: params.id } });
  } catch (err) {
    console.error("DELETE /api/bookings/:id error:", err);
    return NextResponse.json({ success: false, error: errorMessage(err) }, { status: 500 });
  }
}
