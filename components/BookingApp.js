"use client";

// ─────────────────────────────────────────────────────────────────
// Booking app shell: owns state and data-fetching, and composes the
// small, single-purpose components under components/booking/*.
//
// This file used to be ~3,500 lines holding every modal, card, view,
// and helper function. It's now an orchestrator — each concern
// (a modal, a view, a row, a calculation) lives in its own module so
// a future change/bugfix touches one small file instead of this one.
// ─────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

import {
  apiGetBookings,
  apiCreateBooking,
  apiUpdateBooking,
  apiDeleteBooking,
  apiRecordDelivery,
  apiUpdateDelivery,
  apiDeleteDelivery,
} from "@/lib/api";
import {
  formatDate,
  getDeliveryDate,
  isOverdue,
  exportToExcel,
  EMPTY_FORM,
  PRICE_PER_TUBE,
} from "@/lib/utils";

import { useIsMobile } from "@/components/booking/hooks/useIsMobile";
import { Toast } from "@/components/booking/Toast";
import { UserMenu } from "@/components/booking/UserMenu";
import { ReminderCard } from "@/components/booking/ReminderCard";
import { ConfirmModal } from "@/components/booking/modals/ConfirmModal";
import { WhatsAppModal } from "@/components/booking/modals/WhatsAppModal";
import { DeliveryModal } from "@/components/booking/modals/DeliveryModal";
import { EditDeliveryModal } from "@/components/booking/modals/EditDeliveryModal";
import { BookingForm } from "@/components/booking/form/BookingForm";
import { MobileBookingCard } from "@/components/booking/bookingItems/MobileBookingCard";
import { DesktopBookingRow } from "@/components/booking/bookingItems/DesktopBookingRow";
import { DeliveredView } from "@/components/booking/views/DeliveredView";
import { OverdueView } from "@/components/booking/views/OverdueView";
import { ReportView } from "@/components/booking/views/ReportView";

