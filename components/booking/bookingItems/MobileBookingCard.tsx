"use client";

import { useState } from "react";
import { formatDate, getDeliveryDate, buildWhatsAppMessage, PRICE_PER_TUBE } from "@/lib/utils";
import { BookingActionsMenu } from "@/components/booking/bookingItems/BookingActionsMenu";
import type { Booking } from "@/lib/types";

export interface MobileBookingCardProps {
  b: Booking;
  onEdit: (b: Booking) => void;
  onDelete: (id: string) => void;
  onWhatsApp: (b: Booking) => void;
  onDeliver: (b: Booking) => void;
  onRefund: (b: Booking) => void;
  onPay: (b: Booking) => void;
}

function PaymentChip({ b }: { b: Booking }) {
  if (b.amountBalance <= 0)
    return <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "#1a3d1a", color: "#4ade80", border: "1px solid #2d5a2d" }}>✓ Paid</span>;
  if (b.amountPaid > 0)
    return <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "#1a1400", color: "#fbbf24", border: "1px solid #78460a" }}>⏳ Partial</span>;
  return <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "#2d1414", color: "#f87171", border: "1px solid #7f1d1d" }}>✗ Unpaid</span>;
}

export function MobileBookingCard({ b, onEdit, onDelete, onWhatsApp, onDeliver, onRefund, onPay }: MobileBookingCardProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(buildWhatsAppMessage(b)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ background: "#1a2e1a", border: "1px solid #2d4a2d", borderRadius: 14, padding: 16, marginBottom: 10 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#2d4a2d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: "bold", color: "#4ade80", flexShrink: 0 }}>
            {b.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: "bold", color: "#c8e6c9" }}>{b.name}</div>
            <div style={{ fontSize: 12, color: "#6a9c6a" }}>📞 {b.phone}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: "bold", color: "#4ade80" }}>{b.tubesNet.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: "#6a9c6a" }}>tubes</div>
          </div>
          <BookingActionsMenu copied={copied} onCopy={handleCopy} onEdit={() => onEdit(b)} onDelete={() => onDelete(b.id)} />
        </div>
      </div>

      {/* Info chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {([
          { icon: "📍", text: b.location },
          { icon: "📅", text: formatDate(b.bookingDate) },
          { icon: "📦", text: `Due: ${formatDate(getDeliveryDate(b))}`, green: true },
        ] as { icon: string; text: string; green?: boolean }[]).map((chip) => (
          <span key={chip.text} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: "#0f1a0f", color: chip.green ? "#4ade80" : "#9ab89a", border: "1px solid #1a2e1a" }}>
            {chip.icon} {chip.text}
          </span>
        ))}
        <PaymentChip b={b} />
        {b.tubesRefunded > 0 && (
          <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: "#2d1414", color: "#f87171", border: "1px solid #7f1d1d" }}>
            💸 {b.tubesRefunded.toLocaleString()} refunded
          </span>
        )}
      </div>

      {/* Payment progress */}
      {b.amountDue > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6a9c6a", marginBottom: 4 }}>
            <span>Paid: <b style={{ color: "#4ade80" }}>RWF {b.amountPaid.toLocaleString()}</b></span>
            {b.amountBalance > 0 && <span>Balance: <b style={{ color: "#fbbf24" }}>RWF {b.amountBalance.toLocaleString()}</b></span>}
          </div>
          <div style={{ background: "#2d4a2d", borderRadius: 4, height: 4 }}>
            <div style={{ background: b.amountBalance <= 0 ? "#4ade80" : "#fbbf24", height: "100%", borderRadius: 4, width: `${Math.min(100, Math.round((b.amountPaid / b.amountDue) * 100))}%` }} />
          </div>
        </div>
      )}

      {/* Delivery progress */}
      {(b.tubesDelivered || 0) > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6a9c6a", marginBottom: 4 }}>
            <span>Delivered: <b style={{ color: "#4ade80" }}>{b.tubesDelivered.toLocaleString()}</b></span>
            <span>Remaining: <b style={{ color: "#fbbf24" }}>{b.tubesPending.toLocaleString()}</b></span>
          </div>
          <div style={{ background: "#2d4a2d", borderRadius: 4, height: 4 }}>
            <div style={{ background: b.tubesPending === 0 ? "#4ade80" : "#fbbf24", height: "100%", borderRadius: 4, width: `${Math.round((b.tubesDelivered / Math.max(b.tubesNet, 1)) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* PRIMARY buttons: 2×2 grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button onClick={() => onWhatsApp(b)}
          style={{ padding: "11px 0", borderRadius: 10, border: "none", background: "#25D366", color: "white", fontSize: 12, fontWeight: "bold", cursor: "pointer", fontFamily: "Georgia, serif" }}>
          💬 WhatsApp
        </button>
        <button onClick={() => onDeliver(b)} disabled={b.tubesPending === 0}
          style={{ padding: "11px 0", borderRadius: 10, border: "none", background: b.tubesPending === 0 ? "#1a2e1a" : "#2d6a4f", color: b.tubesPending === 0 ? "#4a7c59" : "white", fontSize: 12, fontWeight: "bold", cursor: b.tubesPending === 0 ? "not-allowed" : "pointer", fontFamily: "Georgia, serif" }}>
          {b.tubesPending === 0 ? "✓ Delivered" : "🚚 Deliver"}
        </button>
        <button onClick={() => onPay(b)} disabled={b.amountBalance <= 0}
          style={{ padding: "11px 0", borderRadius: 10, border: b.amountBalance <= 0 ? "1px solid #2d4a2d" : "none", background: b.amountBalance <= 0 ? "transparent" : "#1b4332", color: b.amountBalance <= 0 ? "#4a7c59" : "#4ade80", fontSize: 12, fontWeight: "bold", cursor: b.amountBalance <= 0 ? "not-allowed" : "pointer", fontFamily: "Georgia, serif" }}>
          {b.amountBalance <= 0 ? "✓ Paid" : "💰 Pay"}
        </button>
        <button onClick={() => onRefund(b)} disabled={b.tubesNet === 0}
          style={{ padding: "11px 0", borderRadius: 10, border: "1px solid #7f1d1d", background: "transparent", color: b.tubesNet === 0 ? "#4a7c59" : "#f87171", fontSize: 12, fontWeight: "bold", cursor: b.tubesNet === 0 ? "not-allowed" : "pointer", fontFamily: "Georgia, serif" }}>
          💸 Refund
        </button>
      </div>
    </div>
  );
}
