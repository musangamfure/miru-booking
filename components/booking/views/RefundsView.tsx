"use client";

import { useState } from "react";
import { formatDate, PRICE_PER_TUBE } from "@/lib/utils";
import { DeliveryActionsMenu } from "@/components/booking/delivery/DeliveryActionsMenu";
import type { Booking, Refund } from "@/lib/types";

export interface RefundsViewProps {
  bookings: Booking[];
  isMobile: boolean | null;
  onEditRefund: (b: Booking, r: Refund) => void;
  onDeleteRefund: (b: Booking, r: Refund) => void;
  onNewRefund: (b: Booking) => void;
}

export function RefundsView({ bookings, isMobile, onEditRefund, onDeleteRefund, onNewRefund }: RefundsViewProps) {
  const [search, setSearch] = useState("");

  const bookingsWithRefunds = bookings.filter((b) => (b.refunds || []).length > 0);
  const filtered = bookingsWithRefunds.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.location.toLowerCase().includes(search.toLowerCase()) ||
      b.phone.includes(search)
  );

  const totalTubesRefunded = bookings.reduce((s, b) => s + (b.tubesRefunded || 0), 0);
  const totalAmountRefunded = bookings.reduce((s, b) => s + (b.amountRefunded || 0), 0);
  const totalRefundCount = bookings.reduce((s, b) => s + (b.refunds || []).length, 0);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: "bold", color: "#c8e6c9" }}>Refunds</div>
        <div style={{ fontSize: 13, color: "#6a9c6a", marginTop: 4 }}>
          Track refunded tubes and amounts per farmer.
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Refunds", value: totalRefundCount.toString(), color: "#f87171" },
          { label: "Tubes Refunded", value: totalTubesRefunded.toLocaleString(), color: "#fb923c" },
          { label: "Amount Refunded (RWF)", value: totalAmountRefunded.toLocaleString(), color: "#fbbf24" },
        ].map((k) => (
          <div key={k.label} style={{ background: "#2d1414", border: "1px solid #7f1d1d", borderRadius: 12, padding: isMobile ? "12px 14px" : "16px 20px", borderLeft: `4px solid ${k.color}` }}>
            <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: "bold", color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#9a6a6a", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.8 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {bookingsWithRefunds.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💸</div>
          <div style={{ fontSize: 16, color: "#9ab89a" }}>No refunds recorded yet.</div>
        </div>
      ) : (
        <>
          <input
            placeholder="🔍 Search name, location, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", maxWidth: isMobile ? "100%" : 320, padding: "11px 14px", borderRadius: 10, border: "1px solid #2d4a2d", background: "#1a2e1a", color: "#e8dcc8", fontSize: 14, fontFamily: "Georgia, serif", outline: "none", marginBottom: 16, boxSizing: "border-box", display: "block" }}
          />

          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#4a7c59" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
              <div>No refunds match your search.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filtered.map((b) => (
                <div key={b.id} style={{ background: "#1a2e1a", border: "1px solid #7f1d1d", borderRadius: 14, padding: isMobile ? 14 : 20 }}>
                  {/* Booking header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: "bold", color: "#c8e6c9" }}>{b.name}</div>
                      <div style={{ fontSize: 12, color: "#6a9c6a", marginTop: 2 }}>
                        📍 {b.location} · 📞 {b.phone}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: "bold", color: "#f87171" }}>
                          {b.tubesRefunded.toLocaleString()} tubes · RWF {b.amountRefunded.toLocaleString()}
                        </div>
                        <div style={{ fontSize: 11, color: "#9a6a6a" }}>
                          of {b.tubes.toLocaleString()} booked · net {b.tubesNet.toLocaleString()} remaining
                        </div>
                      </div>
                      <button
                        onClick={() => onNewRefund(b)}
                        style={{ padding: "7px 12px", borderRadius: 7, border: "1px solid #7f1d1d", background: "transparent", color: "#f87171", fontSize: 12, fontWeight: "bold", cursor: "pointer", fontFamily: "Georgia, serif", whiteSpace: "nowrap" }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {/* Net progress bar */}
                  <div style={{ background: "#0f1a0f", borderRadius: 4, height: 6, marginBottom: 14 }}>
                    <div style={{ background: "#f87171", height: "100%", borderRadius: 4, width: `${Math.round((b.tubesRefunded / b.tubes) * 100)}%` }} />
                  </div>

                  {/* Refund list */}
                  <div style={{ fontSize: 11, color: "#9a6a6a", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                    Refund History ({b.refunds.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[...b.refunds]
                      .sort((x, y) => new Date(y.refundedAt).getTime() - new Date(x.refundedAt).getTime())
                      .map((r) => (
                        <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#2d1414", borderRadius: 8, padding: "8px 12px", gap: 10 }}>
                          <div style={{ minWidth: 0 }}>
                            <span style={{ color: "#f87171", fontWeight: "bold" }}>{r.tubesRefunded.toLocaleString()} tubes</span>
                            {" · "}
                            <span style={{ color: "#fbbf24", fontWeight: "bold" }}>RWF {r.amountRefunded.toLocaleString()}</span>
                            <span style={{ color: "#6a9c6a", fontSize: 12 }}> · {formatDate(r.refundedAt)}</span>
                            <div style={{ fontSize: 12, color: "#9ab89a", marginTop: 2, fontStyle: "italic" }}>
                              "{r.reason}"
                            </div>
                          </div>
                          <DeliveryActionsMenu
                            isMobile={isMobile}
                            onEdit={() => onEditRefund(b, r)}
                            onDelete={() => onDeleteRefund(b, r)}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
