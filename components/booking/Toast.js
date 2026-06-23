"use client";

export function Toast({ msg, type }) {
  const isInfo = type === "info";
  const isError = type === "error";
  const bg = isError ? "#7f1d1d" : isInfo ? "#0f1a0f" : "#1a3d1a";
  const border = isError ? "#dc2626" : isInfo ? "#2d4a2d" : "#4ade80";
  const icon = isError ? "⚠ " : isInfo ? "" : "✓ ";
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9998,
        background: bg,
        color: "#e8dcc8",
        padding: "10px 18px",
        borderRadius: 24,
        fontSize: 13,
        fontFamily: "Georgia, serif",
        border: `1px solid ${border}`,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        whiteSpace: "nowrap",
        animation: "fadeIn 0.3s ease",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {icon}
      {msg}
    </div>
  );
}
