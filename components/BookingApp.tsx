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
  apiCreateRefund,
  apiUpdateRefund,
  apiDeleteRefund,
  apiCreatePayment,
  apiUpdatePayment,
  apiDeletePayment,
} from "@/lib/api";
import {
  formatDate,
  getDeliveryDate,
  isOverdue,
  exportToExcel,
  EMPTY_FORM,
} from "@/lib/utils";
import { errorMessage } from "@/lib/errorMessage";
import type { Booking, BookingFormData, Delivery, Refund, Payment } from "@/lib/types";

import { useIsMobile } from "@/components/booking/hooks/useIsMobile";
import { Toast, type ToastProps } from "@/components/booking/Toast";
import { UserMenu } from "@/components/booking/UserMenu";
import { ReminderCard } from "@/components/booking/ReminderCard";
import { ConfirmModal } from "@/components/booking/modals/ConfirmModal";
import { WhatsAppModal } from "@/components/booking/modals/WhatsAppModal";
import { DeliveryModal } from "@/components/booking/modals/DeliveryModal";
import { EditDeliveryModal } from "@/components/booking/modals/EditDeliveryModal";
import { ReminderModal } from "@/components/booking/modals/ReminderModal";
import { RefundModal } from "@/components/booking/modals/RefundModal";
import { PaymentModal } from "@/components/booking/modals/PaymentModal";
import { BookingForm } from "@/components/booking/form/BookingForm";
import { MobileBookingCard } from "@/components/booking/bookingItems/MobileBookingCard";
import { DesktopBookingRow } from "@/components/booking/bookingItems/DesktopBookingRow";
import { DeliveredView } from "@/components/booking/views/DeliveredView";
import { OverdueView } from "@/components/booking/views/OverdueView";
import { ReportView } from "@/components/booking/views/ReportView";
import { RefundsView } from "@/components/booking/views/RefundsView";
import { PaymentsView } from "@/components/booking/views/PaymentsView";

type ViewName = "dashboard" | "bookings" | "delivered" | "overdue" | "add" | "form" | "report" | "refunds" | "payments";

interface DeliveryTarget {
  booking: Booking;
  delivery: Delivery;
}

interface Kpi {
  label: string;
  value: string | number;
  icon: string;
  accent: string;
}

