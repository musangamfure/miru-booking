"use client";

import { useState } from "react";
import { buildWhatsAppMessage, buildWaLink } from "@/lib/utils";
import type { Booking } from "@/lib/types";

export interface WhatsAppModalProps {
  booking: Booking;
  onClose: () => void;
  isMobile: boolean | null;
}

export function WhatsAppModal({ booking, onClose, isMobile }: WhatsAppModalProps) {
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
        flexDirection: "column" as const,
        paddingBottom: "env(safe-area-inset-bottom, 16px)",
      }
    : {
        background: "#1a2e1a",
        borderRadius: 16,
        maxWidth: 480,
        width: "100%",
        maxHeight: "85vh",
        display: "flex",
        flexDirection: "column" as const,
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
