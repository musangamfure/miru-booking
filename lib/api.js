const LS_KEY = "miru_bookings";

const lsGet = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } };
const lsSet = (data) => localStorage.setItem(LS_KEY, JSON.stringify(data));

function calcDeliveryFields(b) {
  const totalDelivered = (b.deliveries || []).reduce((s, d) => s + d.tubesDelivered, 0);
  return { ...b, tubesDelivered: totalDelivered, tubesPending: b.tubes - totalDelivered };
}

export async function apiGetBookings() {
  try {
    const res = await fetch("/api/bookings");
    const json = await res.json();
    if (json.success) { lsSet(json.data); return { data: json.data, source: "mongodb" }; }
    throw new Error(json.error);
  } catch (err) {
    console.warn("MongoDB unavailable, using localStorage:", err.message);
    return { data: lsGet().map(calcDeliveryFields), source: "localStorage" };
  }
}

export async function apiCreateBooking(formData) {
  try {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const json = await res.json();
    if (json.success) { lsSet([...lsGet(), json.data]); return { data: json.data, source: "mongodb" }; }
    throw new Error(json.error);
  } catch (err) {
    console.warn("MongoDB unavailable, saving to localStorage:", err.message);
    const newBooking = calcDeliveryFields({ ...formData, id: Date.now().toString(), deliveries: [] });
    lsSet([...lsGet(), newBooking]);
    return { data: newBooking, source: "localStorage" };
  }
}

export async function apiUpdateBooking(id, formData) {
  try {
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const json = await res.json();
    if (json.success) {
      lsSet(lsGet().map(b => (b.id === id ? json.data : b)));
      return { data: json.data, source: "mongodb" };
    }
    throw new Error(json.error);
  } catch (err) {
    console.warn("MongoDB unavailable, updating localStorage:", err.message);
    const current = lsGet();
    const updated = calcDeliveryFields({ ...current.find(b => b.id === id), ...formData, id });
    lsSet(current.map(b => (b.id === id ? updated : b)));
    return { data: updated, source: "localStorage" };
  }
}

export async function apiDeleteBooking(id) {
  try {
    const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) { lsSet(lsGet().filter(b => b.id !== id)); return { source: "mongodb" }; }
    throw new Error(json.error);
  } catch (err) {
    console.warn("MongoDB unavailable, deleting from localStorage:", err.message);
    lsSet(lsGet().filter(b => b.id !== id));
    return { source: "localStorage" };
  }
}

export async function apiRecordDelivery(bookingId, tubesDelivered, note = "") {
  try {
    const res = await fetch("/api/deliveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, tubesDelivered, note }),
    });
    const json = await res.json();
    if (json.success) {
      lsSet(lsGet().map(b => (b.id === bookingId ? json.data : b)));
      return { data: json.data, source: "mongodb" };
    }
    throw new Error(json.error);
  } catch (err) {
    console.warn("MongoDB unavailable, recording delivery in localStorage:", err.message);
    const current = lsGet();
    const booking = current.find(b => b.id === bookingId);
    if (!booking) throw new Error("Booking not found");
    const newDelivery = { id: Date.now().toString(), tubesDelivered: Number(tubesDelivered), deliveredAt: new Date().toISOString(), note };
    const updated = calcDeliveryFields({ ...booking, deliveries: [...(booking.deliveries || []), newDelivery] });
    lsSet(current.map(b => (b.id === bookingId ? updated : b)));
    return { data: updated, source: "localStorage" };
  }
}
