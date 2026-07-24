"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { DeliveryActionsMenu } from "@/components/booking/delivery/DeliveryActionsMenu";
import type { Booking, Payment } from "@/lib/types";

export interface PaymentsViewProps {
  bookings: Booking[];
  isMobile: boolean | null;
  onNewPayment: (b: Booking) => void;
  onEditPayment: (b: Booking, p: Payment) => void;
  onDeletePayment: (b: Booking, p: Payment) => void;
}

type Filter = "all" | "partial" | "paid" | "unpaid";

function PaymentStatusBadge({ b }: { b: Booking }) {
  if (b.amountBalance <= 0) {
    return (
      <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "#1a3d1a", color: "#4ade80", border: "1px solid #2d5a2d" }}>
        ✓ Paid in Full
      </span>
    );
  }
  if (b.amountPaid > 0) {
    return (
      <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "#1a1400", color: "#fbbf24", border: "1px solid #78460a" }}>
        ⏳ Partial
      </span>
    );
  }
  return (
    <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "#2d1414", color: "#f87171", border: "1px solid #7f1d1d" }}>
      ✗ Unpaid
    </span>
  );
}

export function PaymentsView({
  bookings,
  isMobile,
  onNewPayment,
  onEditPayment,
  onDeletePayment,
}: PaymentsViewProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  // Only show bookings that have a non-zero amountDue (i.e., tubes were actually booked)
  const bookingsWithDue = bookings.filter((b) => b.amountDue > 0);

  const filtered = bookingsWithDue.filter((b) => {
    const matchSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.location.toLowerCase().includes(search.toLowerCase()) ||
      b.phone.includes(search);
    const matchFilter =
      filter === "all" ||
      (filter === "paid" && b.amountBalance <= 0) ||
      (filter === "partial" && b.amountPaid > 0 && b.amountBalance > 0) ||
      (filter === "unpaid" && b.amountPaid === 0);
    return matchSearch && matchFilter;
  });

  const totalDue = bookingsWithDue.reduce((s, b) => s + b.amountDue, 0);
  const totalPaid = bookingsWithDue.reduce((s, b) => s + b.amountPaid, 0);
  const totalBalance = bookingsWithDue.reduce((s, b) => s + Math.max(0, b.amountBalance), 0);
  const countPartial = bookingsWithDue.filter((b) => b.amountPaid > 0 && b.amountBalance > 0).length;
  const countUnpaid = bookingsWithDue.filter((b) => b.amountPaid === 0).length;

  // Bookings with an overdue promise date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filterBtns: [Filter, string][] = [
    ["all", "All"],
    ["partial", `Partial (${countPartial})`],
    ["unpaid", `Unpaid (${countUnpaid})`],
    ["paid", "Paid"],
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: "bold", color: "#c8e6c9" }}>Payments</div>
        <div style={{ fontSize: 13, color: "#6a9c6a", marginTop: 4 }}>
          Track full and partial payments per farmer.
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Due (RWF)", value: totalDue.toLocaleString(), color: "#c8e6c9", accent: "#4a7c59" },
          { label: "Total Collected (RWF)", value: totalPaid.toLocaleString(), color: "#4ade80", accent: "#2d6a4f" },
          { label: "Outstanding (RWF)", value: totalBalance.toLocaleString(), color: totalBalance > 0 ? "#fbbf24" : "#4ade80", accent: totalBalance > 0 ? "#92400e" : "#1b4332" },
        ].map((k) => (
          <div key={k.label} style={{ background: "#1a2e1a", border: "1px solid #2d4a2d", borderRadius: 12, padding: isMobile ? "12px 14px" : "16px 20px", borderLeft: `4px solid ${k.accent}` }}>
            <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: "bold", color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#6a9c6a", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.8 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="🔍 Search name, location, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 180, padding: "10px 14px", borderRadius: 10, border: "1px solid #2d4a2d", background: "#1a2e1a", color: "#e8dcc8", fontSize: 13, fontFamily: "Georgia, serif", outline: "none" }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          {filterBtns.map(([f, label]) => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "8px 12px", borderRadius: 20, border: `1px solid ${filter === f ? "#4a7c59" : "#2d4a2d"}`, background: filter === f ? "#1a3d1a" : "transparent", color: filter === f ? "#4ade80" : "#6a9c6a", fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif", whiteSpace: "nowrap" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💰</div>
          <div style={{ fontSize: 16, color: "#9ab89a" }}>No bookings match your filter.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((b) => {
            const pct = b.amountDue > 0 ? Math.round((b.amountPaid / b.amountDue) * 100) : 0;
            const promisePassed =
              b.promisedPaymentDate &&
              b.amountBalance > 0 &&
              new Date(b.promisedPaymentDate) < today;

            return (
              <div key={b.id} style={{
                background: "#1a2e1a",
                border: `1px solid ${promisePassed ? "#7f1d1d" : "#2d4a2d"}`,
                borderRadius: 14,
                padding: isMobile ? 14 : 20,
              }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: "bold", color: "#c8e6c9" }}>{b.name}</div>
                    <div style={{ fontSize: 12, color: "#6a9c6a", marginTop: 2 }}>
                      📍 {b.location} · 📞 {b.phone}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <PaymentStatusBadge b={b} />
                    {b.amountBalance > 0 && (
                      <button onClick={() => onNewPayment(b)}
                        style={{ padding: "6px 12px", borderRadius: 7, border: "none", background: "#4a7c59", color: "white", fontSize: 12, fontWeight: "bold", cursor: "pointer", fontFamily: "Georgia, serif", whiteSpace: "nowrap" }}>
                        + Payment
                      </button>
                    )}
                  </div>
                </div>

                {/* Amount breakdown */}
                <div style={{ display: "flex", gap: 16, fontSize: 12, marginBottom: 10, flexWrap: "wrap" }}>
                  <span>Due: <b style={{ color: "#c8e6c9" }}>RWF {b.amountDue.toLocaleString()}</b></span>
                  <span>Paid: <b style={{ color: "#4ade80" }}>RWF {b.amountPaid.toLocaleString()}</b></span>
                  {b.amountBalance > 0 && (
                    <span>Balance: <b style={{ color: "#fbbf24" }}>RWF {b.amountBalance.toLocaleString()}</b></span>
                  )}
                </div>

                {/* Progress bar */}
                <div style={{ background: "#0f1a0f", borderRadius: 4, height: 6, marginBottom: b.promisedPaymentDate && b.amountBalance > 0 ? 10 : 14 }}>
                  <div style={{ background: pct === 100 ? "#4ade80" : "#fbbf24", height: "100%", borderRadius: 4, width: `${pct}%`, transition: "width 0.3s" }} />
                </div>

                {/* Promise date */}
                {b.promisedPaymentDate && b.amountBalance > 0 && (
                  <div style={{ fontSize: 12, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: promisePassed ? "#f87171" : "#fbbf24" }}>
                      {promisePassed ? "⚠ " : "📅 "}
                      Promised by {formatDate(b.promisedPaymentDate)}
                      {promisePassed && " — OVERDUE"}
                    </span>
                  </div>
                )}

                {/* Payment history */}
                {b.payments.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, color: "#4a7c59", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                      Payment History ({b.payments.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {[...b.payments]
                        .sort((x, y) => new Date(y.paidAt).getTime() - new Date(x.paidAt).getTime())
                        .map((p) => (
                          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f1a0f", borderRadius: 8, padding: "8px 12px", gap: 10 }}>
                            <div>
                              <span style={{ color: "#4ade80", fontWeight: "bold" }}>RWF {p.amount.toLocaleString()}</span>
                              <span style={{ color: "#6a9c6a", fontSize: 12 }}> · {formatDate(p.paidAt)}</span>
                              {p.note && <div style={{ fontSize: 12, color: "#9ab89a", marginTop: 2 }}>"{p.note}"</div>}
                            </div>
                            <DeliveryActionsMenu
                              isMobile={isMobile}
                              onEdit={() => onEditPayment(b, p)}
                              onDelete={() => onDeletePayment(b, p)}
                            />
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
