import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IDelivery {
  _id: Types.ObjectId;
  tubesDelivered: number;
  deliveredAt: Date;
  note: string;
}

export interface IRefund {
  _id: Types.ObjectId;
  tubesRefunded: number;
  amountRefunded: number;
  reason: string;
  refundedAt: Date;
}

export interface IPayment {
  _id: Types.ObjectId;
  amount: number;
  paidAt: Date;
  note: string;
}

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
  payments: IPayment[];
  /** ISO date string — when the client promised to pay the balance. */
  promisedPaymentDate: string;
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

const PaymentSchema = new Schema<IPayment>({
  amount: { type: Number, required: true, min: 1 },
  paidAt: { type: Date, default: Date.now },
  note: { type: String, default: "" },
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
    payments: { type: [PaymentSchema], default: () => [] },
    // When the client promised to pay the remaining balance. Empty string
    // means no promise date has been set (i.e. fully paid or not discussed).
    promisedPaymentDate: { type: String, default: "" },
  },
  { timestamps: true }
);

const Booking: Model<IBooking> =
  mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema);

export default Booking;
