import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    phone:       { type: String, required: true, trim: true },
    tubes:       { type: Number, required: true, min: 1 },
    bookingDate: { type: String, required: true },
    location:    { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.Booking ||
  mongoose.model("Booking", BookingSchema);
