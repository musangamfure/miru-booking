"use client";

import { useState, useEffect, useCallback } from "react";
import {
  EMPTY_FORM,
  formatDate,
  getDeliveryDate,
  buildWhatsAppMessage,
  buildWaLink,
  exportToExcel,
  PRICE_PER_TUBE,
} from "@/lib/utils";
import {
  apiGetBookings,
  apiCreateBooking,
  apiUpdateBooking,
  apiDeleteBooking,
} from "@/lib/api";

// ── useIsMobile ────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    fn();
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return isMobile;
}

// ── Toast ──────────────────────────────────────────────────────
function Toast({ msg, type }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9998,
        background: type === "error" ? "#7f1d1d" : "#1a3d1a",
        color: "#e8dcc8",
        padding: "12px 20px",
        borderRadius: 24,
        fontSize: 14,
        fontFamily: "Georgia, serif",
        border: `1px solid ${type === "error" ? "#dc2626" : "#4ade80"}`,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        whiteSpace: "nowrap",
        animation: "fadeIn 0.2s ease",
      }}
    >
      {type === "error" ? "⚠ " : "✓ "}
      {msg}
    </div>
  );
}

// ── DB Status Badge ────────────────────────────────────────────
function DbBadge({ source, loading }) {
  if (loading)
    return (
      <span
        style={{
          fontSize: 11,
          padding: "4px 10px",
          borderRadius: 20,
          background: "#1a2e1a",
          color: "#6a9c6a",
          border: "1px solid #2d4a2d",
          fontFamily: "Georgia, serif",
        }}
      >
        ⏳ Connecting...
      </span>
    );
  return (
    <span
      style={{
        fontSize: 11,
        padding: "4px 10px",
        borderRadius: 20,
        fontFamily: "Georgia, serif",
        background: source === "mongodb" ? "#1a3d1a" : "#2a2000",
        color: source === "mongodb" ? "#4ade80" : "#fbbf24",
        border: `1px solid ${source === "mongodb" ? "#4ade80" : "#f59e0b"}`,
      }}
    >
      {source === "mongodb" ? "🟢 MongoDB" : "🟡 Offline (localStorage)"}
    </span>
  );
}

