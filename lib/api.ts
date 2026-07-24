// ─────────────────────────────────────────────────────────────────
// Thin API client. Every function talks to MongoDB first and falls
// back to localStorage ONLY when the network/server is truly
// unreachable, so the app keeps working (in a degraded, single-device
// way) when offline.
//
// IMPORTANT distinction (this used to be a bug): a request that
// reaches the server but is legitimately REJECTED (e.g. "only 12
// tubes remaining, can't deliver 20") is NOT the same as the server
// being unreachable. Treating both as "offline" meant a rejected
// delivery would silently fall back to localStorage instead of
// surfacing the real error — the change looked like it worked in the
// UI, but was never saved to MongoDB, so it reverted on next refresh.
// `request()` below only falls back to localStorage when `fetch`
// itself throws (a real connectivity failure); a server response
// with `success: false` is thrown as a normal error instead.
// ─────────────────────────────────────────────────────────────────

import type { Booking, BookingFormData, DataSource, Delivery, RefundInput, PaymentInput } from "@/lib/types";

const LS_KEY = "miru_bookings";

interface ApiResultWithSource<T> {
  data: T;
  source: DataSource;
}

const lsGet = (): Booking[] => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
};
const lsSet = (data: Booking[]): void =>
  localStorage.setItem(LS_KEY, JSON.stringify(data));

const PRICE_PER_TUBE_CALC = 600;

function calcDeliveryFields(b: Partial<Booking> & { tubes: number }): Booking {
  const deliveries = b.deliveries || [];
  const refunds = b.refunds || [];
  const payments = b.payments || [];
  const totalDelivered = deliveries.reduce((s, d) => s + d.tubesDelivered, 0);
  const totalRefundedTubes = refunds.reduce((s, r) => s + r.tubesRefunded, 0);
  const totalRefundedAmount = refunds.reduce((s, r) => s + r.amountRefunded, 0);
  const tubesNet = b.tubes - totalRefundedTubes;
  const amountDue = tubesNet * PRICE_PER_TUBE_CALC;
  const amountPaid = payments.reduce((s, p) => s + p.amount, 0);
  return {
    ...(b as Booking),
    tubesDelivered: totalDelivered,
    tubesRefunded: totalRefundedTubes,
    amountRefunded: totalRefundedAmount,
    tubesNet,
    tubesPending: tubesNet - totalDelivered,
    amountDue,
    amountPaid,
    amountBalance: amountDue - amountPaid,
    promisedPaymentDate: b.promisedPaymentDate || "",
  };
}

type RequestResult =
  | { offline: true }
  | { offline: false; json: { success: true; data: any } };

/**
 * Performs a fetch and returns { offline: true } if the network/server
 * could not be reached at all. If the server responded but rejected
 * the request (success: false), throws a normal Error — callers
 * should let that propagate, NOT treat it as an offline condition.
 */
async function request(url: string, options?: RequestInit): Promise<RequestResult> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch {
    return { offline: true };
  }
  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new Error("The server returned an unexpected response.");
  }
  if (!json.success) {
    throw new Error(json.error || "Request failed.");
  }
  return { offline: false, json };
}

export async function apiGetBookings(): Promise<ApiResultWithSource<Booking[]>> {
  const result = await request("/api/bookings");
  if (!result.offline) {
    lsSet(result.json.data);
    return { data: result.json.data, source: "mongodb" };
  }
  console.warn("MongoDB unreachable, using localStorage.");
  return { data: lsGet().map(calcDeliveryFields), source: "localStorage" };
}

export async function apiCreateBooking(
  formData: BookingFormData
): Promise<ApiResultWithSource<Booking>> {
  const result = await request("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  if (!result.offline) {
    lsSet([...lsGet(), result.json.data]);
    return { data: result.json.data, source: "mongodb" };
  }
  console.warn("MongoDB unreachable, saving to localStorage.");
  const newBooking = calcDeliveryFields({
    ...formData,
    tubes: Number(formData.tubes),
    id: Date.now().toString(),
    deliveries: [],
  });
  lsSet([...lsGet(), newBooking]);
  return { data: newBooking, source: "localStorage" };
}

