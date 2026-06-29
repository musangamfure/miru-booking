import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

/** A single recorded delivery, as stored in MongoDB. */
export interface IDelivery {
  _id: Types.ObjectId;
  tubesDelivered: number;
  deliveredAt: Date;
  note: string;
}

/** A booking document, as stored in MongoDB. */
export interface IBooking extends Document {
  _id: Types.ObjectId;
  name: string;
  phone: string;
  tubes: number;
  bookingDate: string;
  /** Imigina yatewe umurama — delivery is due 30 days after this date. */
  inoculationDate: string;
  location: string;
  deliveries: IDelivery[];
  createdAt: Date;
  updatedAt: Date;
}

const DeliverySchema = new Schema<IDelivery>({
  tubesDelivered: { type: Number, required: true, min: 1 },
  deliveredAt: { type: Date, default: Date.now },
  note: { type: String, default: "" },
});

const BookingSchema = new Schema<IBooking>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    tubes: { type: Number, required: true, min: 1 },
    bookingDate: { type: String, required: true },
    // Date the mushroom tubes were inoculated (Imigina yatewe umurama).
    // Delivery is due 30 days after this date. Optional for backward
    // compatibility with bookings created before this field existed —
    // see getDeliveryDate() in lib/booking-helpers.ts for the fallback.
    inoculationDate: { type: String, default: "" },
    location: { type: String, required: true, trim: true },
    // default: [] ensures existing documents without this field work safely
    deliveries: { type: [DeliverySchema], default: () => [] },
  },
  { timestamps: true }
);

const Booking: Model<IBooking> =
  mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema);

export default Booking;
