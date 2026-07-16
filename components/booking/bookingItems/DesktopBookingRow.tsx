"use client";

import { useState } from "react";
import { formatDate, getDeliveryDate, buildWhatsAppMessage, PRICE_PER_TUBE } from "@/lib/utils";
import { BookingActionsMenu } from "@/components/booking/bookingItems/BookingActionsMenu";
import type { Booking } from "@/lib/types";

export interface DesktopBookingRowProps {
  b: Booking;
  onEdit: (b: Booking) => void;
  onDelete: (id: string) => void;
  onWhatsApp: (b: Booking) => void;
  onDeliver: (b: Booking) => void;
  onRefund: (b: Booking) => void;
}

export function DesktopBookingRow({ b, onEdit, onDelete, onWhatsApp, onDeliver, onRefund }: DesktopBookingRowProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(buildWhatsAppMessage(b)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const netRevenue = b.tubesNet * PRICE_PER_TUBE;

  return (
    <div
      style={{ background: "#1a2e1a", border: "1px solid #2d4a2d", borderRadius: 12, padding: 20, marginBottom: 10, transition: "border-color 0.2s" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#4a7c59")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2d4a2d")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        {/* Name + phone */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 200 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#2d4a2d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: "bold", color: "#4ade80", flexShrink: 0 }}>
            {b.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: "bold", color: "#c8e6c9", fontSize: 16 }}>{b.name}</div>
            <div style={{ fontSize: 12, color: "#6a9c6a" }}>📞 {b.phone}</div>
          </div>
        </div>

        {/* Location + dates */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#9ab89a" }}>📍 {b.location}</span>
          <span style={{ fontSize: 13, color: "#9ab89a" }}>📅 {formatDate(b.bookingDate)}</span>
          <span style={{ fontSize: 13, color: "#4ade80" }}>📦 {formatDate(getDeliveryDate(b))}</span>
        </div>

        {/* Tubes + revenue + actions */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: "bold", color: "#4ade80" }}>
              {b.tubesNet.toLocaleString()} tubes
              {b.tubesRefunded > 0 && (
                <span style={{ fontSize: 11, color: "#f87171", fontWeight: "normal", marginLeft: 6 }}>
                  ({b.tubesRefunded.toLocaleString()} refunded)
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#9ab89a" }}>
              RWF {netRevenue.toLocaleString()}
              {b.amountRefunded > 0 && (
                <span style={{ color: "#f87171", marginLeft: 6 }}>
                  (−{b.amountRefunded.toLocaleString()} refunded)
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {(b.tubesDelivered || 0) > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 100, background: "#2d4a2d", borderRadius: 3, height: 5 }}>
                <div style={{ background: b.tubesPending === 0 ? "#4ade80" : "#fbbf24", height: "100%", borderRadius: 3, width: `${Math.round((b.tubesDelivered / Math.max(b.tubesNet, 1)) * 100)}%` }} />
              </div>
              <span style={{ fontSize: 11, color: b.tubesPending === 0 ? "#4ade80" : "#fbbf24" }}>
                {b.tubesDelivered.toLocaleString()} / {b.tubesNet.toLocaleString()} delivered
              </span>
            </div>
          )}

          {/* PRIMARY: WhatsApp | Deliver | Refund | ⋮ */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onWhatsApp(b)}
              style={{ padding: "7px 12px", borderRadius: 7, border: "none", background: "#25D366", color: "white", fontSize: 12, fontWeight: "bold", cursor: "pointer", fontFamily: "Georgia, serif" }}>
              💬 WhatsApp
            </button>
            <button onClick={() => onDeliver(b)} disabled={b.tubesPending === 0}
              style={{ padding: "7px 12px", borderRadius: 7, border: "none", background: b.tubesPending === 0 ? "#1a2e1a" : "#2d6a4f", color: b.tubesPending === 0 ? "#4a7c59" : "white", fontSize: 12, fontWeight: "bold", cursor: b.tubesPending === 0 ? "not-allowed" : "pointer", fontFamily: "Georgia, serif" }}>
              {b.tubesPending === 0 ? "✓ Done" : "🚚 Deliver"}
            </button>
            <button onClick={() => onRefund(b)} disabled={b.tubesNet === 0}
              style={{ padding: "7px 12px", borderRadius: 7, border: "1px solid #7f1d1d", background: "transparent", color: b.tubesNet === 0 ? "#4a7c59" : "#f87171", fontSize: 12, fontWeight: "bold", cursor: b.tubesNet === 0 ? "not-allowed" : "pointer", fontFamily: "Georgia, serif" }}>
              💸 Refund
            </button>
            <BookingActionsMenu copied={copied} onCopy={handleCopy} onEdit={() => onEdit(b)} onDelete={() => onDelete(b.id)} />
          </div>
        </div>
      </div>
    </div>
  );
}
