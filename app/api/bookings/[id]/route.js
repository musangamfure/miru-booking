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

// PUT /api/bookings/:id
export async function PUT(req, { params }) {
  try {
    await connectDB();
    const { name, phone, tubes, bookingDate, location } = await req.json();
    const updated = await Booking.findByIdAndUpdate(
      params.id,
      { name, phone, tubes: Number(tubes), bookingDate, location },
      { new: true, runValidators: true }
    ).lean();
    if (!updated) return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: normalize(updated) });
  } catch (err) {
    console.error("PUT /api/bookings/:id error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/bookings/:id
export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const deleted = await Booking.findByIdAndDelete(params.id);
    if (!deleted) return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: { id: params.id } });
  } catch (err) {
    console.error("DELETE /api/bookings/:id error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
