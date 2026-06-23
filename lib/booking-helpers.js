// ─────────────────────────────────────────────────────────────────
// Shared server-side helpers for Booking documents.
//
// Centralised here so every API route (bookings, deliveries, report)
// computes "delivered / pending / delivery date / overdue" the exact
// same way. Before this file existed, the same `normalize()` logic
// was copy-pasted in three different route files and could silently
// drift out of sync.
// ─────────────────────────────────────────────────────────────────

const DAYS_TO_DELIVERY = 30;

/**
 * The date deliveries are due: 30 days after inoculation
 * (Imigina yatewe umurama). Falls back to the booking date for
 * older records created before inoculationDate existed.
 */
export function getDeliveryDate(booking) {
  const base = booking.inoculationDate || booking.bookingDate;
  const d = new Date(base);
  d.setDate(d.getDate() + DAYS_TO_DELIVERY);
  return d;
}

export function sumDelivered(deliveries) {
  return (deliveries || []).reduce((s, d) => s + (d.tubesDelivered || 0), 0);
}

/**
 * Converts a raw Mongo (lean) booking document into the plain shape
 * the client expects: string id, computed tubesDelivered/tubesPending,
 * and deliveries with string ids.
 */
export function normalizeBooking(doc) {
  const { _id, __v, ...rest } = doc;
  const deliveries = Array.isArray(rest.deliveries) ? rest.deliveries : [];
  const tubesDelivered = sumDelivered(deliveries);
  return {
    ...rest,
    id: _id.toString(),
    tubesDelivered,
    tubesPending: rest.tubes - tubesDelivered,
    deliveries: deliveries.map((d) => ({
      tubesDelivered: d.tubesDelivered,
      deliveredAt: d.deliveredAt,
      note: d.note || "",
      id: (d._id || "").toString(),
    })),
  };
}

/**
 * A booking is "overdue" when its 30-day delivery window (from
 * inoculation) has passed and there are still tubes pending.
 */
export function isOverdue(booking, today = new Date()) {
  const due = getDeliveryDate(booking);
  return due < today && booking.tubesPending > 0;
}

export function getOverdueBookings(bookings, today = new Date()) {
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
export async function ensureDeliveriesArray(Booking, bookingId) {
  await Booking.updateOne(
    { _id: bookingId, deliveries: null },
    { $set: { deliveries: [] } }
  );
}
