"use client";

import { useState, useRef, useEffect } from "react";

// "⋮" button shown next to each delivery entry in DeliveredView.
// Wraps the Edit / Delete actions for that single delivery so the
// row stays compact instead of showing two buttons per entry.
export function DeliveryActionsMenu({ onEdit, onDelete, isMobile }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Delivery actions"
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          border: "1px solid #2d4a2d",
          background: open ? "#2d4a2d" : "transparent",
          color: "#9ab89a",
          fontSize: 14,
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
            minWidth: 130,
            boxShadow: "0 12px 28px rgba(0,0,0,0.5)",
          }}
        >
          <button
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            style={menuItemStyle}
          >
            ✏ Edit
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            style={{ ...menuItemStyle, color: "#f87171" }}
          >
            🗑 Delete
          </button>
        </div>
      )}
    </div>
  );
}

const menuItemStyle = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "8px 10px",
  borderRadius: 6,
  border: "none",
  background: "transparent",
  color: "#c8e6c9",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "Georgia, serif",
};