export default function BookingApp() {
  const isMobile = useIsMobile();
  const { data: session } = useSession();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("dashboard");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [toast, setToast] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [waBooking, setWaBooking] = useState(null);
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [deliveryBooking, setDeliveryBooking] = useState(null);
  const [editingDelivery, setEditingDelivery] = useState(null); // { booking, delivery }
  const [deletingDelivery, setDeletingDelivery] = useState(null); // { booking, delivery }

  // Extra client-side guard against firing two delivery requests for
  // the same booking (e.g. a double click slipping past the modal's
  // own `submitting` state). The backend is the authoritative fix —
  // see app/api/bookings/[id]/deliveries/route.js — this just avoids
  // wasted requests.
  const inFlightDeliveries = useRef(new Set());

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/report");
      if (!res.ok) throw new Error("Failed to generate report");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Miru_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Report downloaded!");
    } catch (err) {
      showToast("Could not generate report.", "error");
    } finally {
      setDownloading(false);
    }
  };

  // Load bookings on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, source } = await apiGetBookings();
      setBookings(data);
      setLoading(false);
      if (source === "mongodb") {
        showToast("Connected to database", "info");
      } else {
        showToast("Offline — using local data", "error");
      }
    })();
  }, []);

  const handleDelivery = async (bookingId, tubesDelivered, note) => {
    if (inFlightDeliveries.current.has(bookingId)) return;
    inFlightDeliveries.current.add(bookingId);
    try {
      const { data } = await apiRecordDelivery(bookingId, tubesDelivered, note);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? data : b)));
      setDeliveryBooking(null);
      const pending = data.tubesPending;
      showToast(
        pending === 0
          ? `All ${data.tubes} tubes delivered!`
          : `${tubesDelivered} tubes delivered. ${pending} remaining.`
      );
    } catch (err) {
      showToast(err.message || "Delivery failed.", "error");
    } finally {
      inFlightDeliveries.current.delete(bookingId);
    }
  };

  const handleEditDeliverySave = async (n, note) => {
    const { booking, delivery } = editingDelivery;
    try {
      const { data } = await apiUpdateDelivery(booking.id, delivery.id, {
        tubesDelivered: n,
        note,
      });
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? data : b)));
      setEditingDelivery(null);
      showToast("Delivery updated.");
    } catch (err) {
      showToast(err.message || "Could not update delivery.", "error");
    }
  };

  const handleDeleteDeliveryConfirm = async () => {
    const { booking, delivery } = deletingDelivery;
    try {
      const { data } = await apiDeleteDelivery(booking.id, delivery.id);
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? data : b)));
      setDeletingDelivery(null);
      showToast("Delivery removed.", "error");
    } catch (err) {
      showToast(err.message || "Could not delete delivery.", "error");
    }
  };

  const goTo = (v) => {
    setView(v);
    if (v !== "add" && v !== "form") {
      setForm(EMPTY_FORM);
      setEditId(null);
    }
  };

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (editId) {
        const { data } = await apiUpdateBooking(editId, {
          ...formData,
          tubes: Number(formData.tubes),
        });
        setBookings((prev) => prev.map((b) => (b.id === editId ? data : b)));
        showToast("Booking updated!");
        setEditId(null);
      } else {
        const { data } = await apiCreateBooking({
          ...formData,
          tubes: Number(formData.tubes),
        });
        setBookings((prev) => [data, ...prev]);
        showToast("Booking saved!");
      }
      setForm(EMPTY_FORM);
      goTo("bookings");
    } catch (err) {
      showToast("Something went wrong.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (b) => {
    setForm({
      name: b.name,
      phone: b.phone,
      tubes: b.tubes,
      bookingDate: b.bookingDate,
      inoculationDate: b.inoculationDate || b.bookingDate,
      location: b.location,
    });
    setEditId(b.id);
    setView(isMobile ? "form" : "add");
  };

  const handleDelete = async (id) => {
    await apiDeleteBooking(id);
    setBookings((prev) => prev.filter((b) => b.id !== id));
    setDeleteId(null);
    showToast("Booking deleted.", "error");
  };

  const totalTubes = bookings.reduce((s, b) => s + b.tubes, 0);
  const totalRevenue = totalTubes * PRICE_PER_TUBE;
  const pendingBookings = bookings.filter(
    (b) => (b.tubesPending ?? b.tubes) > 0
  );
  // "Bookings" is for deliveries still on track; missed ones live only
  // in "Overdue" — see OverdueView. Without this split, a booking that
  // fell behind kept showing up in both tabs.
  const upcomingBookings = pendingBookings.filter((b) => !isOverdue(b));
  const upcoming = upcomingBookings.length;
  const upcomingTubes = upcomingBookings.reduce(
    (s, b) => s + (b.tubesPending ?? b.tubes),
    0
  );
  const tubesPending = pendingBookings.reduce(
    (s, b) => s + (b.tubesPending ?? b.tubes),
    0
  );
  const fullyDelivered = bookings.filter(
    (b) => (b.tubesPending ?? b.tubes) === 0 && (b.tubesDelivered || 0) > 0
  ).length;
  const filtered = upcomingBookings.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.location.toLowerCase().includes(search.toLowerCase()) ||
      b.phone.includes(search)
  );

  const kpis = [
    {
      label: "Pending Bookings",
      value: pendingBookings.length,
      icon: "📋",
      accent: "#4a7c59",
    },
    {
      label: "Tubes Pending",
      value: tubesPending.toLocaleString(),
      icon: "⏳",
      accent: "#fbbf24",
    },
    {
      label: "Tubes Booked",
      value: totalTubes.toLocaleString(),
      icon: "🌱",
      accent: "#2d6a4f",
    },
    {
      label: "Revenue (RWF)",
      value: totalRevenue.toLocaleString(),
      icon: "💰",
      accent: "#1b4332",
    },
    {
      label: "Fully Delivered",
      value: fullyDelivered,
      icon: "✅",
      accent: "#1a3d1a",
    },
  ];

  const sharedModals = (
    <>
      {toast && <Toast {...toast} />}
      {deleteId && (
        <ConfirmModal
          isMobile={isMobile}
          title="Delete Booking?"
          message="This cannot be undone."
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
      {waBooking && (
        <WhatsAppModal
          isMobile={isMobile}
          booking={waBooking}
          onClose={() => setWaBooking(null)}
        />
      )}
      {deliveryBooking && (
        <DeliveryModal
          isMobile={isMobile}
          booking={deliveryBooking}
          onConfirm={(n, note) => handleDelivery(deliveryBooking.id, n, note)}
          onCancel={() => setDeliveryBooking(null)}
        />
      )}
      {editingDelivery && (
        <EditDeliveryModal
          isMobile={isMobile}
          booking={editingDelivery.booking}
          delivery={editingDelivery.delivery}
          onConfirm={handleEditDeliverySave}
          onCancel={() => setEditingDelivery(null)}
        />
      )}
      {deletingDelivery && (
        <ConfirmModal
          isMobile={isMobile}
          title="Delete this delivery?"
          message={`${deletingDelivery.delivery.tubesDelivered} tubes recorded on ${formatDate(
            deletingDelivery.delivery.deliveredAt
          )} will be removed.`}
          onConfirm={handleDeleteDeliveryConfirm}
          onCancel={() => setDeletingDelivery(null)}
        />
      )}
    </>
  );

  const deliveredViewProps = {
    bookings,
    onDeliver: setDeliveryBooking,
    onEditDelivery: (booking, delivery) => setEditingDelivery({ booking, delivery }),
    onDeleteDelivery: (booking, delivery) => setDeletingDelivery({ booking, delivery }),
  };

  // Prevent rendering wrong layout before screen size is known
  if (isMobile === null) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f1a0f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "#4a7c59", fontFamily: "Georgia, serif", fontSize: 24 }}>
          🍄
        </div>
      </div>
    );
  }

  // ── MOBILE ─────────────────────────────────────────────────
  if (isMobile) {
    const mv = view === "add" ? "form" : view;
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f1a0f",
          fontFamily: "Georgia, serif",
          color: "#e8dcc8",
          paddingBottom: 80,
        }}
      >
        {sharedModals}
        <div
          style={{
            background: "#1a2e1a",
            borderBottom: "1px solid #2d4a2d",
            padding: "12px 16px",
            position: "sticky",
            top: 0,
            zIndex: 100,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>🍄</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: "bold", color: "#c8e6c9" }}>
                  Miru Mushrooms
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => exportToExcel(bookings)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 20,
                  border: "1px solid #4a7c59",
                  background: "transparent",
                  color: "#c8e6c9",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "Georgia, serif",
                }}
              >
                ⬇ Excel
              </button>
              <UserMenu session={session} isMobile={true} />
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 16px 0" }}>
          {mv === "dashboard" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                {kpis.map((k) => (
                  <div
                    key={k.label}
                    style={{
                      background: "#1a2e1a",
                      border: "1px solid #2d4a2d",
                      borderRadius: 12,
                      padding: 14,
                      borderLeft: `3px solid ${k.accent}`,
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{k.icon}</div>
                    <div style={{ fontSize: 22, fontWeight: "bold", color: "#c8e6c9" }}>
                      {loading ? "..." : k.value}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6a9c6a",
                        marginTop: 2,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                      }}
                    >
                      {k.label}
                    </div>
                  </div>
                ))}
              </div>
              <ReminderCard bookings={bookings} isMobile={true} />
              <div style={{ background: "#1a2e1a", border: "1px solid #2d4a2d", borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: "bold", color: "#c8e6c9" }}>Recent Bookings</div>
                  <button
                    onClick={() => goTo("bookings")}
                    style={{ fontSize: 12, color: "#4a7c59", background: "none", border: "none", cursor: "pointer", fontFamily: "Georgia, serif" }}
                  >
                    View All →
                  </button>
                </div>
                {loading ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#4a7c59" }}>⏳ Loading...</div>
                ) : bookings.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#4a7c59" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🌱</div>
                    <div style={{ fontSize: 14 }}>No bookings yet</div>
                  </div>
                ) : (
                  [...bookings].slice(0, 3).map((b) => (
                    <div key={b.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #2d4a2d" }}>
                      <div>
                        <div style={{ fontWeight: "bold", color: "#c8e6c9", fontSize: 14 }}>{b.name}</div>
                        <div style={{ fontSize: 11, color: "#6a9c6a" }}>📍 {b.location}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: "#4ade80", fontWeight: "bold", fontSize: 14 }}>{b.tubes.toLocaleString()} tubes</div>
                        <div style={{ fontSize: 11, color: "#6a9c6a" }}>📦 {formatDate(getDeliveryDate(b))}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {mv === "bookings" && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 18, fontWeight: "bold", color: "#c8e6c9" }}>
                  Upcoming Deliveries
                </div>
                <div style={{ fontSize: 12, color: "#6a9c6a", marginTop: 3 }}>
                  {upcomingBookings.length} booking{upcomingBookings.length !== 1 ? "s" : ""} on track ·{" "}
                  <span style={{ color: "#4ade80", fontWeight: "bold" }}>
                    {upcomingTubes.toLocaleString()} tubes
                  </span>{" "}
                  to deliver
                </div>
              </div>
              <input
                placeholder="🔍 Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid #2d4a2d",
                  background: "#1a2e1a",
                  color: "#e8dcc8",
                  fontSize: 14,
                  fontFamily: "Georgia, serif",
                  outline: "none",
                  marginBottom: 14,
                  boxSizing: "border-box",
                }}
              />
              {loading ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#4a7c59" }}>⏳ Loading bookings...</div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "50px 0", color: "#4a7c59" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
                  <div>{search ? "No results found." : "No bookings yet."}</div>
                </div>
              ) : (
                [...filtered].map((b) => (
                  <MobileBookingCard
                    key={b.id}
                    b={b}
                    onEdit={handleEdit}
                    onDelete={(id) => setDeleteId(id)}
                    onWhatsApp={setWaBooking}
                    onDeliver={setDeliveryBooking}
                  />
                ))
              )}
            </div>
          )}
          {mv === "form" && (
            <BookingForm
              form={form}
              setForm={setForm}
              editId={editId}
              saving={saving}
              onSave={handleSave}
              onCancel={() => {
                setForm(EMPTY_FORM);
                setEditId(null);
                goTo("bookings");
              }}
            />
          )}
          {mv === "delivered" && <DeliveredView {...deliveredViewProps} isMobile={true} />}
          {mv === "overdue" && (
            <OverdueView bookings={bookings} isMobile={true} onDeliver={setDeliveryBooking} />
          )}
          {mv === "report" && (
            <ReportView bookings={bookings} downloading={downloading} onDownload={handleDownloadReport} isMobile={true} />
          )}
        </div>

        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#1a2e1a",
            borderTop: "1px solid #2d4a2d",
            display: "flex",
            overflowX: "auto",
            zIndex: 100,
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          {[
            ["dashboard", "📊", "Dashboard"],
            ["bookings", "📋", "Bookings"],
            ["delivered", "🚚", "Delivered"],
            ["overdue", "⚠️", "Overdue"],
            ["form", "➕", "Add"],
            ["report", "📄", "Report"],
          ].map(([v, icon, label]) => (
            <button
              key={v}
              onClick={() => goTo(v)}
              style={{
                flex: "1 0 auto",
                minWidth: 56,
                padding: "10px 0",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
              }}
            >
              <span style={{ fontSize: 22 }}>{icon}</span>
              <span style={{ fontSize: 10, color: mv === v ? "#4ade80" : "#6a9c6a", fontFamily: "Georgia, serif" }}>
                {label}
              </span>
              {mv === v && <div style={{ width: 20, height: 2, borderRadius: 1, background: "#4ade80" }} />}
            </button>
          ))}
        </div>
        <style suppressHydrationWarning>{cssReset}</style>
      </div>
    );
  }

  // ── DESKTOP ────────────────────────────────────────────────
  const dv = view === "form" ? "add" : view;
  return (
    <div style={{ minHeight: "100vh", background: "#0f1a0f", fontFamily: "Georgia, serif", color: "#e8dcc8" }}>
      {sharedModals}
      <header style={{ background: "#1a2e1a", borderBottom: "1px solid #2d4a2d", padding: "0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 28 }}>🍄</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: "bold", color: "#c8e6c9" }}>Miru Mushrooms</div>
              <div style={{ fontSize: 11, color: "#6a9c6a", letterSpacing: 2, textTransform: "uppercase" }}>
                Booking Manager
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <nav style={{ display: "flex", gap: 4 }}>
              {[
                ["dashboard", "📊 Dashboard"],
                ["bookings", "📋 Bookings"],
                ["delivered", "🚚 Delivered"],
                ["overdue", "⚠️ Overdue"],
                ["add", "➕ New Booking"],
                ["report", "📄 Report"],
              ].map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => goTo(v)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontFamily: "Georgia, serif",
                    background: dv === v ? "#4a7c59" : "transparent",
                    color: dv === v ? "#fff" : "#9ab89a",
                    fontWeight: dv === v ? "bold" : "normal",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </button>
              ))}
            </nav>
            <UserMenu session={session} isMobile={false} />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* Dashboard */}
        {dv === "dashboard" && (
          <div>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 28, fontWeight: "bold", color: "#c8e6c9", margin: 0 }}>Overview</h1>
              <p style={{ color: "#6a9c6a", marginTop: 4, fontSize: 14 }}>Live summary of all bookings</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
              {kpis.map((k) => (
                <div
                  key={k.label}
                  style={{ background: "#1a2e1a", border: "1px solid #2d4a2d", borderRadius: 12, padding: 20, borderLeft: `4px solid ${k.accent}` }}
                >
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{k.icon}</div>
                  <div style={{ fontSize: 26, fontWeight: "bold", color: "#c8e6c9" }}>{loading ? "..." : k.value}</div>
                  <div style={{ fontSize: 11, color: "#6a9c6a", marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>
                    {k.label}
                  </div>
                </div>
              ))}
            </div>
            <ReminderCard bookings={bookings} isMobile={false} />
            <div style={{ background: "#1a2e1a", border: "1px solid #2d4a2d", borderRadius: 12, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                <h2 style={{ margin: 0, fontSize: 16, color: "#c8e6c9" }}>Recent Bookings</h2>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => exportToExcel(bookings)}
                    style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #4a7c59", background: "transparent", color: "#c8e6c9", cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif" }}
                  >
                    ⬇ Download Excel
                  </button>
                  <button
                    onClick={() => goTo("bookings")}
                    style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#4a7c59", color: "white", cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif" }}
                  >
                    View All →
                  </button>
                </div>
              </div>
              {loading ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#4a7c59" }}>⏳ Loading bookings...</div>
              ) : bookings.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#4a7c59" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
                  <div style={{ marginBottom: 16 }}>No bookings yet.</div>
                  <button
                    onClick={() => goTo("add")}
                    style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "#4a7c59", color: "white", cursor: "pointer", fontSize: 14, fontFamily: "Georgia, serif" }}
                  >
                    ➕ Add First Booking
                  </button>
                </div>
              ) : (
                [...bookings].slice(0, 5).map((b) => (
                  <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #2d4a2d", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: "bold", color: "#c8e6c9" }}>{b.name}</div>
                      <div style={{ fontSize: 12, color: "#6a9c6a" }}>📍 {b.location} · 📅 {formatDate(b.bookingDate)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#4ade80", fontWeight: "bold" }}>{b.tubes.toLocaleString()} tubes</div>
                      <div style={{ fontSize: 12, color: "#6a9c6a" }}>📦 {formatDate(getDeliveryDate(b))}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* New / Edit booking — CENTERED on desktop */}
        {dv === "add" && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", minHeight: "60vh", paddingTop: 16 }}>
            <div style={{ width: "100%", maxWidth: 560 }}>
              <BookingForm
                form={form}
                setForm={setForm}
                editId={editId}
                saving={saving}
                onSave={handleSave}
                onCancel={() => {
                  setForm(EMPTY_FORM);
                  setEditId(null);
                  goTo("bookings");
                }}
              />
            </div>
          </div>
        )}

        {/* Bookings list */}
        {dv === "bookings" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: "bold", color: "#c8e6c9", margin: 0 }}>Upcoming Deliveries</h1>
                <p style={{ color: "#6a9c6a", marginTop: 4, fontSize: 14 }}>
                  {upcomingBookings.length} booking{upcomingBookings.length !== 1 ? "s" : ""} on track for delivery ·{" "}
                  <span style={{ color: "#4ade80", fontWeight: "bold" }}>
                    {upcomingTubes.toLocaleString()} tubes
                  </span>{" "}
                  to deliver
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  placeholder="🔍 Search name, location, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #2d4a2d", background: "#1a2e1a", color: "#e8dcc8", fontSize: 13, fontFamily: "Georgia, serif", width: 240, outline: "none" }}
                />
                <button
                  onClick={() => exportToExcel(bookings)}
                  style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #4a7c59", background: "transparent", color: "#c8e6c9", cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif" }}
                >
                  ⬇ Excel
                </button>
                <button
                  onClick={() => goTo("add")}
                  style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#4a7c59", color: "white", cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif", fontWeight: "bold" }}
                >
                  ➕ Add Booking
                </button>
              </div>
            </div>
            {loading ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#4a7c59" }}>⏳ Loading bookings...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#4a7c59" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
                <div style={{ fontSize: 18 }}>{search ? "No bookings match your search." : "No bookings yet."}</div>
              </div>
            ) : (
              filtered.map((b) => (
                <DesktopBookingRow
                  key={b.id}
                  b={b}
                  onEdit={handleEdit}
                  onDelete={(id) => setDeleteId(id)}
                  onWhatsApp={setWaBooking}
                  onDeliver={setDeliveryBooking}
                />
              ))
            )}
          </div>
        )}
        {dv === "delivered" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, fontWeight: "bold", color: "#c8e6c9", margin: 0 }}>Delivered</h1>
              <p style={{ color: "#6a9c6a", marginTop: 4, fontSize: 14 }}>Track tube delivery progress per farmer</p>
            </div>
            <DeliveredView {...deliveredViewProps} isMobile={false} />
          </div>
        )}
        {dv === "overdue" && (
          <OverdueView bookings={bookings} isMobile={false} onDeliver={setDeliveryBooking} />
        )}
        {dv === "report" && (
          <ReportView bookings={bookings} downloading={downloading} onDownload={handleDownloadReport} isMobile={false} />
        )}
      </main>
      <style suppressHydrationWarning>{cssReset}</style>
    </div>
  );
}

const cssReset = `
  * { box-sizing: border-box; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
  button:hover { opacity: 0.88; transition: opacity 0.15s; }
  a:hover { opacity: 0.88; }
  input:focus { border-color: #4a7c59 !important; box-shadow: 0 0 0 3px rgba(74,124,89,0.15); }
  input[type='date']::-webkit-calendar-picker-indicator { filter: invert(0.6); }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0f1a0f; } ::-webkit-scrollbar-thumb { background: #2d4a2d; border-radius: 2px; }
`;
