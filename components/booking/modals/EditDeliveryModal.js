"use client";

import { useState } from "react";

// Edits a single, already-recorded delivery (tubes amount + note).
// Used from the "⋮" actions menu on each delivery line in DeliveredView.
export function EditDeliveryModal({ booking, delivery, onConfirm, onCancel, isMobile }) {
  const otherDeliveries = (booking.deliveries || []).filter((d) => d.id !== delivery.id);
  const othersTotal = otherDeliveries.reduce((s, d) => s + d.tubesDelivered, 0);
  const maxAllowed = booking.tubes - othersTotal;

  const [amount, setAmount] = useState(String(delivery.tubesDelivered));
  const [note, setNote] = useState(delivery.note || "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (submitting) return;
    const n = Number(amount);
    if (!amount || isNaN(n) || n < 1) {
      setError("Enter a valid number of tubes.");
      return;
    }
    if (n > maxAllowed) {
      setError(`Max ${maxAllowed} tubes (booking total minus other deliveries).`);
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(n, note);
    } finally {
      setSubmitting(false);
    }
  };

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
        borderRadius: 14,
        padding: 28,
        maxWidth: 420,
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
      onClick={(e) => e.target === e.currentTarget && !submitting && onCancel()}
    >
      <div style={{ ...panelStyle, fontFamily: "Georgia, serif" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: "bold", color: "#c8e6c9" }}>
              ✏ Edit Delivery
            </div>
            <div style={{ fontSize: 12, color: "#6a9c6a", marginTop: 3 }}>
              {booking.name} · max {maxAllowed.toLocaleString()} tubes
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={submitting}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: "none",
              background: "#2d4a2d",
              color: "#c8e6c9",
              fontSize: 16,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              color: "#9ab89a",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            Tubes Delivered
          </label>
          <input
            type="number"
            value={amount}
            min="1"
            max={maxAllowed}
            disabled={submitting}
            onChange={(e) => {
              setAmount(e.target.value);
              setError("");
            }}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: `1px solid ${error ? "#dc2626" : "#2d4a2d"}`,
              background: "#0f1a0f",
              color: "#e8dcc8",
              fontSize: 16,
              fontFamily: "Georgia, serif",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {error && (
            <div style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>
              ⚠ {error}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 18 }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              color: "#9ab89a",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            Note (optional)
          </label>
          <input
            type="text"
            value={note}
            disabled={submitting}
            onChange={(e) => setNote(e.target.value)}
            style={{
              width: "100%",
              padding: "11px 14px",
              borderRadius: 10,
              border: "1px solid #2d4a2d",
              background: "#0f1a0f",
              color: "#e8dcc8",
              fontSize: 14,
              fontFamily: "Georgia, serif",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={submitting}
            style={{
              flex: 1,
              padding: 13,
              borderRadius: 10,
              border: "1px solid #2d4a2d",
              background: "transparent",
              color: "#9ab89a",
              fontSize: 15,
              cursor: submitting ? "not-allowed" : "pointer",
              fontFamily: "Georgia, serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            style={{
              flex: 2,
              padding: 13,
              borderRadius: 10,
              border: "none",
              background: submitting ? "#2d4a2d" : "#4a7c59",
              color: "white",
              fontSize: 15,
              fontWeight: "bold",
              cursor: submitting ? "not-allowed" : "pointer",
              fontFamily: "Georgia, serif",
            }}
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
