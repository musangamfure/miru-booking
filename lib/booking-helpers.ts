// ─────────────────────────────────────────────────────────────────
// Shared server-side helpers for Booking documents.
//
// Centralised here so every API route (bookings, deliveries, report)
// computes "delivered / pending / delivery date / overdue" the exact
// same way. Before this file existed, the same `normalize()` logic
// was copy-pasted in three different route files and could silently
// drift out of sync.
// ─────────────────────────────────────────────────────────────────

import type { Model, Types } from "mongoose";
import type { IBooking } from "@/lib/models/Booking";
import type { Booking, Delivery } from "@/lib/types";

const DAYS_TO_DELIVERY = 30;

/** Anything with the two date fields needed to compute the delivery date. */
export interface DeliveryDateInput {
  inoculationDate?: string | null;
  bookingDate: string;
}

/**
 * The date deliveries are due: 30 days after inoculation
 * (Imigina yatewe umurama). Falls back to the booking date for
 * older records created before inoculationDate existed.
 */
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

export function sumDelivered(deliveries: LeanDelivery[] | undefined | null): number {
  return (deliveries || []).reduce((s, d) => s + (d.tubesDelivered || 0), 0);
}

/** Shape of a Booking document after `.lean()` — a plain object, not a Mongoose Document. */
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
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/**
 * Converts a raw Mongo (lean) booking document into the plain shape
 * the client expects: string id, computed tubesDelivered/tubesPending,
 * and deliveries with string ids.
 */
export function normalizeBooking(doc: LeanBooking): Booking {
  const { _id, __v, ...rest } = doc;
  const deliveries = Array.isArray(rest.deliveries) ? rest.deliveries : [];
  const tubesDelivered = sumDelivered(deliveries);
  const normalizedDeliveries: Delivery[] = deliveries.map((d) => ({
    tubesDelivered: d.tubesDelivered,
    deliveredAt: new Date(d.deliveredAt).toISOString(),
    note: d.note || "",
    id: (d._id || "").toString(),
  }));

  return {
    ...rest,
    inoculationDate: rest.inoculationDate || rest.bookingDate,
    id: _id.toString(),
    tubesDelivered,
    tubesPending: rest.tubes - tubesDelivered,
    deliveries: normalizedDeliveries,
    createdAt: rest.createdAt ? new Date(rest.createdAt).toISOString() : undefined,
    updatedAt: rest.updatedAt ? new Date(rest.updatedAt).toISOString() : undefined,
  };
}

/**
 * A booking is "overdue" when its 30-day delivery window (from
 * inoculation) has passed and there are still tubes pending.
 */
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

/**
 * Self-healing repair for legacy documents.
 *
 * Some older bookings (created before the `deliveries` array existed,
 * or inserted outside Mongoose) can end up with `deliveries: null`
 * instead of `[]`. MongoDB's $push refuses to push onto a field that
 * is explicitly null (it only works on a missing field or an actual
 * array), so any delivery attempt on such a booking fails with:
 * "The field 'deliveries' must be an array but is of type null".
 *
 * Call this once before any $push/array-element update on a booking.
 * It's a no-op (matches nothing) for the vast majority of bookings
 * that already have a proper array, so it's cheap to call every time.
 */
export async function ensureDeliveriesArray(
  BookingModel: Model<IBooking>,
  bookingId: string
): Promise<void> {
  await BookingModel.updateOne(
    { _id: bookingId, deliveries: null },
    { $set: { deliveries: [] } }
  );
}