// ── Delete Modal ───────────────────────────────────────────────
function DeleteModal({ onConfirm, onCancel, isMobile }) {
  const panelStyle = isMobile
    ? {
        width: "100%",
        background: "#1a2e1a",
        borderRadius: "20px 20px 0 0",
        padding: "20px 20px calc(20px + env(safe-area-inset-bottom,0px))",
      }
    : {
        background: "#1a2e1a",
        border: "1px solid #4a7c59",
        borderRadius: 12,
        padding: 32,
        maxWidth: 360,
        width: "90%",
        boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
      };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        zIndex: 9999,
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
      }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        style={{
          ...panelStyle,
          fontFamily: "Georgia, serif",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 10 }}>🗑</div>
        <div
          style={{
            fontSize: 18,
            fontWeight: "bold",
            color: "#c8e6c9",
            marginBottom: 8,
          }}
        >
          Delete Booking?
        </div>
        <div style={{ fontSize: 14, color: "#6a9c6a", marginBottom: 24 }}>
          This cannot be undone.
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: 13,
              borderRadius: 10,
              border: "1px solid #4a7c59",
              background: "transparent",
              color: "#c8e6c9",
              fontSize: 15,
              cursor: "pointer",
              fontFamily: "Georgia, serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: 13,
              borderRadius: 10,
              border: "none",
              background: "#dc2626",
              color: "white",
              fontSize: 15,
              fontWeight: "bold",
              cursor: "pointer",
              fontFamily: "Georgia, serif",
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── WhatsApp Modal ─────────────────────────────────────────────
function WhatsAppModal({ booking, onClose, isMobile }) {
  const [copied, setCopied] = useState(false);
  const msg = buildWhatsAppMessage(booking);
  const link = buildWaLink(booking);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const panelStyle = isMobile
    ? {
        background: "#1a2e1a",
        borderRadius: "20px 20px 0 0",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        paddingBottom: "env(safe-area-inset-bottom, 16px)",
      }
    : {
        background: "#1a2e1a",
        borderRadius: 16,
        maxWidth: 480,
        width: "100%",
        maxHeight: "85vh",
        display: "flex",
        flexDirection: "column",
        border: "1px solid #2d4a2d",
        boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
      };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 9999,
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : 24,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={panelStyle}>
        {isMobile && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "12px 0 0",
            }}
          >
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                background: "#4a7c59",
              }}
            />
          </div>
        )}
        <div
          style={{
            padding: "16px 20px 12px",
            borderBottom: "1px solid #2d4a2d",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 17, fontWeight: "bold", color: "#c8e6c9" }}>
              💬 WhatsApp Message
            </div>
            <div style={{ fontSize: 12, color: "#6a9c6a", marginTop: 2 }}>
              For {booking.name}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              background: "#2d4a2d",
              color: "#c8e6c9",
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: "14px 20px 0" }}>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "14px 0",
              borderRadius: 12,
              background: "#25D366",
              color: "white",
              fontWeight: "bold",
              fontSize: 16,
              textDecoration: "none",
              boxShadow: "0 4px 20px rgba(37,211,102,0.3)",
            }}
          >
            <span style={{ fontSize: 20 }}>💬</span> Open in WhatsApp
          </a>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          <div
            style={{
              fontSize: 11,
              color: "#4a7c59",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 10,
            }}
          >
            Message Preview
          </div>
          <div
            style={{
              background: "#0f1a0f",
              border: "1px solid #2d4a2d",
              borderRadius: 12,
              padding: 16,
              fontSize: 14,
              color: "#c8e6c9",
              whiteSpace: "pre-line",
              lineHeight: 1.8,
            }}
          >
            {msg}
          </div>
        </div>
        <div style={{ padding: "0 20px 16px", display: "flex", gap: 10 }}>
          <button
            onClick={handleCopy}
            style={{
              flex: 1,
              padding: "13px 0",
              borderRadius: 12,
              border: "1px solid #4a7c59",
              background: copied ? "#1a3d1a" : "transparent",
              color: copied ? "#4ade80" : "#c8e6c9",
              fontSize: 15,
              fontWeight: "bold",
              cursor: "pointer",
              fontFamily: "Georgia, serif",
              transition: "all 0.2s",
            }}
          >
            {copied ? "✓ Copied!" : "📋 Copy Message"}
          </button>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: 1,
              padding: "13px 0",
              borderRadius: 12,
              background: "#25D366",
              color: "white",
              fontWeight: "bold",
              fontSize: 15,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            💬 Send
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Booking Form (shared) ──────────────────────────────────────
function BookingForm({ form, setForm, editId, onSave, onCancel, saving }) {
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.phone.trim()) e.phone = "Required";
    else if (!/^\d{9,15}$/.test(form.phone.replace(/\s/g, "")))
      e.phone = "Enter a valid number with country code";
    if (!form.tubes || isNaN(form.tubes) || Number(form.tubes) <= 0)
      e.tubes = "Enter a valid number";
    if (!form.bookingDate) e.bookingDate = "Required";
    if (!form.location.trim()) e.location = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const fields = [
    {
      key: "name",
      label: "Farmer Name",
      placeholder: "e.g. Uwimana Claudette",
      type: "text",
    },
    {
      key: "phone",
      label: "Telephone (with country code)",
      placeholder: "e.g. 250788123456",
      type: "tel",
    },
    {
      key: "tubes",
      label: "Tubes Booked",
      placeholder: "e.g. 500",
      type: "number",
    },
    {
      key: "bookingDate",
      label: "Booking Date",
      placeholder: "",
      type: "date",
    },
    {
      key: "location",
      label: "Farm Location",
      placeholder: "e.g. Musanze",
      type: "text",
    },
  ];

  const preview =
    form.name && form.tubes && form.bookingDate
      ? buildWhatsAppMessage({ ...form, tubes: Number(form.tubes) })
      : null;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: "bold", color: "#c8e6c9" }}>
          {editId ? "Edit Booking" : "New Booking"}
        </div>
        <div style={{ fontSize: 13, color: "#6a9c6a", marginTop: 4 }}>
          {editId
            ? "Update the details below."
            : "Fill in the farmer's details."}
        </div>
      </div>
      <div
        style={{
          background: "#1a2e1a",
          border: "1px solid #2d4a2d",
          borderRadius: 14,
          padding: 20,
        }}
      >
        {fields.map((field) => (
          <div key={field.key} style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: "#9ab89a",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              {field.label}
            </label>
            <input
              type={field.type}
              placeholder={field.placeholder}
              value={form[field.key]}
              onChange={(e) => {
                setForm({ ...form, [field.key]: e.target.value });
                setErrors({ ...errors, [field.key]: null });
              }}
              style={{
                width: "100%",
                padding: "13px 14px",
                borderRadius: 10,
                border: `1px solid ${
                  errors[field.key] ? "#dc2626" : "#2d4a2d"
                }`,
                background: "#0f1a0f",
                color: "#e8dcc8",
                fontSize: 15,
                fontFamily: "Georgia, serif",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {errors[field.key] && (
              <div style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>
                ⚠ {errors[field.key]}
              </div>
            )}
          </div>
        ))}
        {form.tubes && Number(form.tubes) > 0 && (
          <div
            style={{
              background: "#0a140a",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 13, color: "#6a9c6a" }}>
              Amount to pay
            </span>
            <span
              style={{ fontSize: 16, fontWeight: "bold", color: "#4ade80" }}
            >
              RWF {(Number(form.tubes) * PRICE_PER_TUBE).toLocaleString()}
            </span>
          </div>
        )}
        {preview && (
          <div
            style={{
              background: "#0a140a",
              border: "1px solid #2d4a2d",
              borderRadius: 10,
              padding: 14,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#4a7c59",
                letterSpacing: 1,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              💬 Message Preview
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#9ab89a",
                whiteSpace: "pre-line",
                lineHeight: 1.8,
              }}
            >
              {preview}
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => {
              if (validate()) onSave(form);
            }}
            disabled={saving}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 10,
              border: "none",
              background: saving ? "#2d4a2d" : "#4a7c59",
              color: "white",
              fontSize: 15,
              fontWeight: "bold",
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "Georgia, serif",
              transition: "background 0.2s",
            }}
          >
            {saving ? "Saving..." : editId ? "Update Booking" : "Save Booking"}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              padding: "14px 18px",
              borderRadius: 10,
              border: "1px solid #2d4a2d",
              background: "transparent",
              color: "#9ab89a",
              fontSize: 15,
              cursor: "pointer",
              fontFamily: "Georgia, serif",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mobile Booking Card ────────────────────────────────────────
function MobileBookingCard({ b, onEdit, onDelete, onWhatsApp }) {
  return (
    <div
      style={{
        background: "#1a2e1a",
        border: "1px solid #2d4a2d",
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "#2d4a2d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 17,
              fontWeight: "bold",
              color: "#4ade80",
              flexShrink: 0,
            }}
          >
            {b.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: "bold", color: "#c8e6c9" }}>
              {b.name}
            </div>
            <div style={{ fontSize: 12, color: "#6a9c6a" }}>📞 {b.phone}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: "bold", color: "#4ade80" }}>
            {b.tubes.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: "#6a9c6a" }}>tubes</div>
        </div>
      </div>
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}
      >
        {[
          { icon: "📍", text: b.location },
          { icon: "📅", text: formatDate(b.bookingDate) },
          {
            icon: "📦",
            text: `Delivery: ${formatDate(getDeliveryDate(b.bookingDate))}`,
            green: true,
          },
          {
            icon: "💰",
            text: `RWF ${(b.tubes * PRICE_PER_TUBE).toLocaleString()}`,
          },
        ].map((chip) => (
          <span
            key={chip.text}
            style={{
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 20,
              background: "#0f1a0f",
              color: chip.green ? "#4ade80" : "#9ab89a",
              border: "1px solid #1a2e1a",
            }}
          >
            {chip.icon} {chip.text}
          </span>
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto auto",
          gap: 8,
        }}
      >
        <button
          onClick={() => onWhatsApp(b)}
          style={{
            padding: "12px 0",
            borderRadius: 10,
            border: "none",
            background: "#25D366",
            color: "white",
            fontSize: 14,
            fontWeight: "bold",
            cursor: "pointer",
            fontFamily: "Georgia, serif",
          }}
        >
          💬 WhatsApp
        </button>
        <button
          onClick={() => onEdit(b)}
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #2d4a2d",
            background: "transparent",
            color: "#9ab89a",
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "Georgia, serif",
          }}
        >
          ✏
        </button>
        <button
          onClick={() => onDelete(b.id)}
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #7f1d1d",
            background: "transparent",
            color: "#f87171",
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "Georgia, serif",
          }}
        >
          🗑
        </button>
      </div>
    </div>
  );
}

