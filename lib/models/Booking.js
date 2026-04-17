import mongoose from "mongoose";

const DeliverySchema = new mongoose.Schema({
  tubesDelivered: { type: Number, required: true, min: 1 },
  deliveredAt: { type: Date, default: Date.now },
  note: { type: String, default: "" },
});

const BookingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    tubes: { type: Number, required: true, min: 1 },
    bookingDate: { type: String, required: true },
    location: { type: String, required: true, trim: true },
    // default: [] ensures existing documents without this field work safely
    deliveries: { type: [DeliverySchema], default: () => [] },
  },
  { timestamps: true }
);

export default mongoose.models.Booking ||
  mongoose.model("Booking", BookingSchema);
