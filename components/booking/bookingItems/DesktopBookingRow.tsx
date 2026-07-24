"use client";

import { useState } from "react";
import { formatDate, getDeliveryDate, buildWhatsAppMessage } from "@/lib/utils";
import { BookingActionsMenu } from "@/components/booking/bookingItems/BookingActionsMenu";
import type { Booking } from "@/lib/types";

export interface DesktopBookingRowProps {
  b: Booking;
  onEdit: (b: Booking) => void;
  onDelete: (id: string) => void;
  onWhatsApp: (b: Booking) => void;
  onDeliver: (b: Booking) => void;
  onRefund: (b: Booking) => void;
  onPay: (b: Booking) => void;
}

function PaymentBadge({ b }: { b: Booking }) {
  if (b.amountBalance <= 0)
    return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "#1a3d1a", color: "#4ade80", border: "1px solid #2d5a2d", whiteSpace: "nowrap" }}>✓ Paid</span>;
  if (b.amountPaid > 0)
    return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "#1a1400", color: "#fbbf24", border: "1px solid #78460a", whiteSpace: "nowrap" }}>⏳ Partial</span>;
  return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "#2d1414", color: "#f87171", border: "1px solid #7f1d1d", whiteSpace: "nowrap" }}>✗ Unpaid</span>;
}

export function DesktopBookingRow({ b, onEdit, onDelete, onWhatsApp, onDeliver, onRefund, onPay }: DesktopBookingRowProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(buildWhatsAppMessage(b)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const pctPaid = b.amountDue > 0 ? Math.round((b.amountPaid / b.amountDue) * 100) : 0;

  return (
    <div
      style={{ background: "#1a2e1a", border: "1px solid #2d4a2d", borderRadius: 12, padding: 18, marginBottom: 10, transition: "border-color 0.2s" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#4a7c59")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2d4a2d")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>

        {/* Name + phone */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 180 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#2d4a2d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: "bold", color: "#4ade80", flexShrink: 0 }}>
            {b.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: "bold", color: "#c8e6c9", fontSize: 14 }}>{b.name}</div>
            <div style={{ fontSize: 11, color: "#6a9c6a" }}>📞 {b.phone} · 📍 {b.location}</div>
          </div>
        </div>

        {/* Dates */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", fontSize: 12 }}>
          <span style={{ color: "#9ab89a" }}>📅 {formatDate(b.bookingDate)}</span>
          <span style={{ color: "#4ade80" }}>📦 {formatDate(getDeliveryDate(b))}</span>
        </div>

        {/* Tubes + payment + actions */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>

          {/* Tubes row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 16, fontWeight: "bold", color: "#4ade80" }}>
                {b.tubesNet.toLocaleString()} tubes
                {b.tubesRefunded > 0 && <span style={{ fontSize: 10, color: "#f87171", marginLeft: 6 }}>({b.tubesRefunded.toLocaleString()} refunded)</span>}
              </div>
            </div>
            <PaymentBadge b={b} />
          </div>

          {/* Payment progress mini */}
          <div style={{ width: "100%", minWidth: 200 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6a9c6a", marginBottom: 3 }}>
              <span>RWF {b.amountPaid.toLocaleString()} paid</span>
              {b.amountBalance > 0 && <span style={{ color: "#fbbf24" }}>RWF {b.amountBalance.toLocaleString()} balance</span>}
            </div>
            <div style={{ background: "#2d4a2d", borderRadius: 3, height: 4 }}>
              <div style={{ background: pctPaid === 100 ? "#4ade80" : "#fbbf24", height: "100%", borderRadius: 3, width: `${pctPaid}%` }} />
            </div>
          </div>

          {/* Delivery progress mini */}
          {(b.tubesDelivered || 0) > 0 && (
            <div style={{ width: "100%", minWidth: 200 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6a9c6a", marginBottom: 3 }}>
                <span>{b.tubesDelivered.toLocaleString()} / {b.tubesNet.toLocaleString()} delivered</span>
                {b.tubesPending > 0 && <span style={{ color: "#fbbf24" }}>{b.tubesPending.toLocaleString()} pending</span>}
              </div>
              <div style={{ background: "#2d4a2d", borderRadius: 3, height: 4 }}>
                <div style={{ background: b.tubesPending === 0 ? "#4ade80" : "#fbbf24", height: "100%", borderRadius: 3, width: `${Math.round((b.tubesDelivered / Math.max(b.tubesNet, 1)) * 100)}%` }} />
              </div>
            </div>
          )}

          {/* Action buttons: WhatsApp | Deliver | Pay | Refund | ⋮ */}
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => onWhatsApp(b)}
              style={{ padding: "6px 10px", borderRadius: 7, border: "none", background: "#25D366", color: "white", fontSize: 11, fontWeight: "bold", cursor: "pointer", fontFamily: "Georgia, serif", whiteSpace: "nowrap" }}>
              💬 WhatsApp
            </button>
            <button onClick={() => onDeliver(b)} disabled={b.tubesPending === 0}
              style={{ padding: "6px 10px", borderRadius: 7, border: "none", background: b.tubesPending === 0 ? "#1a2e1a" : "#2d6a4f", color: b.tubesPending === 0 ? "#4a7c59" : "white", fontSize: 11, fontWeight: "bold", cursor: b.tubesPending === 0 ? "not-allowed" : "pointer", fontFamily: "Georgia, serif", whiteSpace: "nowrap" }}>
              {b.tubesPending === 0 ? "✓ Done" : "🚚 Deliver"}
            </button>
            <button onClick={() => onPay(b)} disabled={b.amountBalance <= 0}
              style={{ padding: "6px 10px", borderRadius: 7, border: b.amountBalance <= 0 ? "1px solid #2d4a2d" : "none", background: b.amountBalance <= 0 ? "transparent" : "#1b4332", color: b.amountBalance <= 0 ? "#4a7c59" : "#4ade80", fontSize: 11, fontWeight: "bold", cursor: b.amountBalance <= 0 ? "not-allowed" : "pointer", fontFamily: "Georgia, serif", whiteSpace: "nowrap" }}>
              {b.amountBalance <= 0 ? "✓ Paid" : "💰 Pay"}
            </button>
            <button onClick={() => onRefund(b)} disabled={b.tubesNet === 0}
              style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #7f1d1d", background: "transparent", color: b.tubesNet === 0 ? "#4a7c59" : "#f87171", fontSize: 11, fontWeight: "bold", cursor: b.tubesNet === 0 ? "not-allowed" : "pointer", fontFamily: "Georgia, serif", whiteSpace: "nowrap" }}>
              💸 Refund
            </button>
            <BookingActionsMenu copied={copied} onCopy={handleCopy} onEdit={() => onEdit(b)} onDelete={() => onDelete(b.id)} />
          </div>
        </div>
      </div>
    </div>
  );
}
