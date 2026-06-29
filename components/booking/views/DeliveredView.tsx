"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { DeliveryActionsMenu } from "@/components/booking/delivery/DeliveryActionsMenu";
import type { Booking, Delivery } from "@/lib/types";

export interface DeliveredViewProps {
  bookings: Booking[];
  isMobile: boolean | null;
  onDeliver: (b: Booking) => void;
  onEditDelivery: (b: Booking, d: Delivery) => void;
  onDeleteDelivery: (b: Booking, d: Delivery) => void;
}

export function DeliveredView({
  bookings,
  isMobile,
  onDeliver,
  onEditDelivery,
  onDeleteDelivery,
}: DeliveredViewProps) {
  const [search, setSearch] = useState("");

  const withDeliveries = bookings.filter(
    (b) => (b.deliveries || []).length > 0
  );
  const filtered = withDeliveries.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.location.toLowerCase().includes(search.toLowerCase()) ||
      b.phone.includes(search)
  );

  if (withDeliveries.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
        <div style={{ fontSize: 16, color: "#9ab89a" }}>
          No deliveries recorded yet.
        </div>
      </div>
    );
  }

  return (
    <div>
      <input
        placeholder="🔍 Search name, location, phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          maxWidth: isMobile ? "100%" : 320,
          padding: "11px 14px",
          borderRadius: 10,
          border: "1px solid #2d4a2d",
          background: "#1a2e1a",
          color: "#e8dcc8",
          fontSize: 14,
          fontFamily: "Georgia, serif",
          outline: "none",
          marginBottom: 16,
          boxSizing: "border-box",
          display: "block",
        }}
      />

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 0", color: "#4a7c59" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
          <div>No deliveries match your search.</div>
        </div>
      ) : (
        filtered.map((b) => (
        <div
          key={b.id}
          style={{
            background: "#1a2e1a",
            border: "1px solid #2d4a2d",
            borderRadius: 14,
            padding: isMobile ? 16 : 20,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 12,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div>
              <div
                style={{ fontSize: 16, fontWeight: "bold", color: "#c8e6c9" }}
              >
                {b.name}
              </div>
              <div style={{ fontSize: 12, color: "#6a9c6a", marginTop: 2 }}>
                📍 {b.location} · 📞 {b.phone}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 14,
                    color: b.tubesPending === 0 ? "#4ade80" : "#fbbf24",
                    fontWeight: "bold",
                  }}
                >
                  {b.tubesDelivered.toLocaleString()} /{" "}
                  {b.tubes.toLocaleString()} delivered
                </div>
                {b.tubesPending > 0 && (
                  <div style={{ fontSize: 11, color: "#9ab89a" }}>
                    {b.tubesPending.toLocaleString()} tubes pending
                  </div>
                )}
              </div>
              {b.tubesPending > 0 && (
                <button
                  onClick={() => onDeliver(b)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 7,
                    border: "none",
                    background: "#2d6a4f",
                    color: "white",
                    fontSize: 12,
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontFamily: "Georgia, serif",
                    whiteSpace: "nowrap",
                  }}
                >
                  🚚 Deliver more
                </button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div
            style={{
              background: "#0f1a0f",
              borderRadius: 4,
              height: 6,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                background: b.tubesPending === 0 ? "#4ade80" : "#fbbf24",
                height: "100%",
                borderRadius: 4,
                width: `${Math.round((b.tubesDelivered / b.tubes) * 100)}%`,
              }}
            />
          </div>

          {/* Delivery history */}
          <div
            style={{
              fontSize: 11,
              color: "#4a7c59",
              textTransform: "uppercase",
              letterSpacing: 0.8,
              marginBottom: 8,
            }}
          >
            Delivery History ({b.deliveries.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[...b.deliveries]
              .sort((x, y) => new Date(y.deliveredAt).getTime() - new Date(x.deliveredAt).getTime())
              .map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "#0f1a0f",
                    borderRadius: 8,
                    padding: "8px 12px",
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <span style={{ color: "#4ade80", fontWeight: "bold" }}>
                      {d.tubesDelivered.toLocaleString()} tubes
                    </span>{" "}
                    <span style={{ color: "#6a9c6a", fontSize: 12 }}>
                      · {formatDate(d.deliveredAt)}
                    </span>
                    {d.note && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#9ab89a",
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        “{d.note}”
                      </div>
                    )}
                  </div>
                  <DeliveryActionsMenu
                    isMobile={isMobile}
                    onEdit={() => onEditDelivery(b, d)}
                    onDelete={() => onDeleteDelivery(b, d)}
                  />
                </div>
              ))}
          </div>
        </div>
        ))
      )}
    </div>
  );
}
