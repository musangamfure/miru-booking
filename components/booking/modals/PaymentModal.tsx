"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import type { Booking, Payment } from "@/lib/types";

export interface PaymentModalProps {
  booking: Booking;
  existing?: Payment;
  onConfirm: (amount: number, paidAt: string, note: string, promisedPaymentDate: string) => Promise<void>;
  onCancel: () => void;
  isMobile: boolean | null;
}

export function PaymentModal({ booking, existing, onConfirm, onCancel, isMobile }: PaymentModalProps) {
  const [amount, setAmount] = useState(String(existing?.amount ?? booking.amountBalance));
  const [paidAt, setPaidAt] = useState(
    existing ? existing.paidAt.slice(0, 10) : new Date().toISOString().split("T")[0]
  );
  const [note, setNote] = useState(existing?.note ?? "");
  const [promisedDate, setPromisedDate] = useState(booking.promisedPaymentDate ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const numAmount = Number(amount);
  const newBalance = booking.amountBalance - numAmount + (existing?.amount ?? 0);
  const isFullPayment = newBalance <= 0;

  const pctPaid = booking.amountDue > 0
    ? Math.min(100, Math.round(((booking.amountPaid + numAmount - (existing?.amount ?? 0)) / booking.amountDue) * 100))
    : 0;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!amount || isNaN(numAmount) || numAmount < 1) e.amount = "Enter a valid amount.";
    if (!paidAt) e.paidAt = "Payment date is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleConfirm = async () => {
    if (submitting || !validate()) return;
    setSubmitting(true);
    try {
      await onConfirm(numAmount, paidAt, note.trim(), isFullPayment ? "" : promisedDate);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = (hasErr?: boolean): React.CSSProperties => ({
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: `1px solid ${hasErr ? "#dc2626" : "#2d4a2d"}`,
    background: "#0f1a0f", color: "#e8dcc8", fontSize: 15,
    fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box",
  });

  const fieldLabel = (text: string) => (
    <label style={{ display: "block", fontSize: 11, color: "#9ab89a", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.8 }}>
      {text}
    </label>
  );

  // ── Layout: fixed header + scrollable body + fixed footer ──────────
  // The outer panel uses flexbox column so the middle section can scroll
  // without pushing the action buttons off screen.
  const overlayStyle: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 9999,
    display: "flex",
    alignItems: isMobile ? "flex-end" : "center",
    justifyContent: "center",
  };

  const panelStyle: React.CSSProperties = isMobile
    ? {
        width: "100%",
        maxHeight: "92vh",
        background: "#1a2e1a",
        borderRadius: "20px 20px 0 0",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Georgia, serif",
      }
    : {
        background: "#1a2e1a",
        border: "1px solid #4a7c59",
        borderRadius: 14,
        maxWidth: 460,
        width: "90%",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Georgia, serif",
        boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
      };

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && !submitting && onCancel()}>
      <div style={panelStyle}>

        {/* ── Fixed header ── */}
        <div style={{ padding: isMobile ? "16px 20px 12px" : "20px 24px 14px", flexShrink: 0 }}>
          {isMobile && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "#4a7c59" }} />
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: "bold", color: "#c8e6c9" }}>
                💰 {existing ? "Edit Payment" : "Record Payment"}
              </div>
              <div style={{ fontSize: 12, color: "#6a9c6a", marginTop: 3 }}>{booking.name}</div>
            </div>
            <button onClick={onCancel} disabled={submitting}
              style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "#2d4a2d", color: "#c8e6c9", fontSize: 16, cursor: "pointer", flexShrink: 0 }}>
              ×
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "0 20px" : "0 24px" }}>

          {/* Payment summary */}
          <div style={{ background: "#0f1a0f", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6a9c6a", marginBottom: 6 }}>
              <span>Total Due</span>
              <span>Already Paid</span>
              <span>Balance</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: "bold" }}>
              <span style={{ color: "#c8e6c9" }}>RWF {booking.amountDue.toLocaleString()}</span>
              <span style={{ color: "#4ade80" }}>RWF {booking.amountPaid.toLocaleString()}</span>
              <span style={{ color: booking.amountBalance === 0 ? "#4ade80" : "#fbbf24" }}>
                RWF {booking.amountBalance.toLocaleString()}
              </span>
            </div>
            <div style={{ marginTop: 8, background: "#2d4a2d", borderRadius: 4, height: 5 }}>
              <div style={{ background: "#4ade80", height: "100%", borderRadius: 4, width: `${pctPaid}%`, transition: "width 0.3s" }} />
            </div>
            <div style={{ fontSize: 11, color: "#4a7c59", marginTop: 3 }}>{pctPaid}% paid after this payment</div>
          </div>

          {/* Amount */}
          <div style={{ marginBottom: 14 }}>
            {fieldLabel("Amount Paid (RWF)")}
            <input type="number" value={amount} min="1" disabled={submitting}
              onChange={(e) => { setAmount(e.target.value); setErrors((er) => ({ ...er, amount: "" })); }}
              style={inputStyle(!!errors.amount)}
            />
            {errors.amount && <div style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>⚠ {errors.amount}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {[50000, 100000, 200000].map((n) => (
                <button key={n} disabled={submitting} onClick={() => setAmount(String(n))}
                  style={{ padding: "4px 10px", borderRadius: 20, border: "1px solid #2d4a2d", background: "transparent", color: "#9ab89a", fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif" }}>
                  {(n / 1000).toFixed(0)}K
                </button>
              ))}
              {booking.amountBalance > 0 && (
                <button disabled={submitting} onClick={() => setAmount(String(booking.amountBalance))}
                  style={{ padding: "4px 10px", borderRadius: 20, border: "1px solid #4a7c59", background: "transparent", color: "#4ade80", fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif" }}>
                  Full ({booking.amountBalance.toLocaleString()})
                </button>
              )}
            </div>
            {!isNaN(numAmount) && numAmount > 0 && (
              <div style={{ fontSize: 12, marginTop: 6, color: newBalance <= 0 ? "#4ade80" : "#fbbf24" }}>
                {newBalance <= 0 ? "✓ This completes the full payment." : `Balance remaining: RWF ${newBalance.toLocaleString()}`}
              </div>
            )}
          </div>

          {/* Payment date */}
          <div style={{ marginBottom: 14 }}>
            {fieldLabel("Payment Date")}
            <input type="date" value={paidAt} disabled={submitting}
              onChange={(e) => { setPaidAt(e.target.value); setErrors((er) => ({ ...er, paidAt: "" })); }}
              style={inputStyle(!!errors.paidAt)}
            />
            {errors.paidAt && <div style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>⚠ {errors.paidAt}</div>}
          </div>

          {/* Note */}
          <div style={{ marginBottom: 14 }}>
            {fieldLabel("Note (optional)")}
            <input type="text" value={note} placeholder="e.g. Paid via Mobile Money" disabled={submitting}
              onChange={(e) => setNote(e.target.value)}
              style={inputStyle()}
            />
          </div>

          {/* Promise date */}
          {!isFullPayment && (
            <div style={{ marginBottom: 16, background: "#1a1400", border: "1px solid #78460a", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, color: "#fbbf24", fontWeight: "bold", marginBottom: 6 }}>
                📅 When will the balance be paid?
              </div>
              <div style={{ fontSize: 11, color: "#92651a", marginBottom: 8 }}>
                The client promises to pay the remaining RWF {Math.max(0, newBalance).toLocaleString()} by:
              </div>
              <input type="date" value={promisedDate} disabled={submitting}
                onChange={(e) => setPromisedDate(e.target.value)}
                style={{ ...inputStyle(), border: "1px solid #78460a", background: "#0f0e00" }}
              />
              {booking.promisedPaymentDate && (
                <div style={{ fontSize: 11, color: "#6a9c6a", marginTop: 6 }}>
                  Previously promised: {formatDate(booking.promisedPaymentDate)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Fixed footer (always visible) ── */}
        <div style={{
          padding: isMobile ? "14px 20px calc(14px + env(safe-area-inset-bottom,0px))" : "14px 24px 20px",
          borderTop: "1px solid #2d4a2d",
          flexShrink: 0,
          display: "flex",
          gap: 10,
          background: "#1a2e1a",
        }}>
          <button onClick={onCancel} disabled={submitting}
            style={{ flex: 1, padding: 13, borderRadius: 10, border: "1px solid #2d4a2d", background: "transparent", color: "#9ab89a", fontSize: 15, cursor: "pointer", fontFamily: "Georgia, serif" }}>
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={submitting}
            style={{ flex: 2, padding: 13, borderRadius: 10, border: "none", background: submitting ? "#2d4a2d" : "#4a7c59", color: "white", fontSize: 15, fontWeight: "bold", cursor: submitting ? "not-allowed" : "pointer", fontFamily: "Georgia, serif" }}>
            {submitting ? "Saving..." : existing ? "Save Changes" : isFullPayment ? "Record Full Payment" : "Record Partial Payment"}
          </button>
        </div>

      </div>
    </div>
  );
}
