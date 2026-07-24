// ─────────────────────────────────────────────────────────────────
// Shared server-side helpers for Booking documents.
// ─────────────────────────────────────────────────────────────────

import type { Model, Types } from "mongoose";
import type { IBooking } from "@/lib/models/Booking";
import type { Booking, Delivery, Refund, Payment } from "@/lib/types";

const DAYS_TO_DELIVERY = 30;
const PRICE_PER_TUBE = 600;

export interface DeliveryDateInput {
  inoculationDate?: string | null;
  bookingDate: string;
}

export function getDeliveryDate(booking: DeliveryDateInput): Date {
  const base = booking.inoculationDate || booking.bookingDate;
  const d = new Date(base);
  d.setDate(d.getDate() + DAYS_TO_DELIVERY);
  return d;
}

interface LeanDelivery {
  _id?: Types.ObjectId | string;
  tubesDelivered: number;
  deliveredAt: Date | string;
  note?: string;
}

interface LeanRefund {
  _id?: Types.ObjectId | string;
  tubesRefunded: number;
  amountRefunded: number;
  reason: string;
  refundedAt: Date | string;
}

interface LeanPayment {
  _id?: Types.ObjectId | string;
  amount: number;
  paidAt: Date | string;
  note?: string;
}

export function sumDelivered(deliveries: LeanDelivery[] | undefined | null): number {
  return (deliveries || []).reduce((s, d) => s + (d.tubesDelivered || 0), 0);
}

export function sumRefundedTubes(refunds: LeanRefund[] | undefined | null): number {
  return (refunds || []).reduce((s, r) => s + (r.tubesRefunded || 0), 0);
}

export function sumRefundedAmount(refunds: LeanRefund[] | undefined | null): number {
  return (refunds || []).reduce((s, r) => s + (r.amountRefunded || 0), 0);
}

export function sumPayments(payments: LeanPayment[] | undefined | null): number {
  return (payments || []).reduce((s, p) => s + (p.amount || 0), 0);
}

export interface LeanBooking {
  _id: Types.ObjectId | string;
  __v?: number;
  name: string;
  phone: string;
  tubes: number;
  bookingDate: string;
  inoculationDate?: string;
  location: string;
  deliveries?: LeanDelivery[];
  refunds?: LeanRefund[];
  payments?: LeanPayment[];
  promisedPaymentDate?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/**
 * Converts a raw Mongo (lean) booking document into the normalized shape
 * the client expects.
 *
 * Key derived values:
 *   tubesRefunded   = sum of refunds[].tubesRefunded
 *   tubesNet        = tubes - tubesRefunded
 *   tubesDelivered  = sum of deliveries[].tubesDelivered
 *   tubesPending    = tubesNet - tubesDelivered
 *   amountRefunded  = sum of refunds[].amountRefunded
 *   amountDue       = tubesNet × PRICE_PER_TUBE
 *   amountPaid      = sum of payments[].amount
 *   amountBalance   = amountDue - amountPaid
 */
export function normalizeBooking(doc: LeanBooking): Booking {
  const { _id, __v, ...rest } = doc;
  const deliveries = Array.isArray(rest.deliveries) ? rest.deliveries : [];
  const refunds = Array.isArray(rest.refunds) ? rest.refunds : [];
  const payments = Array.isArray(rest.payments) ? rest.payments : [];

  const tubesDelivered = sumDelivered(deliveries);
  const tubesRefunded = sumRefundedTubes(refunds);
  const amountRefunded = sumRefundedAmount(refunds);
  const tubesNet = rest.tubes - tubesRefunded;
  const amountDue = tubesNet * PRICE_PER_TUBE;
  const amountPaid = sumPayments(payments);

  const normalizedDeliveries: Delivery[] = deliveries.map((d) => ({
    tubesDelivered: d.tubesDelivered,
    deliveredAt: new Date(d.deliveredAt).toISOString(),
    note: d.note || "",
    id: (d._id || "").toString(),
  }));

  const normalizedRefunds: Refund[] = refunds.map((r) => ({
    tubesRefunded: r.tubesRefunded,
    amountRefunded: r.amountRefunded,
    reason: r.reason,
    refundedAt: new Date(r.refundedAt).toISOString(),
    id: (r._id || "").toString(),
  }));

  const normalizedPayments: Payment[] = payments.map((p) => ({
    amount: p.amount,
    paidAt: new Date(p.paidAt).toISOString(),
    note: p.note || "",
    id: (p._id || "").toString(),
  }));

  return {
    ...rest,
    inoculationDate: rest.inoculationDate || rest.bookingDate,
    promisedPaymentDate: rest.promisedPaymentDate || "",
    id: _id.toString(),
    tubesDelivered,
    tubesRefunded,
    amountRefunded,
    tubesNet,
    tubesPending: tubesNet - tubesDelivered,
    amountDue,
    amountPaid,
    amountBalance: amountDue - amountPaid,
    deliveries: normalizedDeliveries,
    refunds: normalizedRefunds,
    payments: normalizedPayments,
    createdAt: rest.createdAt ? new Date(rest.createdAt).toISOString() : undefined,
    updatedAt: rest.updatedAt ? new Date(rest.updatedAt).toISOString() : undefined,
  };
}

export function isOverdue(
  booking: DeliveryDateInput & { tubesPending: number },
  today: Date = new Date()
): boolean {
  const due = getDeliveryDate(booking);
  return due < today && booking.tubesPending > 0;
}

export function getOverdueBookings(bookings: Booking[], today: Date = new Date()): Booking[] {
  return bookings.filter((b) => isOverdue(b, today));
}

/** Repair legacy bookings where array fields are null instead of []. */
export async function ensureArrayFields(
  BookingModel: Model<IBooking>,
  bookingId: string
): Promise<void> {
  const doc = await BookingModel.findById(bookingId)
    .select("deliveries refunds payments")
    .lean() as any;
  if (!doc) return;
  const update: Record<string, unknown> = {};
  if (doc.deliveries === null) update.deliveries = [];
  if (doc.refunds === null) update.refunds = [];
  if (doc.payments === null) update.payments = [];
  if (Object.keys(update).length > 0) {
    await BookingModel.updateOne({ _id: bookingId }, { $set: update });
  }
}

export const ensureDeliveriesArray = ensureArrayFields;
