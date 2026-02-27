import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/lib/models/Booking";

// PUT /api/bookings/:id — update a booking
export async function PUT(req, { params }) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, phone, tubes, bookingDate, location } = body;

    const updated = await Booking.findByIdAndUpdate(
      params.id,
      { name, phone, tubes: Number(tubes), bookingDate, location },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });
    }

    const { _id, __v, ...rest } = updated;
    return NextResponse.json({ success: true, data: { ...rest, id: _id.toString() } });
  } catch (err) {
    console.error("PUT /api/bookings/:id error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/bookings/:id — delete a booking
export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const deleted = await Booking.findByIdAndDelete(params.id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { id: params.id } });
  } catch (err) {
    console.error("DELETE /api/bookings/:id error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
