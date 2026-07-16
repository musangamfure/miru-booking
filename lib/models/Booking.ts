import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

/** A single recorded delivery, as stored in MongoDB. */
export interface IDelivery {
  _id: Types.ObjectId;
  tubesDelivered: number;
  deliveredAt: Date;
  note: string;
}

/** A single refund, as stored in MongoDB. */
export interface IRefund {
  _id: Types.ObjectId;
  tubesRefunded: number;
  amountRefunded: number;
  reason: string;
  refundedAt: Date;
}

/** A booking document, as stored in MongoDB. */
export interface IBooking extends Document {
  _id: Types.ObjectId;
  name: string;
  phone: string;
  tubes: number;
  bookingDate: string;
  inoculationDate: string;
  location: string;
  deliveries: IDelivery[];
  refunds: IRefund[];
  createdAt: Date;
  updatedAt: Date;
}

const DeliverySchema = new Schema<IDelivery>({
  tubesDelivered: { type: Number, required: true, min: 1 },
  deliveredAt: { type: Date, default: Date.now },
  note: { type: String, default: "" },
});

const RefundSchema = new Schema<IRefund>({
  tubesRefunded: { type: Number, required: true, min: 0 },
  amountRefunded: { type: Number, required: true, min: 0 },
  reason: { type: String, required: true, trim: true },
  refundedAt: { type: Date, default: Date.now },
});

const BookingSchema = new Schema<IBooking>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    tubes: { type: Number, required: true, min: 1 },
    bookingDate: { type: String, required: true },
    inoculationDate: { type: String, default: "" },
    location: { type: String, required: true, trim: true },
    deliveries: { type: [DeliverySchema], default: () => [] },
    refunds: { type: [RefundSchema], default: () => [] },
  },
  { timestamps: true }
);

const Booking: Model<IBooking> =
  mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema);

export default Booking;
