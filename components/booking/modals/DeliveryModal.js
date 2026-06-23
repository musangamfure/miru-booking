"use client";

import { useState } from "react";

// Records a new delivery for a booking.
//
// BUGFIX: previously this modal had no protection against a double
// click — clicking "Confirm Delivery" twice quickly fired two POST
// requests before the modal had a chance to close, which (combined
// with a non-atomic backend) could deliver more tubes than were
// booked. `submitting` disables the button after the first click,
// and the backend (see /api/bookings/[id]/deliveries) now also
// enforces the limit atomically as a second, authoritative line of
// defense.
export function DeliveryModal({ booking, onConfirm, onCancel, isMobile }) {
  const remaining =
    booking.tubesPending ?? booking.tubes - (booking.tubesDelivered || 0);
  const [amount, setAmount] = useState(String(remaining));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (submitting) return; // guard: ignore extra clicks while a request is in flight
    const n = Number(amount);
    if (!amount || isNaN(n) || n < 1) {
      setError("Enter a valid number of tubes.");
      return;
    }
    if (n > remaining) {
      setError(`Only ${remaining} tubes remaining.`);
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
        {isMobile && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 12,
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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: "bold", color: "#c8e6c9" }}>
              🚚 Record Delivery
            </div>
            <div style={{ fontSize: 12, color: "#6a9c6a", marginTop: 3 }}>
              {booking.name} · {remaining.toLocaleString()} tubes remaining
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

        {/* Progress bar */}
        <div
          style={{
            background: "#0f1a0f",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "#6a9c6a",
              marginBottom: 6,
            }}
          >
            <span>
              Delivered:{" "}
              <b style={{ color: "#4ade80" }}>
                {(booking.tubesDelivered || 0).toLocaleString()}
              </b>
            </span>
            <span>
              Remaining:{" "}
              <b style={{ color: "#fbbf24" }}>{remaining.toLocaleString()}</b>
            </span>
            <span>
              Total:{" "}
              <b style={{ color: "#c8e6c9" }}>
                {booking.tubes.toLocaleString()}
              </b>
            </span>
          </div>
          <div
            style={{
              background: "#2d4a2d",
              borderRadius: 4,
              height: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "#4ade80",
                height: "100%",
                borderRadius: 4,
                width: `${Math.round(
                  ((booking.tubesDelivered || 0) / booking.tubes) * 100
                )}%`,
                transition: "width 0.3s",
              }}
            />
          </div>
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
            Tubes Being Delivered
          </label>
          <input
            type="number"
            value={amount}
            min="1"
            max={remaining}
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
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {[25, 50, 100].map((q) => (
              <button
                key={q}
                disabled={submitting}
                onClick={() => {
                  setAmount(String(Math.min(q, remaining)));
                  setError("");
                }}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  border: "1px solid #2d4a2d",
                  background: "transparent",
                  color: "#9ab89a",
                  fontSize: 12,
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontFamily: "Georgia, serif",
                }}
              >
                {q}
              </button>
            ))}
            <button
              disabled={submitting}
              onClick={() => {
                setAmount(String(remaining));
                setError("");
              }}
              style={{
                padding: "5px 12px",
                borderRadius: 20,
                border: "1px solid #4a7c59",
                background: "transparent",
                color: "#4ade80",
                fontSize: 12,
                cursor: submitting ? "not-allowed" : "pointer",
                fontFamily: "Georgia, serif",
              }}
            >
              All ({remaining})
            </button>
          </div>
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
            placeholder="e.g. First batch — Musanze route"
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
            {submitting ? "Recording..." : "Confirm Delivery"}
          </button>
        </div>
      </div>
    </div>
  );
}
