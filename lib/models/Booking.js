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
    // Date the mushroom tubes were inoculated (Imigina yatewe umurama).
    // Delivery is due 30 days after this date. Optional for backward
    // compatibility with bookings created before this field existed —
    // see getDeliveryDate() in lib/booking-helpers.js for the fallback.
    inoculationDate: { type: String, default: "" },
    location: { type: String, required: true, trim: true },
    // default: [] ensures existing documents without this field work safely
    deliveries: { type: [DeliverySchema], default: () => [] },
  },
  { timestamps: true }
);

export default mongoose.models.Booking ||
  mongoose.model("Booking", BookingSchema);
