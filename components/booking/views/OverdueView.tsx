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
    .sort((a, b) => daysUntilDelivery(a) - daysUntilDelivery(b));

  const totalTubesPending = overdue.reduce((sum, b) => sum + (b.tubesPending ?? b.tubes), 0);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: "bold", color: "#c8e6c9" }}>⚠ Overdue Deliveries</div>
        <div style={{ fontSize: 13, color: "#6a9c6a", marginTop: 4 }}>
          Past their 30-day delivery window with tubes still pending.
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={{ background: "#2d1414", border: "1px solid #7f1d1d", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: "#f87171" }}>Missed Deliveries</div>
          <div style={{ fontSize: 26, fontWeight: "bold", color: "#fca5a5" }}>{overdue.length}</div>
        </div>
        <div style={{ background: "#2d1414", border: "1px solid #7f1d1d", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: "#f87171" }}>Tubes Pending</div>
          <div style={{ fontSize: 26, fontWeight: "bold", color: "#fca5a5" }}>{totalTubesPending.toLocaleString()}</div>
        </div>
      </div>

      {overdue.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, color: "#9ab89a" }}>Nothing overdue — all deliveries on track.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {overdue.map((b) => {
            const daysLate = Math.abs(daysUntilDelivery(b));
            const tubes = b.tubesPending ?? b.tubes;
            return (
              <div
                key={b.id}
                style={{
                  background: "#1a2e1a",
                  border: "1px solid #7f1d1d",
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                {/* Row 1: name + tubes badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: "bold", color: "#c8e6c9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {b.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#6a9c6a", marginTop: 2 }}>
                      📞 {b.phone}
                    </div>
                    <div style={{ fontSize: 12, color: "#6a9c6a", marginTop: 1 }}>
                      📍 {b.location}
                    </div>
                    <div style={{ fontSize: 12, color: "#9ab89a", marginTop: 1 }}>
                      Was due {formatDate(getDeliveryDate(b))}
                    </div>
                  </div>
                  {/* Tubes + days late — stacked badge, no wrapping */}
                  <div style={{ textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: "bold", color: "#fca5a5", lineHeight: 1.1 }}>
                      {tubes.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, color: "#9ab89a", marginBottom: 4 }}>tubes</div>
                    <div style={{
                      fontSize: 11,
                      fontWeight: "bold",
                      color: "white",
                      background: "#7f1d1d",
                      borderRadius: 20,
                      padding: "3px 8px",
                      whiteSpace: "nowrap",
                    }}>
                      {daysLate}d late
                    </div>
                  </div>
                </div>

                {/* Row 2: action buttons */}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button
                    onClick={() => onSendReminder(b)}
                    title="Send reminder with new date"
                    style={{ flex: "0 0 auto", padding: "9px 12px", borderRadius: 8, border: "none", background: "#25D366", color: "white", fontSize: 13, fontWeight: "bold", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                    💬
                  </button>
                  <button
                    onClick={() => onDeliver(b)}
                    style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: "#2d6a4f", color: "white", fontSize: 13, fontWeight: "bold", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                    🚚 Deliver
                  </button>
                  <button
                    onClick={() => onRefund(b)}
                    style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid #7f1d1d", background: "transparent", color: "#f87171", fontSize: 13, fontWeight: "bold", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                    💸 Refund
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
