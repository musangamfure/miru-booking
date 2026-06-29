"use client";

// Generic yes/no confirmation modal. Originally hard-coded to "Delete
// Booking?" — generalized with props so it can also confirm deleting
// a single delivery entry (see DeliveryActionsMenu).
export interface ConfirmModalProps {
  title?: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isMobile: boolean | null;
}

export function ConfirmModal({
  title = "Are you sure?",
  message = "This cannot be undone.",
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
  isMobile,
}: ConfirmModalProps) {
  const panelStyle = isMobile
    ? {
        width: "100%",
        background: "#1a2e1a",
        borderRadius: "20px 20px 0 0",
        padding: "20px 20px calc(20px + env(safe-area-inset-bottom,0px))",
      }
    : {
        background: "#1a2e1a",
        border: "1px solid #4a7c59",
        borderRadius: 12,
        padding: 32,
        maxWidth: 360,
        width: "90%",
        boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
      };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        zIndex: 9999,
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
      }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        style={{
          ...panelStyle,
          fontFamily: "Georgia, serif",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 10 }}>🗑</div>
        <div
          style={{
            fontSize: 18,
            fontWeight: "bold",
            color: "#c8e6c9",
            marginBottom: 8,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 14, color: "#6a9c6a", marginBottom: 24 }}>
          {message}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: 13,
              borderRadius: 10,
              border: "1px solid #4a7c59",
              background: "transparent",
              color: "#c8e6c9",
              fontSize: 15,
              cursor: "pointer",
              fontFamily: "Georgia, serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: 13,
              borderRadius: 10,
              border: "none",
              background: "#dc2626",
              color: "white",
              fontSize: 15,
              fontWeight: "bold",
              cursor: "pointer",
              fontFamily: "Georgia, serif",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
