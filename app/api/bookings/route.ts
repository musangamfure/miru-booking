import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/lib/models/Booking";
import { normalizeBooking } from "@/lib/booking-helpers";
import { errorMessage } from "@/lib/errorMessage";
import type { BookingFormData } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/bookings
export async function GET() {
  try {
    await connectDB();
    const bookings = await Booking.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: bookings.map(normalizeBooking) });
  } catch (err) {
    console.error("GET /api/bookings error:", err);
    return NextResponse.json({ success: false, error: errorMessage(err) }, { status: 500 });
  }
}

// POST /api/bookings
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { name, phone, tubes, bookingDate, inoculationDate, location }: BookingFormData =
      await req.json();
    if (!name || !phone || !tubes || !bookingDate || !location) {
      return NextResponse.json({ success: false, error: "All fields are required." }, { status: 400 });
    }
    const booking = await Booking.create({
      name,
      phone,
      tubes: Number(tubes),
      bookingDate,
      // Falls back to bookingDate when inoculation date isn't provided yet,
      // so the 30-day delivery window always has a base to compute from.
      inoculationDate: inoculationDate || bookingDate,
      location,
    });
    return NextResponse.json({ success: true, data: normalizeBooking(booking.toObject()) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/bookings error:", err);
    return NextResponse.json({ success: false, error: errorMessage(err) }, { status: 500 });
  }
}
