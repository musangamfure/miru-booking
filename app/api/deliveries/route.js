import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/lib/models/Booking";

export async function POST(req) {
  try {
    await connectDB();
    const { bookingId, tubesDelivered, note } = await req.json();

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "bookingId is required." },
        { status: 400 }
      );
    }

    const num = Number(tubesDelivered);
    if (!tubesDelivered || isNaN(num) || num < 1) {
      return NextResponse.json(
        { success: false, error: "tubesDelivered must be a positive number." },
        { status: 400 }
      );
    }

    // Use lean() so we get a plain JS object — no Mongoose virtuals or schema issues
    const booking = await Booking.findById(bookingId).lean();
    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found." },
        { status: 404 }
      );
    }

    // Safely get existing deliveries regardless of whether field exists in DB
    const existingDeliveries = Array.isArray(booking.deliveries)
      ? booking.deliveries
      : [];
    const alreadyDelivered = existingDeliveries.reduce(
      (s, d) => s + (d.tubesDelivered || 0),
      0
    );
    const remaining = booking.tubes - alreadyDelivered;

    if (num > remaining) {
      return NextResponse.json(
        {
          success: false,
          error: `Only ${remaining} tubes remaining. Cannot deliver ${num}.`,
        },
        { status: 400 }
      );
    }

    const newDelivery = {
      tubesDelivered: num,
      deliveredAt: new Date(),
      note: note || "",
    };

    // $push atomically adds the delivery — avoids any schema default issues on old documents
    const updated = await Booking.findByIdAndUpdate(
      bookingId,
      { $push: { deliveries: newDelivery } },
      { new: true, lean: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Update failed." },
        { status: 500 }
      );
    }

    const updatedDeliveries = Array.isArray(updated.deliveries)
      ? updated.deliveries
      : [];
    const totalDelivered = updatedDeliveries.reduce(
      (s, d) => s + (d.tubesDelivered || 0),
      0
    );
    const { _id, __v, ...rest } = updated;

    return NextResponse.json(
      {
        success: true,
        data: {
          ...rest,
          id: _id.toString(),
          tubesDelivered: totalDelivered,
          tubesPending: rest.tubes - totalDelivered,
          deliveries: updatedDeliveries.map((d) => ({
            tubesDelivered: d.tubesDelivered,
            deliveredAt: d.deliveredAt,
            note: d.note || "",
            id: d._id ? d._id.toString() : String(Math.random()),
          })),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/deliveries error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
