"use client";

import { useState, useRef, useEffect, type CSSProperties } from "react";

export interface BookingActionsMenuProps {
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  copied: boolean;
}

// Wraps the secondary actions (Copy / Edit / Delete) inside a ⋮ menu
// so the card's primary row only shows: 💬 WhatsApp | 🚚 Deliver | 💸 Refund | ⋮
export function BookingActionsMenu({ onCopy, onEdit, onDelete, copied }: BookingActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="More actions"
        style={{
          padding: "7px 10px",
          borderRadius: 7,
          border: "1px solid #2d4a2d",
          background: open ? "#2d4a2d" : "transparent",
          color: "#9ab89a",
          fontSize: 16,
          lineHeight: 1,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ⋮
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            zIndex: 50,
            background: "#1a2e1a",
            border: "1px solid #2d4a2d",
            borderRadius: 10,
            padding: 6,
            minWidth: 150,
            boxShadow: "0 12px 28px rgba(0,0,0,0.5)",
          }}
        >
          <button
            onClick={() => { setOpen(false); onCopy(); }}
            style={menuItemStyle}
          >
            {copied ? "✓ Copied" : "📋 Copy Message"}
          </button>
          <button
            onClick={() => { setOpen(false); onEdit(); }}
            style={menuItemStyle}
          >
            ✏ Edit Booking
          </button>
          <div style={{ height: 1, background: "#2d4a2d", margin: "4px 0" }} />
          <button
            onClick={() => { setOpen(false); onDelete(); }}
            style={{ ...menuItemStyle, color: "#f87171" }}
          >
            🗑 Delete Booking
          </button>
        </div>
      )}
    </div>
  );
}

const menuItemStyle: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "9px 12px",
  borderRadius: 6,
  border: "none",
  background: "transparent",
  color: "#c8e6c9",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "Georgia, serif",
  whiteSpace: "nowrap",
};
