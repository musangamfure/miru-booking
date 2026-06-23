"use client";

import { formatDate, getDeliveryDate, PRICE_PER_TUBE } from "@/lib/utils";

export function MobileBookingCard({ b, onEdit, onDelete, onWhatsApp, onDeliver }) {
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
            text: `Delivery: ${formatDate(getDeliveryDate(b))}`,
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
      {/* Delivery progress */}
      {(b.tubesDelivered || 0) > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "#6a9c6a",
              marginBottom: 4,
            }}
          >
            <span>
              Delivered:{" "}
              <b style={{ color: "#4ade80" }}>
                {b.tubesDelivered.toLocaleString()}
              </b>
            </span>
            <span>
              Remaining:{" "}
              <b style={{ color: "#fbbf24" }}>
                {b.tubesPending.toLocaleString()}
              </b>
            </span>
          </div>
          <div style={{ background: "#2d4a2d", borderRadius: 4, height: 5 }}>
            <div
              style={{
                background: b.tubesPending === 0 ? "#4ade80" : "#fbbf24",
                height: "100%",
                borderRadius: 4,
                width: `${Math.round((b.tubesDelivered / b.tubes) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <button
          onClick={() => onWhatsApp(b)}
          style={{
            padding: "11px 0",
            borderRadius: 10,
            border: "none",
            background: "#25D366",
            color: "white",
            fontSize: 13,
            fontWeight: "bold",
            cursor: "pointer",
            fontFamily: "Georgia, serif",
          }}
        >
          💬 WhatsApp
        </button>
        <button
          onClick={() => onDeliver(b)}
          disabled={b.tubesPending === 0}
          style={{
            padding: "11px 0",
            borderRadius: 10,
            border: "none",
            background: b.tubesPending === 0 ? "#1a2e1a" : "#2d6a4f",
            color: b.tubesPending === 0 ? "#4a7c59" : "white",
            fontSize: 13,
            fontWeight: "bold",
            cursor: b.tubesPending === 0 ? "not-allowed" : "pointer",
            fontFamily: "Georgia, serif",
          }}
        >
          {b.tubesPending === 0 ? "✓ Delivered" : "🚚 Deliver"}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
        <button
          onClick={() => onEdit(b)}
          style={{
            padding: "9px 0",
            borderRadius: 10,
            border: "1px solid #2d4a2d",
            background: "transparent",
            color: "#9ab89a",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "Georgia, serif",
          }}
        >
          ✏ Edit
        </button>
        <button
          onClick={() => onDelete(b.id)}
          style={{
            padding: "9px 14px",
            borderRadius: 10,
            border: "1px solid #7f1d1d",
            background: "transparent",
            color: "#f87171",
            fontSize: 13,
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