export async function apiUpdateBooking(
  id: string,
  formData: BookingFormData
): Promise<ApiResultWithSource<Booking>> {
  const result = await request(`/api/bookings/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  if (!result.offline) {
    lsSet(lsGet().map((b) => (b.id === id ? result.json.data : b)));
    return { data: result.json.data, source: "mongodb" };
  }
  console.warn("MongoDB unreachable, updating localStorage.");
  const current = lsGet();
  const existing = current.find((b) => b.id === id);
  const updated = calcDeliveryFields({
    ...existing,
    ...formData,
    tubes: Number(formData.tubes),
    id,
  } as Booking);
  lsSet(current.map((b) => (b.id === id ? updated : b)));
  return { data: updated, source: "localStorage" };
}

export async function apiDeleteBooking(
  id: string
): Promise<{ source: DataSource }> {
  const result = await request(`/api/bookings/${id}`, { method: "DELETE" });
  if (!result.offline) {
    lsSet(lsGet().filter((b) => b.id !== id));
    return { source: "mongodb" };
  }
  console.warn("MongoDB unreachable, deleting from localStorage.");
  lsSet(lsGet().filter((b) => b.id !== id));
  return { source: "localStorage" };
}

// ── Delivery CRUD ──────────────────────────────────────────────

export async function apiRecordDelivery(
  bookingId: string,
  tubesDelivered: number,
  note: string = ""
): Promise<ApiResultWithSource<Booking>> {
  const result = await request(`/api/bookings/${bookingId}/deliveries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tubesDelivered, note }),
  });
  if (!result.offline) {
    lsSet(lsGet().map((b) => (b.id === bookingId ? result.json.data : b)));
    return { data: result.json.data, source: "mongodb" };
  }
  console.warn("MongoDB unreachable, recording delivery in localStorage.");
  const current = lsGet();
  const booking = current.find((b) => b.id === bookingId);
  if (!booking) throw new Error("Booking not found.");
  const existingDeliveries = booking.deliveries || [];
  const alreadyDelivered = existingDeliveries.reduce((s, d) => s + d.tubesDelivered, 0);
  const num = Number(tubesDelivered);
  if (num > booking.tubes - alreadyDelivered) {
    throw new Error(`Only ${booking.tubes - alreadyDelivered} tubes remaining. Cannot deliver ${num}.`);
  }
  const newDelivery: Delivery = {
    id: Date.now().toString(),
    tubesDelivered: num,
    deliveredAt: new Date().toISOString(),
    note,
  };
  const updated = calcDeliveryFields({
    ...booking,
    deliveries: [...existingDeliveries, newDelivery],
  });
  lsSet(current.map((b) => (b.id === bookingId ? updated : b)));
  return { data: updated, source: "localStorage" };
}

export async function apiUpdateDelivery(
  bookingId: string,
  deliveryId: string,
  { tubesDelivered, note }: { tubesDelivered: number; note?: string }
): Promise<ApiResultWithSource<Booking>> {
  const result = await request(`/api/bookings/${bookingId}/deliveries/${deliveryId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tubesDelivered, note }),
  });
  if (!result.offline) {
    lsSet(lsGet().map((b) => (b.id === bookingId ? result.json.data : b)));
    return { data: result.json.data, source: "mongodb" };
  }
  console.warn("MongoDB unreachable, updating delivery in localStorage.");
  const current = lsGet();
  const booking = current.find((b) => b.id === bookingId);
  if (!booking) throw new Error("Booking not found.");
  const num = Number(tubesDelivered);
  const others = (booking.deliveries || []).filter((d) => d.id !== deliveryId);
  const othersTotal = others.reduce((s, d) => s + d.tubesDelivered, 0);
  if (othersTotal + num > booking.tubes) {
    throw new Error("That amount would exceed the tubes booked.");
  }
  const updatedDeliveries = (booking.deliveries || []).map((d) =>
    d.id === deliveryId ? { ...d, tubesDelivered: num, note: note || "" } : d
  );
  const updated = calcDeliveryFields({ ...booking, deliveries: updatedDeliveries });
  lsSet(current.map((b) => (b.id === bookingId ? updated : b)));
  return { data: updated, source: "localStorage" };
}

export async function apiDeleteDelivery(
  bookingId: string,
  deliveryId: string
): Promise<ApiResultWithSource<Booking>> {
  const result = await request(`/api/bookings/${bookingId}/deliveries/${deliveryId}`, {
    method: "DELETE",
  });
  if (!result.offline) {
    lsSet(lsGet().map((b) => (b.id === bookingId ? result.json.data : b)));
    return { data: result.json.data, source: "mongodb" };
  }
  console.warn("MongoDB unreachable, deleting delivery in localStorage.");
  const current = lsGet();
  const booking = current.find((b) => b.id === bookingId);
  if (!booking) throw new Error("Booking not found.");
  const updatedDeliveries = (booking.deliveries || []).filter((d) => d.id !== deliveryId);
  const updated = calcDeliveryFields({ ...booking, deliveries: updatedDeliveries });
  lsSet(current.map((b) => (b.id === bookingId ? updated : b)));
  return { data: updated, source: "localStorage" };
}

// ── Refund CRUD ────────────────────────────────────────────────

export async function apiCreateRefund(
  bookingId: string,
  data: RefundInput
): Promise<ApiResultWithSource<Booking>> {
  const result = await request(`/api/bookings/${bookingId}/refunds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!result.offline) {
    lsSet(lsGet().map((b) => (b.id === bookingId ? result.json.data : b)));
    return { data: result.json.data, source: "mongodb" };
  }
  throw new Error("Cannot create a refund while offline.");
}