// ── Desktop Booking Row ────────────────────────────────────────
function DesktopBookingRow({ b, onEdit, onDelete, onWhatsApp }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(buildWhatsAppMessage(b)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div
      style={{
        background: "#1a2e1a",
        border: "1px solid #2d4a2d",
        borderRadius: 12,
        padding: 20,
        marginBottom: 10,
        transition: "border-color 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#4a7c59")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2d4a2d")}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flex: 1,
            minWidth: 200,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#2d4a2d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              fontWeight: "bold",
              color: "#4ade80",
              flexShrink: 0,
            }}
          >
            {b.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: "bold", color: "#c8e6c9", fontSize: 16 }}>
              {b.name}
            </div>
            <div style={{ fontSize: 12, color: "#6a9c6a" }}>📞 {b.phone}</div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 13, color: "#9ab89a" }}>
            📍 {b.location}
          </span>
          <span style={{ fontSize: 13, color: "#9ab89a" }}>
            📅 {formatDate(b.bookingDate)}
          </span>
          <span style={{ fontSize: 13, color: "#4ade80" }}>
            📦 {formatDate(getDeliveryDate(b.bookingDate))}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 8,
          }}
        >
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: "bold", color: "#4ade80" }}>
              {b.tubes.toLocaleString()} tubes
            </div>
            <div style={{ fontSize: 12, color: "#9ab89a" }}>
              RWF {(b.tubes * PRICE_PER_TUBE).toLocaleString()}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => onWhatsApp(b)}
              style={{
                padding: "7px 12px",
                borderRadius: 7,
                border: "none",
                background: "#25D366",
                color: "white",
                fontSize: 12,
                fontWeight: "bold",
                cursor: "pointer",
                fontFamily: "Georgia, serif",
              }}
            >
              💬 WhatsApp
            </button>
            <button
              onClick={handleCopy}
              style={{
                padding: "7px 12px",
                borderRadius: 7,
                border: "1px solid #2d4a2d",
                background: copied ? "#1a3d1a" : "transparent",
                color: copied ? "#4ade80" : "#9ab89a",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "Georgia, serif",
              }}
            >
              {copied ? "✓ Copied" : "📋 Copy"}
            </button>
            <button
              onClick={() => onEdit(b)}
              style={{
                padding: "7px 12px",
                borderRadius: 7,
                border: "1px solid #2d4a2d",
                background: "transparent",
                color: "#9ab89a",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "Georgia, serif",
              }}
            >
              ✏ Edit
            </button>
            <button
              onClick={() => onDelete(b.id)}
              style={{
                padding: "7px 12px",
                borderRadius: 7,
                border: "1px solid #7f1d1d",
                background: "transparent",
                color: "#f87171",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "Georgia, serif",
              }}
            >
              🗑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────

