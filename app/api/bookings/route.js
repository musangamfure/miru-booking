import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/lib/models/Booking";

// GET /api/bookings — fetch all bookings
export async function GET() {
  try {
    await connectDB();
    const bookings = await Booking.find().sort({ createdAt: -1 }).lean();
    // Normalize _id to id string for the frontend
    const data = bookings.map(({ _id, __v, ...rest }) => ({
      ...rest,
      id: _id.toString(),
    }));
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("GET /api/bookings error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/bookings — create a new booking
export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, phone, tubes, bookingDate, location } = body;

    if (!name || !phone || !tubes || !bookingDate || !location) {
      return NextResponse.json({ success: false, error: "All fields are required." }, { status: 400 });
    }

    const booking = await Booking.create({ name, phone, tubes: Number(tubes), bookingDate, location });
    const { _id, __v, ...rest } = booking.toObject();
    return NextResponse.json({ success: true, data: { ...rest, id: _id.toString() } }, { status: 201 });
  } catch (err) {
    console.error("POST /api/bookings error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
