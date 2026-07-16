// ─────────────────────────────────────────────────────────────────
// Shared server-side helpers for Booking documents.
//
// Centralised here so every API route computes "delivered / pending /
// refunded / overdue" the exact same way.
// ─────────────────────────────────────────────────────────────────

import type { Model, Types } from "mongoose";
import type { IBooking } from "@/lib/models/Booking";
import type { Booking, Delivery, Refund } from "@/lib/types";

const DAYS_TO_DELIVERY = 30;

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

export function sumDelivered(deliveries: LeanDelivery[] | undefined | null): number {
  return (deliveries || []).reduce((s, d) => s + (d.tubesDelivered || 0), 0);
}

export function sumRefundedTubes(refunds: LeanRefund[] | undefined | null): number {
  return (refunds || []).reduce((s, r) => s + (r.tubesRefunded || 0), 0);
}

export function sumRefundedAmount(refunds: LeanRefund[] | undefined | null): number {
  return (refunds || []).reduce((s, r) => s + (r.amountRefunded || 0), 0);
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
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/**
 * Converts a raw Mongo (lean) booking document into the normalized shape
 * the client expects.
 *
 * Key derived values:
 *   tubesRefunded = sum of refunds[].tubesRefunded
 *   tubesNet      = tubes - tubesRefunded   (net tubes still owed)
 *   tubesDelivered = sum of deliveries[].tubesDelivered
 *   tubesPending  = tubesNet - tubesDelivered  (remaining to deliver)
 *   amountRefunded = sum of refunds[].amountRefunded
 */
export function normalizeBooking(doc: LeanBooking): Booking {
  const { _id, __v, ...rest } = doc;
  const deliveries = Array.isArray(rest.deliveries) ? rest.deliveries : [];
  const refunds = Array.isArray(rest.refunds) ? rest.refunds : [];

  const tubesDelivered = sumDelivered(deliveries);
  const tubesRefunded = sumRefundedTubes(refunds);
  const amountRefunded = sumRefundedAmount(refunds);
  const tubesNet = rest.tubes - tubesRefunded;

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

  return {
    ...rest,
    inoculationDate: rest.inoculationDate || rest.bookingDate,
    id: _id.toString(),
    tubesDelivered,
    tubesRefunded,
    amountRefunded,
    tubesNet,
    tubesPending: tubesNet - tubesDelivered,
    deliveries: normalizedDeliveries,
    refunds: normalizedRefunds,
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

/** Repair legacy bookings where deliveries/refunds is null instead of []. */
export async function ensureArrayFields(
  BookingModel: Model<IBooking>,
  bookingId: string
): Promise<void> {
  const update: Record<string, unknown> = {};
  const doc = await BookingModel.findById(bookingId).select("deliveries refunds").lean();
  if (!doc) return;
  if ((doc as any).deliveries === null) update.deliveries = [];
  if ((doc as any).refunds === null) update.refunds = [];
  if (Object.keys(update).length > 0) {
    await BookingModel.updateOne({ _id: bookingId }, { $set: update });
  }
}

// Keep the old name as an alias so existing routes compile without changes
export const ensureDeliveriesArray = ensureArrayFields;
