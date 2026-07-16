"use client";

import { useState } from "react";
import { PRICE_PER_TUBE } from "@/lib/utils";
import type { Booking, Refund } from "@/lib/types";

export interface RefundModalProps {
  booking: Booking;
  /** If provided, we're editing an existing refund instead of creating one. */
  existing?: Refund;
  onConfirm: (tubesRefunded: number, amountRefunded: number, reason: string) => Promise<void>;
  onCancel: () => void;
  isMobile: boolean | null;
}

export function RefundModal({ booking, existing, onConfirm, onCancel, isMobile }: RefundModalProps) {
  // Max refundable = tubes not yet refunded (or, for an edit, the existing amount + remaining)
  const alreadyRefunded = booking.tubesRefunded - (existing?.tubesRefunded ?? 0);
  const maxTubes = booking.tubes - alreadyRefunded;

  const [tubes, setTubes] = useState(String(existing?.tubesRefunded ?? ""));
  const [amount, setAmount] = useState(String(existing?.amountRefunded ?? ""));
  const [reason, setReason] = useState(existing?.reason ?? "");
  const [autoCalc, setAutoCalc] = useState(!existing); // auto-calc price for new refunds
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleTubesChange = (v: string) => {
    setTubes(v);
    if (autoCalc && v && !isNaN(Number(v))) {
      setAmount(String(Number(v) * PRICE_PER_TUBE));
    }
    setErrors((e) => ({ ...e, tubes: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const t = Number(tubes);
    const a = Number(amount);
    if (!tubes || isNaN(t) || t < 0) e.tubes = "Enter 0 or more tubes.";
    else if (t > maxTubes) e.tubes = `Max ${maxTubes} tubes can be refunded.`;
    if (!amount || isNaN(a) || a < 0) e.amount = "Enter the refund amount.";
    if (!reason.trim()) e.reason = "A reason is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleConfirm = async () => {
    if (submitting || !validate()) return;
    setSubmitting(true);
    try {
      await onConfirm(Number(tubes), Number(amount), reason.trim());
    } finally {
      setSubmitting(false);
    }
  };

  const panelStyle = isMobile
    ? { width: "100%", background: "#1a2e1a", borderRadius: "20px 20px 0 0", padding: "20px 20px calc(20px + env(safe-area-inset-bottom,0px))" }
    : { background: "#1a2e1a", border: "1px solid #4a7c59", borderRadius: 14, padding: 28, maxWidth: 440, width: "90%", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" };

  const label = (text: string) => (
    <label style={{ display: "block", fontSize: 11, color: "#9ab89a", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.8 }}>
      {text}
    </label>
  );
  const inputStyle = (hasErr: boolean) => ({
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: `1px solid ${hasErr ? "#dc2626" : "#2d4a2d"}`,
    background: "#0f1a0f", color: "#e8dcc8", fontSize: 15,
    fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box" as const,
  });

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 9999, display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && !submitting && onCancel()}
    >
      <div style={{ ...panelStyle, fontFamily: "Georgia, serif" }}>
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "#4a7c59" }} />
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: "bold", color: "#c8e6c9" }}>
              💸 {existing ? "Edit Refund" : "Process Refund"}
            </div>
            <div style={{ fontSize: 12, color: "#6a9c6a", marginTop: 3 }}>
              {booking.name} · {booking.tubes.toLocaleString()} tubes booked
            </div>
          </div>
          <button onClick={onCancel} disabled={submitting} style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "#2d4a2d", color: "#c8e6c9", fontSize: 16, cursor: "pointer" }}>×</button>
        </div>

        {/* Summary bar */}
        <div style={{ background: "#0f1a0f", borderRadius: 10, padding: "10px 14px", marginBottom: 18, display: "flex", gap: 20, fontSize: 12 }}>
          <div>
            <span style={{ color: "#6a9c6a" }}>Tubes booked: </span>
            <b style={{ color: "#c8e6c9" }}>{booking.tubes.toLocaleString()}</b>
          </div>
          {booking.tubesRefunded > 0 && (
            <div>
              <span style={{ color: "#6a9c6a" }}>Already refunded: </span>
              <b style={{ color: "#f87171" }}>{alreadyRefunded.toLocaleString()}</b>
            </div>
          )}
          <div>
            <span style={{ color: "#6a9c6a" }}>Max refundable: </span>
            <b style={{ color: "#fbbf24" }}>{maxTubes.toLocaleString()}</b>
          </div>
        </div>

        {/* Tubes */}
        <div style={{ marginBottom: 14 }}>
          {label("Tubes to Refund")}
          <input type="number" value={tubes} min="0" max={maxTubes} disabled={submitting}
            onChange={(e) => handleTubesChange(e.target.value)}
            style={inputStyle(!!errors.tubes)}
          />
          {errors.tubes && <div style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>⚠ {errors.tubes}</div>}
          {/* Quick presets */}
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {[50, 100, 200].filter(n => n <= maxTubes).map(n => (
              <button key={n} disabled={submitting} onClick={() => handleTubesChange(String(n))}
                style={{ padding: "4px 10px", borderRadius: 20, border: "1px solid #2d4a2d", background: "transparent", color: "#9ab89a", fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif" }}>
                {n}
              </button>
            ))}
            {maxTubes > 0 && (
              <button disabled={submitting} onClick={() => handleTubesChange(String(maxTubes))}
                style={{ padding: "4px 10px", borderRadius: 20, border: "1px solid #4a7c59", background: "transparent", color: "#4ade80", fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif" }}>
                All ({maxTubes})
              </button>
            )}
          </div>
        </div>

        {/* Amount */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            {label("Refund Amount (RWF)")}
            <label style={{ fontSize: 11, color: "#6a9c6a", display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
              <input type="checkbox" checked={autoCalc} onChange={(e) => setAutoCalc(e.target.checked)} style={{ cursor: "pointer" }} />
              Auto-calculate
            </label>
          </div>
          <input type="number" value={amount} min="0" disabled={submitting || autoCalc}
            onChange={(e) => { setAmount(e.target.value); setErrors((er) => ({ ...er, amount: "" })); }}
            style={{ ...inputStyle(!!errors.amount), opacity: autoCalc ? 0.6 : 1 }}
          />
          {autoCalc && tubes && !isNaN(Number(tubes)) && (
            <div style={{ fontSize: 11, color: "#4a7c59", marginTop: 4 }}>
              = {Number(tubes)} × {PRICE_PER_TUBE.toLocaleString()} = RWF {(Number(tubes) * PRICE_PER_TUBE).toLocaleString()}
            </div>
          )}
          {errors.amount && <div style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>⚠ {errors.amount}</div>}
        </div>

        {/* Reason */}
        <div style={{ marginBottom: 20 }}>
          {label("Reason for Refund")}
          <input type="text" value={reason} placeholder="e.g. No space for mushroom house, Changed mind, ..."
            disabled={submitting}
            onChange={(e) => { setReason(e.target.value); setErrors((er) => ({ ...er, reason: "" })); }}
            style={inputStyle(!!errors.reason)}
          />
          {errors.reason && <div style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>⚠ {errors.reason}</div>}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} disabled={submitting}
            style={{ flex: 1, padding: 13, borderRadius: 10, border: "1px solid #2d4a2d", background: "transparent", color: "#9ab89a", fontSize: 15, cursor: "pointer", fontFamily: "Georgia, serif" }}>
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={submitting}
            style={{ flex: 2, padding: 13, borderRadius: 10, border: "none", background: submitting ? "#2d4a2d" : "#dc2626", color: "white", fontSize: 15, fontWeight: "bold", cursor: submitting ? "not-allowed" : "pointer", fontFamily: "Georgia, serif" }}>
            {submitting ? "Processing..." : existing ? "Save Changes" : "Process Refund"}
          </button>
        </div>
      </div>
    </div>
  );
}
