import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/lib/models/Booking";

function normalize(doc) {
  const { _id, __v, ...rest } = doc;
  const totalDelivered = (rest.deliveries || []).reduce((s, d) => s + d.tubesDelivered, 0);
  return {
    ...rest,
    id: _id.toString(),
    tubesDelivered: totalDelivered,
    tubesPending: rest.tubes - totalDelivered,
    deliveries: (rest.deliveries || []).map(d => ({
      ...d,
      id: (d._id || d.id || "").toString(),
    })),
  };
}

// GET /api/bookings
export async function GET() {
  try {
    await connectDB();
    const bookings = await Booking.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: bookings.map(normalize) });
  } catch (err) {
    console.error("GET /api/bookings error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/bookings
export async function POST(req) {
  try {
    await connectDB();
    const { name, phone, tubes, bookingDate, location } = await req.json();
    if (!name || !phone || !tubes || !bookingDate || !location) {
      return NextResponse.json({ success: false, error: "All fields are required." }, { status: 400 });
    }
    const booking = await Booking.create({ name, phone, tubes: Number(tubes), bookingDate, location });
    return NextResponse.json({ success: true, data: normalize(booking.toObject()) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/bookings error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
