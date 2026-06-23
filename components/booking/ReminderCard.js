"use client";

import { formatDate, getDeliveryDate, daysUntilDelivery, buildReminderLink } from "@/lib/utils";

// Shows a banner on the dashboard for bookings whose delivery date
// (30 days from inoculation) is within the next 3 days, with a
// one-tap WhatsApp reminder listing everything the farmer should
// prepare in advance.
export function ReminderCard({ bookings, isMobile }) {
  const due = bookings
    .filter((b) => (b.tubesPending ?? b.tubes) > 0)
    .map((b) => ({ ...b, daysLeft: daysUntilDelivery(b) }))
    .filter((b) => b.daysLeft >= 0 && b.daysLeft <= 3)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  if (due.length === 0) return null;
  return (
    <div
      style={{
        background: "#1a1400",
        border: "2px solid #f59e0b",
        borderRadius: 14,
        padding: isMobile ? 16 : 20,
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 22 }}>🔔</span>
        <div>
          <div
            style={{
              fontSize: isMobile ? 14 : 16,
              fontWeight: "bold",
              color: "#fbbf24",
            }}
          >
            {due.length} farmer{due.length > 1 ? "s" : ""} due for delivery
            within 3 days
          </div>
          <div style={{ fontSize: 12, color: "#92651a", marginTop: 2 }}>
            Send them a preparation reminder on WhatsApp
          </div>
        </div>
      </div>
      {due.map((b, i) => (
        <div
          key={b.id}
          style={{
            background: "#0f0e00",
            border: "1px solid #78460a",
            borderRadius: 10,
            padding: isMobile ? "12px 14px" : "14px 18px",
            marginBottom: i < due.length - 1 ? 10 : 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div>
            <div
              style={{
                fontWeight: "bold",
                color: "#e8dcc8",
                fontSize: isMobile ? 14 : 15,
              }}
            >
              {b.name}
            </div>
            <div style={{ fontSize: 12, color: "#92651a", marginTop: 3 }}>
              📍 {b.location} · 📦 {formatDate(getDeliveryDate(b))} ·{" "}
              <span
                style={{
                  color:
                    b.daysLeft === 0
                      ? "#ef4444"
                      : b.daysLeft === 1
                      ? "#f97316"
                      : "#fbbf24",
                  fontWeight: "bold",
                }}
              >
                {b.daysLeft === 0
                  ? "Today!"
                  : b.daysLeft === 1
                  ? "Tomorrow!"
                  : b.daysLeft + " days"}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#6a9c6a", marginTop: 2 }}>
              {(b.tubesPending ?? b.tubes).toLocaleString()} tubes pending
            </div>
          </div>
          <a
            href={buildReminderLink(b)}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: isMobile ? "10px 14px" : "10px 18px",
              borderRadius: 10,
              background: "#25D366",
              color: "white",
              fontWeight: "bold",
              fontSize: isMobile ? 13 : 14,
              textDecoration: "none",
              fontFamily: "Georgia, serif",
              whiteSpace: "nowrap",
            }}
          >
            💬 Send Reminder
          </a>
        </div>
      ))}
    </div>
  );
}
