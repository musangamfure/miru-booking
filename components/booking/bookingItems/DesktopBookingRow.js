"use client";

import { useState } from "react";
import { formatDate, getDeliveryDate, buildWhatsAppMessage, PRICE_PER_TUBE } from "@/lib/utils";

export function DesktopBookingRow({ b, onEdit, onDelete, onWhatsApp, onDeliver }) {
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
            📦 {formatDate(getDeliveryDate(b))}
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
          {/* Mini progress bar */}
          {(b.tubesDelivered || 0) > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  width: 100,
                  background: "#2d4a2d",
                  borderRadius: 3,
                  height: 5,
                }}
              >
                <div
                  style={{
                    background: b.tubesPending === 0 ? "#4ade80" : "#fbbf24",
                    height: "100%",
                    borderRadius: 3,
                    width: `${Math.round((b.tubesDelivered / b.tubes) * 100)}%`,
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: b.tubesPending === 0 ? "#4ade80" : "#fbbf24",
                }}
              >
                {b.tubesDelivered.toLocaleString()} / {b.tubes.toLocaleString()}{" "}
                delivered
              </span>
            </div>
          )}
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
              onClick={() => onDeliver(b)}
              disabled={b.tubesPending === 0}
              style={{
                padding: "7px 12px",
                borderRadius: 7,
                border: "none",
                background: b.tubesPending === 0 ? "#1a2e1a" : "#2d6a4f",
                color: b.tubesPending === 0 ? "#4a7c59" : "white",
                fontSize: 12,
                fontWeight: "bold",
                cursor: b.tubesPending === 0 ? "not-allowed" : "pointer",
                fontFamily: "Georgia, serif",
              }}
            >
              {b.tubesPending === 0 ? "✓ Done" : "🚚 Deliver"}
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
