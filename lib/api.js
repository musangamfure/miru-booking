// All API calls — with localStorage fallback if MongoDB is unreachable

const LS_KEY = "miru_bookings";

const lsGet = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } };
const lsSet = (data) => localStorage.setItem(LS_KEY, JSON.stringify(data));

export async function apiGetBookings() {
  try {
    const res = await fetch("/api/bookings");
    const json = await res.json();
    if (json.success) {
      lsSet(json.data); // sync to localStorage
      return { data: json.data, source: "mongodb" };
    }
    throw new Error(json.error);
  } catch (err) {
    console.warn("MongoDB unavailable, using localStorage:", err.message);
    return { data: lsGet(), source: "localStorage" };
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
    if (json.success) {
      const current = lsGet();
      lsSet([...current, json.data]);
      return { data: json.data, source: "mongodb" };
    }
    throw new Error(json.error);
  } catch (err) {
    console.warn("MongoDB unavailable, saving to localStorage:", err.message);
    const newBooking = { ...formData, id: Date.now().toString() };
    const current = lsGet();
    lsSet([...current, newBooking]);
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
      const current = lsGet();
      lsSet(current.map((b) => (b.id === id ? json.data : b)));
      return { data: json.data, source: "mongodb" };
    }
    throw new Error(json.error);
  } catch (err) {
    console.warn("MongoDB unavailable, updating localStorage:", err.message);
    const current = lsGet();
    const updated = { ...current.find((b) => b.id === id), ...formData, id };
    lsSet(current.map((b) => (b.id === id ? updated : b)));
    return { data: updated, source: "localStorage" };
  }
}

export async function apiDeleteBooking(id) {
  try {
    const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      const current = lsGet();
      lsSet(current.filter((b) => b.id !== id));
      return { source: "mongodb" };
    }
    throw new Error(json.error);
  } catch (err) {
    console.warn("MongoDB unavailable, deleting from localStorage:", err.message);
    const current = lsGet();
    lsSet(current.filter((b) => b.id !== id));
    return { source: "localStorage" };
  }
}
