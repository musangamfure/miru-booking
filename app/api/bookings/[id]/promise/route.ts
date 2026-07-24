import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/lib/models/Booking";
import { normalizeBooking } from "@/lib/booking-helpers";
import { errorMessage } from "@/lib/errorMessage";

export const dynamic = "force-dynamic";

interface RouteParams { params: { id: string } }

// PATCH /api/bookings/:id/promise — set/update the promised payment date
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { promisedPaymentDate } = await req.json() as { promisedPaymentDate: string };
    const updated = await Booking.findByIdAndUpdate(
      params.id,
      { $set: { promisedPaymentDate: promisedPaymentDate || "" } },
      { new: true }
    ).lean();
    if (!updated) return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: normalizeBooking(updated) });
  } catch (err) {
    return NextResponse.json({ success: false, error: errorMessage(err) }, { status: 500 });
  }
}