export default function BookingApp() {
  const isMobile = useIsMobile();
  const { data: session } = useSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<ViewName>("dashboard");
  const [form, setForm] = useState<BookingFormData>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [waBooking, setWaBooking] = useState<Booking | null>(null);
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [deliveryBooking, setDeliveryBooking] = useState<Booking | null>(null);
  const [reminderBooking, setReminderBooking] = useState<Booking | null>(null);
  // Refund state
  const [refundBooking, setRefundBooking] = useState<Booking | null>(null);
  const [editingRefund, setEditingRefund] = useState<{ booking: Booking; refund: Refund } | null>(null);
  const [deletingRefund, setDeletingRefund] = useState<{ booking: Booking; refund: Refund } | null>(null);
  // Payment state
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);
  const [editingPayment, setEditingPayment] = useState<{ booking: Booking; payment: Payment } | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<{ booking: Booking; payment: Payment } | null>(null);
  const [editingDelivery, setEditingDelivery] = useState<DeliveryTarget | null>(null);
  const [deletingDelivery, setDeletingDelivery] = useState<DeliveryTarget | null>(null);

  // Extra client-side guard against firing two delivery requests for
  // the same booking (e.g. a double click slipping past the modal's
  // own `submitting` state). The backend is the authoritative fix —
  // see app/api/bookings/[id]/deliveries/route.js — this just avoids
  // wasted requests.
  const inFlightDeliveries = useRef<Set<string>>(new Set());

  const showToast = (msg: string, type: ToastProps["type"] = "success") => {
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
    } catch {
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

  const handleDelivery = async (bookingId: string, tubesDelivered: number, note: string) => {
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
      showToast(errorMessage(err) || "Delivery failed.", "error");
    } finally {
      inFlightDeliveries.current.delete(bookingId);
    }
  };

  const handleEditDeliverySave = async (n: number, note: string) => {
    if (!editingDelivery) return;
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
      showToast(errorMessage(err) || "Could not update delivery.", "error");
    }
  };

  const handleDeleteDeliveryConfirm = async () => {
    if (!deletingDelivery) return;
    const { booking, delivery } = deletingDelivery;
    try {
      const { data } = await apiDeleteDelivery(booking.id, delivery.id);
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? data : b)));
      setDeletingDelivery(null);
      showToast("Delivery removed.", "error");
    } catch (err) {
      showToast(errorMessage(err) || "Could not delete delivery.", "error");
    }
  };

  const handleRefundCreate = async (tubesRefunded: number, amountRefunded: number, reason: string) => {
    if (!refundBooking) return;
    try {
      const { data } = await apiCreateRefund(refundBooking.id, { tubesRefunded, amountRefunded, reason });
      setBookings((prev) => prev.map((b) => (b.id === refundBooking.id ? data : b)));
      setRefundBooking(null);
      showToast(`Refund of ${tubesRefunded} tubes (RWF ${amountRefunded.toLocaleString()}) recorded.`, "error");
    } catch (err) {
      showToast(errorMessage(err) || "Could not process refund.", "error");
    }
  };

  const handleRefundEdit = async (tubesRefunded: number, amountRefunded: number, reason: string) => {
    if (!editingRefund) return;
    const { booking, refund } = editingRefund;
    try {
      const { data } = await apiUpdateRefund(booking.id, refund.id, { tubesRefunded, amountRefunded, reason });
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? data : b)));
      setEditingRefund(null);
      showToast("Refund updated.");
    } catch (err) {
      showToast(errorMessage(err) || "Could not update refund.", "error");
    }
  };

  const handleRefundDelete = async () => {
    if (!deletingRefund) return;
    const { booking, refund } = deletingRefund;
    try {
      const { data } = await apiDeleteRefund(booking.id, refund.id);
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? data : b)));
      setDeletingRefund(null);
      showToast("Refund removed.");
    } catch (err) {
      showToast(errorMessage(err) || "Could not delete refund.", "error");
    }
  };

  const handlePaymentCreate = async (amount: number, paidAt: string, note: string, promisedPaymentDate: string) => {
    if (!paymentBooking) return;
    try {
      const { data } = await apiCreatePayment(paymentBooking.id, { amount, paidAt, note, promisedPaymentDate });
      setBookings((prev) => prev.map((b) => (b.id === paymentBooking.id ? data : b)));
      setPaymentBooking(null);
      showToast(
        data.amountBalance <= 0
          ? `Payment of RWF ${amount.toLocaleString()} recorded. Booking fully paid! ✓`
          : `RWF ${amount.toLocaleString()} recorded. Balance: RWF ${data.amountBalance.toLocaleString()}.`
      );
    } catch (err) {
      showToast(errorMessage(err) || "Could not record payment.", "error");
    }
  };

  const handlePaymentEdit = async (amount: number, paidAt: string, note: string, promisedPaymentDate: string) => {
    if (!editingPayment) return;
    const { booking, payment } = editingPayment;
    try {
      const { data } = await apiUpdatePayment(booking.id, payment.id, { amount, paidAt, note, promisedPaymentDate });
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? data : b)));
      setEditingPayment(null);
      showToast("Payment updated.");
    } catch (err) {
      showToast(errorMessage(err) || "Could not update payment.", "error");
    }
  };

  const handlePaymentDelete = async () => {
    if (!deletingPayment) return;
    const { booking, payment } = deletingPayment;
    try {
      const { data } = await apiDeletePayment(booking.id, payment.id);
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? data : b)));
      setDeletingPayment(null);
      showToast("Payment removed.");
    } catch (err) {
      showToast(errorMessage(err) || "Could not delete payment.", "error");
    }
  };

  const goTo = (v: ViewName) => {    setView(v);
    if (v !== "add" && v !== "form") {
      setForm(EMPTY_FORM);
      setEditId(null);
    }
  };

  const handleSave = async (formData: BookingFormData) => {
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
    } catch {
      showToast("Something went wrong.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (b: Booking) => {
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

  const handleDelete = async (id: string) => {
    await apiDeleteBooking(id);
    setBookings((prev) => prev.filter((b) => b.id !== id));
    setDeleteId(null);
    showToast("Booking deleted.", "error");
  };

  const totalTubes = bookings.reduce((s, b) => s + b.tubes, 0);
  const totalTubesNet = bookings.reduce((s, b) => s + b.tubesNet, 0);
  const pendingBookings = bookings.filter(
    (b) => (b.tubesPending ?? b.tubes) > 0
  );
  // "Bookings" is for deliveries still on track; missed ones live only
  // in "Overdue" — see OverdueView. Without this split, a booking that
  // fell behind kept showing up in both tabs.
  const upcomingBookings = pendingBookings.filter((b) => !isOverdue(b));
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

  const totalAmountPaid = bookings.reduce((s, b) => s + (b.amountPaid || 0), 0);
  const totalAmountBalance = bookings.reduce((s, b) => s + Math.max(0, b.amountBalance || 0), 0);

  const kpis: Kpi[] = [
    { label: "Pending Bookings", value: pendingBookings.length, icon: "📋", accent: "#4a7c59" },
    { label: "Tubes Pending", value: tubesPending.toLocaleString(), icon: "⏳", accent: "#fbbf24" },
    { label: "Tubes Booked (Net)", value: totalTubesNet.toLocaleString(), icon: "🌱", accent: "#2d6a4f" },
    { label: "Collected (RWF)", value: totalAmountPaid.toLocaleString(), icon: "💰", accent: "#1b4332" },
    { label: "Outstanding (RWF)", value: totalAmountBalance.toLocaleString(), icon: totalAmountBalance > 0 ? "⚠" : "✅", accent: totalAmountBalance > 0 ? "#92400e" : "#1a3d1a" },
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
      {reminderBooking && (
        <ReminderModal
          isMobile={isMobile}
          booking={reminderBooking}
          onClose={() => setReminderBooking(null)}
        />
      )}
      {refundBooking && (
        <RefundModal
          isMobile={isMobile}
          booking={refundBooking}
          onConfirm={handleRefundCreate}
          onCancel={() => setRefundBooking(null)}
        />
      )}
      {editingRefund && (
        <RefundModal
          isMobile={isMobile}
          booking={editingRefund.booking}
          existing={editingRefund.refund}
          onConfirm={handleRefundEdit}
          onCancel={() => setEditingRefund(null)}
        />
      )}
      {deletingRefund && (
        <ConfirmModal
          isMobile={isMobile}
          title="Delete this refund?"
          message={`${deletingRefund.refund.tubesRefunded} tubes / RWF ${deletingRefund.refund.amountRefunded.toLocaleString()} refunded on ${formatDate(deletingRefund.refund.refundedAt)} will be restored.`}
          onConfirm={handleRefundDelete}
          onCancel={() => setDeletingRefund(null)}
        />
      )}
      {paymentBooking && (
        <PaymentModal
          isMobile={isMobile}
          booking={paymentBooking}
          onConfirm={handlePaymentCreate}
          onCancel={() => setPaymentBooking(null)}
        />
      )}
      {editingPayment && (
        <PaymentModal
          isMobile={isMobile}
          booking={editingPayment.booking}
          existing={editingPayment.payment}
          onConfirm={handlePaymentEdit}
          onCancel={() => setEditingPayment(null)}
        />
      )}
      {deletingPayment && (
        <ConfirmModal
          isMobile={isMobile}
          title="Delete this payment?"
          message={`RWF ${deletingPayment.payment.amount.toLocaleString()} paid on ${formatDate(deletingPayment.payment.paidAt)} will be removed.`}
          onConfirm={handlePaymentDelete}
          onCancel={() => setDeletingPayment(null)}
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
    onEditDelivery: (booking: Booking, delivery: Delivery) => setEditingDelivery({ booking, delivery }),
    onDeleteDelivery: (booking: Booking, delivery: Delivery) => setDeletingDelivery({ booking, delivery }),
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
    const mv: ViewName = view === "add" ? "form" : view;
    const mobileNavPrimary: [ViewName, string, string][] = [
      ["dashboard", "📊", "Home"],
      ["bookings", "📋", "Bookings"],
      ["delivered", "🚚", "Delivered"],
      ["overdue", "⚠️", "Overdue"],
      ["form", "➕", "Add"],
    ];
    const mobileNavSecondary: [ViewName, string, string][] = [
      ["payments", "💰", "Payments"],
      ["refunds", "💸", "Refunds"],
      ["report", "📄", "Report"],
    ];
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f1a0f",
          fontFamily: "Georgia, serif",
          color: "#e8dcc8",
          paddingBottom: 108,
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
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
                    onRefund={setRefundBooking}
                    onPay={setPaymentBooking}
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
            <OverdueView bookings={bookings} isMobile={true} onDeliver={setDeliveryBooking} onSendReminder={setReminderBooking} onRefund={setRefundBooking} />
          )}
          {mv === "payments" && (
            <PaymentsView
              bookings={bookings}
              isMobile={true}
              onNewPayment={setPaymentBooking}
              onEditPayment={(b, p) => setEditingPayment({ booking: b, payment: p })}
              onDeletePayment={(b, p) => setDeletingPayment({ booking: b, payment: p })}
            />
          )}
          {mv === "refunds" && (
            <RefundsView
              bookings={bookings}
              isMobile={true}
              onEditRefund={(b, r) => setEditingRefund({ booking: b, refund: r })}
              onDeleteRefund={(b, r) => setDeletingRefund({ booking: b, refund: r })}
              onNewRefund={setRefundBooking}
            />
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
            zIndex: 100,
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          {/* Primary row */}
          <div style={{ display: "flex" }}>
            {mobileNavPrimary.map(([v, icon, label]) => (
              <button
                key={v}
                onClick={() => goTo(v)}
                style={{
                  flex: 1,
                  padding: "9px 0 6px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 21 }}>{icon}</span>
                <span style={{ fontSize: 10, color: mv === v ? "#4ade80" : "#6a9c6a", fontFamily: "Georgia, serif" }}>
                  {label}
                </span>
                {mv === v && <div style={{ width: 18, height: 2, borderRadius: 1, background: "#4ade80" }} />}
              </button>
            ))}
          </div>

          {/* Secondary row — compact, for Refunds + Report */}
          <div style={{ display: "flex", borderTop: "1px solid #0f1a0f", background: "#141f14" }}>
            {mobileNavSecondary.map(([v, icon, label]) => (
              <button
                key={v}
                onClick={() => goTo(v)}
                style={{
                  flex: 1,
                  padding: "5px 0 4px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                }}
              >
                <span style={{ fontSize: 14 }}>{icon}</span>
                <span style={{ fontSize: 11, color: mv === v ? "#4ade80" : "#4a7c59", fontFamily: "Georgia, serif", fontWeight: mv === v ? "bold" : "normal" }}>
                  {label}
                </span>
                {mv === v && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#4ade80", marginLeft: 2 }} />}
              </button>
            ))}
          </div>
        </div>
        <style suppressHydrationWarning>{cssReset}</style>
      </div>
    );
  }

  // ── DESKTOP ────────────────────────────────────────────────
  const dv: ViewName = view === "form" ? "add" : view;

  // Primary nav: daily-use tabs shown as icon+label buttons
  const primaryNavItems: [ViewName, string, string][] = [
    ["dashboard", "📊", "Dashboard"],
    ["bookings", "📋", "Bookings"],
    ["delivered", "🚚", "Delivered"],
    ["overdue", "⚠️", "Overdue"],
    ["add", "➕", "New"],
  ];
  // Secondary nav: less frequent, shown as compact text-only pills
  const secondaryNavItems: [ViewName, string][] = [
    ["payments", "💰 Payments"],
    ["refunds", "💸 Refunds"],
    ["report", "📄 Report"],
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0f1a0f", fontFamily: "Georgia, serif", color: "#e8dcc8" }}>
      {sharedModals}
      <header style={{ background: "#1a2e1a", borderBottom: "1px solid #2d4a2d", padding: "0 16px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          {/* Logo — compact */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 24 }}>🍄</span>
            <div style={{ fontSize: 15, fontWeight: "bold", color: "#c8e6c9", whiteSpace: "nowrap" }}>Miru Mushrooms</div>
          </div>

          {/* Nav — primary tabs */}
          <nav style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 1, minWidth: 0 }}>
            {primaryNavItems.map(([v, icon, label]) => {
              const active = dv === v;
              return (
                <button
                  key={v}
                  onClick={() => goTo(v)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: "Georgia, serif",
                    background: active ? "#4a7c59" : "transparent",
                    color: active ? "#fff" : "#9ab89a",
                    fontWeight: active ? "bold" : "normal",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  {label}
                </button>
              );
            })}

            {/* Divider */}
            <div style={{ width: 1, height: 20, background: "#2d4a2d", margin: "0 4px", flexShrink: 0 }} />

            {/* Secondary tabs — compact text pills */}
            {secondaryNavItems.map(([v, label]) => {
              const active = dv === v;
              return (
                <button
                  key={v}
                  onClick={() => goTo(v)}
                  style={{
                    padding: "5px 9px",
                    borderRadius: 20,
                    border: `1px solid ${active ? "#4a7c59" : "#2d4a2d"}`,
                    cursor: "pointer",
                    fontSize: 11,
                    fontFamily: "Georgia, serif",
                    background: active ? "#1a3d1a" : "transparent",
                    color: active ? "#4ade80" : "#6a9c6a",
                    fontWeight: active ? "bold" : "normal",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          {/* Right side: Excel + UserMenu (avatar only) */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => exportToExcel(bookings)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #2d4a2d", background: "transparent", color: "#6a9c6a", fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif", whiteSpace: "nowrap" }}
            >
              ⬇ Excel
            </button>
            <UserMenu session={session} isMobile={true} />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
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
                  onRefund={setRefundBooking}
                  onPay={setPaymentBooking}
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
          <OverdueView bookings={bookings} isMobile={false} onDeliver={setDeliveryBooking} onSendReminder={setReminderBooking} onRefund={setRefundBooking} />
        )}
        {dv === "payments" && (
          <PaymentsView
            bookings={bookings}
            isMobile={false}
            onNewPayment={setPaymentBooking}
            onEditPayment={(b, p) => setEditingPayment({ booking: b, payment: p })}
            onDeletePayment={(b, p) => setDeletingPayment({ booking: b, payment: p })}
          />
        )}
        {dv === "refunds" && (
          <RefundsView
            bookings={bookings}
            isMobile={false}
            onEditRefund={(b, r) => setEditingRefund({ booking: b, refund: r })}
            onDeleteRefund={(b, r) => setDeletingRefund({ booking: b, refund: r })}
            onNewRefund={setRefundBooking}
          />
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
