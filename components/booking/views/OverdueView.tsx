"use client";

import { formatDate, getDeliveryDate, daysUntilDelivery, isOverdue } from "@/lib/utils";
import type { Booking } from "@/lib/types";

export interface OverdueViewProps {
  bookings: Booking[];
  isMobile: boolean | null;
  onDeliver: (b: Booking) => void;
  onSendReminder: (b: Booking) => void;
  onRefund: (b: Booking) => void;
}

export function OverdueView({ bookings, isMobile, onDeliver, onSendReminder, onRefund }: OverdueViewProps) {
  const overdue = bookings
    .filter(isOverdue)
    .sort((a, b) => daysUntilDelivery(a) - daysUntilDelivery(b)); // most overdue first

  const totalTubesPending = overdue.reduce(
    (sum, b) => sum + (b.tubesPending ?? b.tubes),
    0
  );

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: "bold", color: "#c8e6c9" }}>
          ⚠ Overdue Deliveries
        </div>
        <div style={{ fontSize: 13, color: "#6a9c6a", marginTop: 4 }}>
          Bookings past their 30-day delivery window (from inoculation) that
          still have tubes pending.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(2, 1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            background: "#2d1414",
            border: "1px solid #7f1d1d",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 12, color: "#f87171" }}>
            Missed Deliveries
          </div>
          <div style={{ fontSize: 26, fontWeight: "bold", color: "#fca5a5" }}>
            {overdue.length}
          </div>
        </div>
        <div
          style={{
            background: "#2d1414",
            border: "1px solid #7f1d1d",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 12, color: "#f87171" }}>
            Total Tubes Pending
          </div>
          <div style={{ fontSize: 26, fontWeight: "bold", color: "#fca5a5" }}>
            {totalTubesPending.toLocaleString()}
          </div>
        </div>
      </div>

      {overdue.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, color: "#9ab89a" }}>
            Nothing overdue — every delivery window is on track.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {overdue.map((b) => {
            const daysLate = Math.abs(daysUntilDelivery(b));
            return (
              <div
                key={b.id}
                style={{
                  background: "#1a2e1a",
                  border: "1px solid #7f1d1d",
                  borderRadius: 14,
                  padding: isMobile ? 14 : 18,
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 180 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: "bold",
                      color: "#c8e6c9",
                    }}
                  >
                    {b.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#6a9c6a", marginTop: 2 }}>
                    📞 {b.phone} · 📍 {b.location}
                  </div>
                  <div style={{ fontSize: 12, color: "#9ab89a", marginTop: 2 }}>
                    Was due {formatDate(getDeliveryDate(b))}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: "bold",
                        color: "#fca5a5",
                      }}
                    >
                      {(b.tubesPending ?? b.tubes).toLocaleString()} tubes
                    </div>
                    <div style={{ fontSize: 11, color: "#f87171" }}>
                      {daysLate} day{daysLate !== 1 ? "s" : ""} late
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => onSendReminder(b)}
                      title="Send reminder with a new delivery date"
                      style={{
                        padding: "8px 12px",
                        borderRadius: 7,
                        border: "none",
                        background: "#25D366",
                        color: "white",
                        fontSize: 12,
                        fontWeight: "bold",
                        cursor: "pointer",
                        fontFamily: "Georgia, serif",
                        whiteSpace: "nowrap",
                      }}
                    >
                      💬
                    </button>
                    <button
                      onClick={() => onDeliver(b)}
                      style={{ padding: "8px 12px", borderRadius: 7, border: "none", background: "#2d6a4f", color: "white", fontSize: 12, fontWeight: "bold", cursor: "pointer", fontFamily: "Georgia, serif", whiteSpace: "nowrap" }}
                    >
                      🚚 Deliver
                    </button>
                    <button
                      onClick={() => onRefund(b)}
                      style={{ padding: "8px 12px", borderRadius: 7, border: "1px solid #7f1d1d", background: "transparent", color: "#f87171", fontSize: 12, fontWeight: "bold", cursor: "pointer", fontFamily: "Georgia, serif", whiteSpace: "nowrap" }}
                    >
                      💸 Refund
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