export async function apiUpdateRefund(
  bookingId: string,
  refundId: string,
  data: RefundInput
): Promise<ApiResultWithSource<Booking>> {
  const result = await request(`/api/bookings/${bookingId}/refunds/${refundId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!result.offline) {
    lsSet(lsGet().map((b) => (b.id === bookingId ? result.json.data : b)));
    return { data: result.json.data, source: "mongodb" };
  }
  throw new Error("Cannot update a refund while offline.");
}

export async function apiDeleteRefund(
  bookingId: string,
  refundId: string
): Promise<ApiResultWithSource<Booking>> {
  const result = await request(`/api/bookings/${bookingId}/refunds/${refundId}`, {
    method: "DELETE",
  });
  if (!result.offline) {
    lsSet(lsGet().map((b) => (b.id === bookingId ? result.json.data : b)));
    return { data: result.json.data, source: "mongodb" };
  }
  throw new Error("Cannot delete a refund while offline.");
}

// ── Payment CRUD ───────────────────────────────────────────────

export async function apiCreatePayment(
  bookingId: string,
  data: PaymentInput & { promisedPaymentDate?: string }
): Promise<ApiResultWithSource<Booking>> {
  const result = await request(`/api/bookings/${bookingId}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!result.offline) {
    lsSet(lsGet().map((b) => (b.id === bookingId ? result.json.data : b)));
    return { data: result.json.data, source: "mongodb" };
  }
  throw new Error("Cannot create a payment while offline.");
}

export async function apiUpdatePayment(
  bookingId: string,
  paymentId: string,
  data: PaymentInput & { promisedPaymentDate?: string }
): Promise<ApiResultWithSource<Booking>> {
  const result = await request(`/api/bookings/${bookingId}/payments/${paymentId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!result.offline) {
    lsSet(lsGet().map((b) => (b.id === bookingId ? result.json.data : b)));
    return { data: result.json.data, source: "mongodb" };
  }
  throw new Error("Cannot update a payment while offline.");
}

export async function apiDeletePayment(
  bookingId: string,
  paymentId: string
): Promise<ApiResultWithSource<Booking>> {
  const result = await request(`/api/bookings/${bookingId}/payments/${paymentId}`, {
    method: "DELETE",
  });
  if (!result.offline) {
    lsSet(lsGet().map((b) => (b.id === bookingId ? result.json.data : b)));
    return { data: result.json.data, source: "mongodb" };
  }
  throw new Error("Cannot delete a payment while offline.");
}

export async function apiSetPromiseDate(
  bookingId: string,
  promisedPaymentDate: string
): Promise<ApiResultWithSource<Booking>> {
  const result = await request(`/api/bookings/${bookingId}/promise`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ promisedPaymentDate }),
  });
  if (!result.offline) {
    lsSet(lsGet().map((b) => (b.id === bookingId ? result.json.data : b)));
    return { data: result.json.data, source: "mongodb" };
  }
  throw new Error("Cannot update promise date while offline.");
}