// ── Report View ────────────────────────────────────────────────
function ReportView({ bookings, downloading, onDownload, isMobile }) {
  const totalTubes = bookings.reduce((s, b) => s + b.tubes, 0);
  const totalRevenue = totalTubes * PRICE_PER_TUBE;
  const today = new Date().toISOString().split("T")[0];

  const byMonth = {};
  bookings.forEach((b) => {
    const d = new Date(b.bookingDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    if (!byMonth[key]) byMonth[key] = { tubes: 0, count: 0, revenue: 0 };
    byMonth[key].tubes += b.tubes;
    byMonth[key].count += 1;
    byMonth[key].revenue += b.tubes * PRICE_PER_TUBE;
  });

  const byLocation = {};
  bookings.forEach((b) => {
    if (!byLocation[b.location])
      byLocation[b.location] = { tubes: 0, count: 0 };
    byLocation[b.location].tubes += b.tubes;
    byLocation[b.location].count += 1;
  });

  const upcoming = bookings.filter(
    (b) => getDeliveryDate(b.bookingDate) >= today
  );
  const topFarmers = [...bookings]
    .sort((a, b) => b.tubes - a.tubes)
    .slice(0, 5);
  const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const thStyle = {
    background: "#1a2e1a",
    padding: "8px 10px",
    fontSize: 11,
    color: "#9ab89a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderBottom: "2px solid #4a7c59",
    textAlign: "left",
    fontFamily: "Georgia, serif",
  };
  const tdStyle = (i) => ({
    padding: "9px 10px",
    fontSize: 13,
    color: "#c8e6c9",
    borderBottom: "1px solid #2d4a2d",
    background: i % 2 === 0 ? "#1a2e1a" : "#0f1a0f",
    fontFamily: "Georgia, serif",
  });
  const tdNum = (i) => ({
    ...tdStyle(i),
    textAlign: "right",
    color: "#4ade80",
    fontWeight: "bold",
  });

  const KpiCard = ({ label, value, accent }) => (
    <div
      style={{
        background: "#1a2e1a",
        border: `1px solid ${accent}`,
        borderRadius: 12,
        padding: isMobile ? "12px 14px" : "16px 20px",
        borderLeft: `4px solid ${accent}`,
      }}
    >
      <div
        style={{
          fontSize: isMobile ? 20 : 24,
          fontWeight: "bold",
          color: "#c8e6c9",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#6a9c6a",
          marginTop: 4,
          textTransform: "uppercase",
          letterSpacing: 0.8,
        }}
      >
        {label}
      </div>
    </div>
  );

  return (
    <div style={{ paddingBottom: isMobile ? 20 : 0 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: isMobile ? 20 : 26,
              fontWeight: "bold",
              color: "#c8e6c9",
              margin: 0,
            }}
          >
            Booking Report
          </h1>
          <p style={{ color: "#6a9c6a", marginTop: 4, fontSize: 13 }}>
            Summary of all bookings and analytics
          </p>
        </div>
        <button
          onClick={onDownload}
          disabled={downloading}
          style={{
            padding: isMobile ? "12px 18px" : "12px 24px",
            borderRadius: 10,
            border: "none",
            background: downloading ? "#2d4a2d" : "#4a7c59",
            color: "white",
            fontSize: 14,
            fontWeight: "bold",
            cursor: downloading ? "not-allowed" : "pointer",
            fontFamily: "Georgia, serif",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 16px rgba(74,124,89,0.3)",
          }}
        >
          {downloading ? "⏳ Generating..." : "⬇ Download PDF Report"}
        </button>
      </div>

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <KpiCard
          label="Total Bookings"
          value={bookings.length}
          accent="#4a7c59"
        />
        <KpiCard
          label="Total Tubes"
          value={totalTubes.toLocaleString()}
          accent="#2d6a4f"
        />
        <KpiCard
          label="Total Revenue (RWF)"
          value={totalRevenue.toLocaleString()}
          accent="#1b4332"
        />
        <KpiCard
          label="Upcoming Deliveries"
          value={upcoming.length}
          accent="#3d5a3e"
        />
      </div>

      {/* Monthly breakdown */}
      <div
        style={{
          background: "#1a2e1a",
          border: "1px solid #2d4a2d",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h2 style={{ margin: "0 0 14px", fontSize: 15, color: "#c8e6c9" }}>
          Monthly Summary
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", minWidth: 400 }}
          >
            <thead>
              <tr>
                {[
                  "Month",
                  "Bookings",
                  "Tubes",
                  "Revenue (RWF)",
                  "Avg Tubes",
                ].map((h) => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(byMonth)
                .sort()
                .map((key, i) => {
                  const [yr, mo] = key.split("-");
                  const m = byMonth[key];
                  return (
                    <tr key={key}>
                      <td style={tdStyle(i)}>
                        {MONTHS[parseInt(mo) - 1]} {yr}
                      </td>
                      <td style={{ ...tdStyle(i), textAlign: "center" }}>
                        {m.count}
                      </td>
                      <td style={tdNum(i)}>{m.tubes.toLocaleString()}</td>
                      <td style={tdNum(i)}>{m.revenue.toLocaleString()}</td>
                      <td style={{ ...tdStyle(i), textAlign: "center" }}>
                        {Math.round(m.tubes / m.count)}
                      </td>
                    </tr>
                  );
                })}
              {bookings.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      ...tdStyle(0),
                      textAlign: "center",
                      color: "#4a7c59",
                      padding: "24px 0",
                    }}
                  >
                    No data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Location + Top Farmers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            background: "#1a2e1a",
            border: "1px solid #2d4a2d",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h2 style={{ margin: "0 0 14px", fontSize: 15, color: "#c8e6c9" }}>
            By Location
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Location", "Farmers", "Tubes", "% Share"].map((h) => (
                    <th key={h} style={thStyle}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(byLocation)
                  .sort((a, b) => b[1].tubes - a[1].tubes)
                  .map(([loc, v], i) => (
                    <tr key={loc}>
                      <td style={tdStyle(i)}>{loc}</td>
                      <td style={{ ...tdStyle(i), textAlign: "center" }}>
                        {v.count}
                      </td>
                      <td style={tdNum(i)}>{v.tubes.toLocaleString()}</td>
                      <td
                        style={{
                          ...tdStyle(i),
                          textAlign: "center",
                          color: "#9ab89a",
                        }}
                      >
                        {totalTubes
                          ? Math.round((v.tubes / totalTubes) * 100)
                          : 0}
                        %
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div
          style={{
            background: "#1a2e1a",
            border: "1px solid #2d4a2d",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h2 style={{ margin: "0 0 14px", fontSize: 15, color: "#c8e6c9" }}>
            Top Farmers
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Farmer", "Location", "Tubes"].map((h) => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topFarmers.map((b, i) => (
                <tr key={b.id}>
                  <td style={{ ...tdStyle(i), fontWeight: "bold" }}>
                    {b.name}
                  </td>
                  <td style={tdStyle(i)}>{b.location}</td>
                  <td style={tdNum(i)}>{b.tubes.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming deliveries */}
      {upcoming.length > 0 && (
        <div
          style={{
            background: "#1a2e1a",
            border: "1px solid #2d4a2d",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h2 style={{ margin: "0 0 14px", fontSize: 15, color: "#c8e6c9" }}>
            Upcoming Deliveries ({upcoming.length})
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 500,
              }}
            >
              <thead>
                <tr>
                  {[
                    "Farmer",
                    "Phone",
                    "Location",
                    "Tubes",
                    "Delivery Date",
                  ].map((h) => (
                    <th key={h} style={thStyle}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...upcoming]
                  .sort((a, b) => a.bookingDate.localeCompare(b.bookingDate))
                  .map((b, i) => (
                    <tr key={b.id}>
                      <td style={{ ...tdStyle(i), fontWeight: "bold" }}>
                        {b.name}
                      </td>
                      <td style={tdStyle(i)}>{b.phone}</td>
                      <td style={tdStyle(i)}>{b.location}</td>
                      <td style={tdNum(i)}>{b.tubes.toLocaleString()}</td>
                      <td style={{ ...tdStyle(i), color: "#4ade80" }}>
                        {formatDate(getDeliveryDate(b.bookingDate))}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookingApp() {
  const isMobile = useIsMobile();
  const [bookings, setBookings] = useState([]);
  const [dbSource, setDbSource] = useState(null);
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

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load bookings on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, source } = await apiGetBookings();
      setBookings(data);
      setDbSource(source);
      setLoading(false);
    })();
  }, []);

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
        const { data, source } = await apiUpdateBooking(editId, {
          ...formData,
          tubes: Number(formData.tubes),
        });
        setBookings((prev) => prev.map((b) => (b.id === editId ? data : b)));
        setDbSource(source);
        showToast("Booking updated!");
        setEditId(null);
      } else {
        const { data, source } = await apiCreateBooking({
          ...formData,
          tubes: Number(formData.tubes),
        });
        setBookings((prev) => [data, ...prev]);
        setDbSource(source);
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
      location: b.location,
    });
    setEditId(b.id);
    setView(isMobile ? "form" : "add");
  };

  const handleDelete = async (id) => {
    const { source } = await apiDeleteBooking(id);
    setBookings((prev) => prev.filter((b) => b.id !== id));
    setDbSource(source);
    setDeleteId(null);
    showToast("Booking deleted.", "error");
  };

  const totalTubes = bookings.reduce((s, b) => s + b.tubes, 0);
  const totalRevenue = totalTubes * PRICE_PER_TUBE;
  const today = new Date().toISOString().split("T")[0];
  const upcoming = bookings.filter(
    (b) => getDeliveryDate(b.bookingDate) >= today
  ).length;
  const filtered = bookings.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.location.toLowerCase().includes(search.toLowerCase()) ||
      b.phone.includes(search)
  );

  const kpis = [
    {
      label: "Total Bookings",
      value: bookings.length,
      icon: "📋",
      accent: "#4a7c59",
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
      label: "Upcoming Deliveries",
      value: upcoming,
      icon: "📦",
      accent: "#3d5a3e",
    },
  ];

  const sharedHeader = (
    <>
      {toast && <Toast {...toast} />}
      {deleteId && (
        <DeleteModal
          isMobile={isMobile}
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
    </>
  );

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
        {sharedHeader}
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>🍄</span>
              <div>
                <div
                  style={{ fontSize: 15, fontWeight: "bold", color: "#c8e6c9" }}
                >
                  Miru Mushrooms
                </div>
                <DbBadge source={dbSource} loading={loading} />
              </div>
            </div>
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
          </div>
        </div>

        <div style={{ padding: "16px 16px 0" }}>
          {mv === "dashboard" && (
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
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
                    <div style={{ fontSize: 20, marginBottom: 4 }}>
                      {k.icon}
                    </div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: "bold",
                        color: "#c8e6c9",
                      }}
                    >
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
              <div
                style={{
                  background: "#1a2e1a",
                  border: "1px solid #2d4a2d",
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: "bold",
                      color: "#c8e6c9",
                    }}
                  >
                    Recent Bookings
                  </div>
                  <button
                    onClick={() => goTo("bookings")}
                    style={{
                      fontSize: 12,
                      color: "#4a7c59",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "Georgia, serif",
                    }}
                  >
                    View All →
                  </button>
                </div>
                {loading ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "24px 0",
                      color: "#4a7c59",
                    }}
                  >
                    ⏳ Loading...
                  </div>
                ) : bookings.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "24px 0",
                      color: "#4a7c59",
                    }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🌱</div>
                    <div style={{ fontSize: 14 }}>No bookings yet</div>
                  </div>
                ) : (
                  [...bookings].slice(0, 3).map((b) => (
                    <div
                      key={b.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "10px 0",
                        borderBottom: "1px solid #2d4a2d",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: "bold",
                            color: "#c8e6c9",
                            fontSize: 14,
                          }}
                        >
                          {b.name}
                        </div>
                        <div style={{ fontSize: 11, color: "#6a9c6a" }}>
                          📍 {b.location}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            color: "#4ade80",
                            fontWeight: "bold",
                            fontSize: 14,
                          }}
                        >
                          {b.tubes.toLocaleString()} tubes
                        </div>
                        <div style={{ fontSize: 11, color: "#6a9c6a" }}>
                          📦 {formatDate(getDeliveryDate(b.bookingDate))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {mv === "bookings" && (
            <div>
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
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "#4a7c59",
                  }}
                >
                  ⏳ Loading bookings...
                </div>
              ) : filtered.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "50px 0",
                    color: "#4a7c59",
                  }}
                >
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
          {mv === "report" && (
            <ReportView
              bookings={bookings}
              downloading={downloading}
              onDownload={handleDownloadReport}
              isMobile={true}
            />
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
            zIndex: 100,
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          {[
            ["dashboard", "📊", "Dashboard"],
            ["bookings", "📋", "Bookings"],
            ["form", "➕", "Add"],
            ["report", "📄", "Report"],
          ].map(([v, icon, label]) => (
            <button
              key={v}
              onClick={() => goTo(v)}
              style={{
                flex: 1,
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
              <span
                style={{
                  fontSize: 10,
                  color: mv === v ? "#4ade80" : "#6a9c6a",
                  fontFamily: "Georgia, serif",
                }}
              >
                {label}
              </span>
              {mv === v && (
                <div
                  style={{
                    width: 20,
                    height: 2,
                    borderRadius: 1,
                    background: "#4ade80",
                  }}
                />
              )}
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
    <div
      style={{
        minHeight: "100vh",
        background: "#0f1a0f",
        fontFamily: "Georgia, serif",
        color: "#e8dcc8",
      }}
    >
      {sharedHeader}
      <header
        style={{
          background: "#1a2e1a",
          borderBottom: "1px solid #2d4a2d",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 64,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 28 }}>🍄</span>
            <div>
              <div
                style={{ fontSize: 18, fontWeight: "bold", color: "#c8e6c9" }}
              >
                Miru Mushrooms
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#6a9c6a",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                Booking Manager
              </div>
            </div>
            <DbBadge source={dbSource} loading={loading} />
          </div>
          <nav style={{ display: "flex", gap: 4 }}>
            {[
              ["dashboard", "📊 Dashboard"],
              ["bookings", "📋 Bookings"],
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
                }}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* Dashboard */}
        {dv === "dashboard" && (
          <div>
            <div style={{ marginBottom: 32 }}>
              <h1
                style={{
                  fontSize: 28,
                  fontWeight: "bold",
                  color: "#c8e6c9",
                  margin: 0,
                }}
              >
                Overview
              </h1>
              <p style={{ color: "#6a9c6a", marginTop: 4, fontSize: 14 }}>
                Live summary of all bookings
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16,
                marginBottom: 32,
              }}
            >
              {kpis.map((k) => (
                <div
                  key={k.label}
                  style={{
                    background: "#1a2e1a",
                    border: "1px solid #2d4a2d",
                    borderRadius: 12,
                    padding: 20,
                    borderLeft: `4px solid ${k.accent}`,
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{k.icon}</div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: "bold",
                      color: "#c8e6c9",
                    }}
                  >
                    {loading ? "..." : k.value}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#6a9c6a",
                      marginTop: 4,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    {k.label}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                background: "#1a2e1a",
                border: "1px solid #2d4a2d",
                borderRadius: 12,
                padding: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 16, color: "#c8e6c9" }}>
                  Recent Bookings
                </h2>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => exportToExcel(bookings)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "1px solid #4a7c59",
                      background: "transparent",
                      color: "#c8e6c9",
                      cursor: "pointer",
                      fontSize: 13,
                      fontFamily: "Georgia, serif",
                    }}
                  >
                    ⬇ Download Excel
                  </button>
                  <button
                    onClick={() => goTo("bookings")}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "none",
                      background: "#4a7c59",
                      color: "white",
                      cursor: "pointer",
                      fontSize: 13,
                      fontFamily: "Georgia, serif",
                    }}
                  >
                    View All →
                  </button>
                </div>
              </div>
              {loading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "32px 0",
                    color: "#4a7c59",
                  }}
                >
                  ⏳ Loading bookings...
                </div>
              ) : bookings.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "#4a7c59",
                  }}
                >
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
                  <div style={{ marginBottom: 16 }}>No bookings yet.</div>
                  <button
                    onClick={() => goTo("add")}
                    style={{
                      padding: "10px 24px",
                      borderRadius: 8,
                      border: "none",
                      background: "#4a7c59",
                      color: "white",
                      cursor: "pointer",
                      fontSize: 14,
                      fontFamily: "Georgia, serif",
                    }}
                  >
                    ➕ Add First Booking
                  </button>
                </div>
              ) : (
                [...bookings].slice(0, 5).map((b) => (
                  <div
                    key={b.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "14px 0",
                      borderBottom: "1px solid #2d4a2d",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "bold", color: "#c8e6c9" }}>
                        {b.name}
                      </div>
                      <div style={{ fontSize: 12, color: "#6a9c6a" }}>
                        📍 {b.location} · 📅 {formatDate(b.bookingDate)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#4ade80", fontWeight: "bold" }}>
                        {b.tubes.toLocaleString()} tubes
                      </div>
                      <div style={{ fontSize: 12, color: "#6a9c6a" }}>
                        📦 {formatDate(getDeliveryDate(b.bookingDate))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* New / Edit booking — CENTERED on desktop */}
        {dv === "add" && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-start",
              minHeight: "60vh",
              paddingTop: 16,
            }}
          >
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 24,
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: 24,
                    fontWeight: "bold",
                    color: "#c8e6c9",
                    margin: 0,
                  }}
                >
                  All Bookings
                </h1>
                <p style={{ color: "#6a9c6a", marginTop: 4, fontSize: 14 }}>
                  {bookings.length} booking{bookings.length !== 1 ? "s" : ""}{" "}
                  registered
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  placeholder="🔍 Search name, location, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid #2d4a2d",
                    background: "#1a2e1a",
                    color: "#e8dcc8",
                    fontSize: 13,
                    fontFamily: "Georgia, serif",
                    width: 240,
                    outline: "none",
                  }}
                />
                <button
                  onClick={() => exportToExcel(bookings)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 8,
                    border: "1px solid #4a7c59",
                    background: "transparent",
                    color: "#c8e6c9",
                    cursor: "pointer",
                    fontSize: 13,
                    fontFamily: "Georgia, serif",
                  }}
                >
                  ⬇ Excel
                </button>
                <button
                  onClick={() => goTo("add")}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 8,
                    border: "none",
                    background: "#4a7c59",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 13,
                    fontFamily: "Georgia, serif",
                    fontWeight: "bold",
                  }}
                >
                  ➕ Add Booking
                </button>
              </div>
            </div>
            {loading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 0",
                  color: "#4a7c59",
                }}
              >
                ⏳ Loading bookings...
              </div>
            ) : filtered.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 0",
                  color: "#4a7c59",
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
                <div style={{ fontSize: 18 }}>
                  {search
                    ? "No bookings match your search."
                    : "No bookings yet."}
                </div>
              </div>
            ) : (
              filtered.map((b) => (
                <DesktopBookingRow
                  key={b.id}
                  b={b}
                  onEdit={handleEdit}
                  onDelete={(id) => setDeleteId(id)}
                  onWhatsApp={setWaBooking}
                />
              ))
            )}
          </div>
        )}
        {dv === "report" && (
          <ReportView
            bookings={bookings}
            downloading={downloading}
            onDownload={handleDownloadReport}
            isMobile={false}
          />
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
