"use client";

import type { CSSProperties } from "react";
import { formatDate, getDeliveryDate, isOverdue, PRICE_PER_TUBE } from "@/lib/utils";
import type { Booking } from "@/lib/types";

export interface ReportViewProps {
  bookings: Booking[];
  isMobile: boolean | null;
  onDownload: () => void;
  downloading: boolean;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const thStyle: CSSProperties = {
  background: "#1a2e1a",
  padding: "8px 10px",
  fontSize: 11,
  color: "#9ab89a",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  borderBottom: "2px solid #4a7c59",
  textAlign: "left",
  fontFamily: "Georgia, serif",
};
const tdStyle = (i: number): CSSProperties => ({
  padding: "9px 10px",
  fontSize: 13,
  color: "#c8e6c9",
  borderBottom: "1px solid #2d4a2d",
  background: i % 2 === 0 ? "#1a2e1a" : "#0f1a0f",
  fontFamily: "Georgia, serif",
});
const tdNum = (i: number): CSSProperties => ({
  ...tdStyle(i),
  textAlign: "right",
  color: "#4ade80",
  fontWeight: "bold",
});

interface KpiCardProps {
  label: string;
  value: string | number;
  accent: string;
  isMobile: boolean | null;
}

function KpiCard({ label, value, accent, isMobile }: KpiCardProps) {
  return (
    <div
      style={{
        background: "#1a2e1a",
        border: `1px solid ${accent}`,
        borderRadius: 12,
        padding: isMobile ? "12px 14px" : "16px 20px",
        borderLeft: `4px solid ${accent}`,
      }}
    >
      <div
        style={{
          fontSize: isMobile ? 20 : 24,
          fontWeight: "bold",
          color: "#c8e6c9",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#6a9c6a",
          marginTop: 4,
          textTransform: "uppercase",
          letterSpacing: 0.8,
        }}
      >
        {label}
      </div>
    </div>
  );
}

interface MonthStat {
  tubes: number;
  count: number;
  revenue: number;
}

interface LocationStat {
  tubes: number;
  count: number;
}

export function ReportView({ bookings, isMobile, onDownload, downloading }: ReportViewProps) {
  const totalTubes = bookings.reduce((s, b) => s + b.tubes, 0);
  const totalRevenue = totalTubes * PRICE_PER_TUBE;

  const byMonth: Record<string, MonthStat> = {};
  bookings.forEach((b) => {
    const d = new Date(b.bookingDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[key]) byMonth[key] = { tubes: 0, count: 0, revenue: 0 };
    byMonth[key].tubes += b.tubes;
    byMonth[key].count += 1;
    byMonth[key].revenue += b.tubes * PRICE_PER_TUBE;
  });

  const byLocation: Record<string, LocationStat> = {};
  bookings.forEach((b) => {
    if (!byLocation[b.location]) byLocation[b.location] = { tubes: 0, count: 0 };
    byLocation[b.location].tubes += b.tubes;
    byLocation[b.location].count += 1;
  });

  // "Upcoming" and "Overdue" partition the bookings that still have
  // tubes pending — a fully delivered booking is neither.
  const upcoming = bookings.filter((b) => b.tubesPending > 0 && !isOverdue(b));
  const overdue = bookings.filter(isOverdue);
  const topFarmers = [...bookings].sort((a, b) => b.tubes - a.tubes).slice(0, 5);

  return (
    <div style={{ paddingBottom: isMobile ? 20 : 0 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: isMobile ? 20 : 26,
              fontWeight: "bold",
              color: "#c8e6c9",
              margin: 0,
            }}
          >
            Booking Report
          </h1>
          <p style={{ color: "#6a9c6a", marginTop: 4, fontSize: 13 }}>
            Summary of all bookings and analytics
          </p>
        </div>
        <button
          onClick={onDownload}
          disabled={downloading}
          style={{
            padding: isMobile ? "12px 18px" : "12px 24px",
            borderRadius: 10,
            border: "none",
            background: downloading ? "#2d4a2d" : "#4a7c59",
            color: "white",
            fontSize: 14,
            fontWeight: "bold",
            cursor: downloading ? "not-allowed" : "pointer",
            fontFamily: "Georgia, serif",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 16px rgba(74,124,89,0.3)",
          }}
        >
          {downloading ? "⏳ Generating..." : "⬇ Download PDF Report"}
        </button>
      </div>

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <KpiCard label="Total Bookings" value={bookings.length} accent="#4a7c59" isMobile={isMobile} />
        <KpiCard label="Total Tubes" value={totalTubes.toLocaleString()} accent="#2d6a4f" isMobile={isMobile} />
        <KpiCard label="Total Revenue (RWF)" value={totalRevenue.toLocaleString()} accent="#1b4332" isMobile={isMobile} />
        <KpiCard label="Upcoming Deliveries" value={upcoming.length} accent="#3d5a3e" isMobile={isMobile} />
        <KpiCard label="Overdue Deliveries" value={overdue.length} accent="#dc2626" isMobile={isMobile} />
      </div>

      {/* Monthly breakdown */}
      <div
        style={{
          background: "#1a2e1a",
          border: "1px solid #2d4a2d",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h2 style={{ margin: "0 0 14px", fontSize: 15, color: "#c8e6c9" }}>
          Monthly Summary
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 400 }}>
            <thead>
              <tr>
                {["Month", "Bookings", "Tubes", "Revenue (RWF)", "Avg Tubes"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(byMonth)
                .sort()
                .map((key, i) => {
                  const [yr, mo] = key.split("-");
                  const m = byMonth[key];
                  return (
                    <tr key={key}>
                      <td style={tdStyle(i)}>{MONTHS[parseInt(mo) - 1]} {yr}</td>
                      <td style={{ ...tdStyle(i), textAlign: "center" }}>{m.count}</td>
                      <td style={tdNum(i)}>{m.tubes.toLocaleString()}</td>
                      <td style={tdNum(i)}>{m.revenue.toLocaleString()}</td>
                      <td style={{ ...tdStyle(i), textAlign: "center" }}>
                        {Math.round(m.tubes / m.count)}
                      </td>
                    </tr>
                  );
                })}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ ...tdStyle(0), textAlign: "center", color: "#4a7c59", padding: "24px 0" }}>
                    No data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Location + Top Farmers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ background: "#1a2e1a", border: "1px solid #2d4a2d", borderRadius: 12, padding: 20 }}>
          <h2 style={{ margin: "0 0 14px", fontSize: 15, color: "#c8e6c9" }}>By Location</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Location", "Farmers", "Tubes", "% Share"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(byLocation)
                  .sort((a, b) => b[1].tubes - a[1].tubes)
                  .map(([loc, v], i) => (
                    <tr key={loc}>
                      <td style={tdStyle(i)}>{loc}</td>
                      <td style={{ ...tdStyle(i), textAlign: "center" }}>{v.count}</td>
                      <td style={tdNum(i)}>{v.tubes.toLocaleString()}</td>
                      <td style={{ ...tdStyle(i), textAlign: "center", color: "#9ab89a" }}>
                        {totalTubes ? Math.round((v.tubes / totalTubes) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ background: "#1a2e1a", border: "1px solid #2d4a2d", borderRadius: 12, padding: 20 }}>
          <h2 style={{ margin: "0 0 14px", fontSize: 15, color: "#c8e6c9" }}>Top Farmers</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Farmer", "Location", "Tubes"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topFarmers.map((b, i) => (
                <tr key={b.id}>
                  <td style={{ ...tdStyle(i), fontWeight: "bold" }}>{b.name}</td>
                  <td style={tdStyle(i)}>{b.location}</td>
                  <td style={tdNum(i)}>{b.tubes.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming deliveries */}
      {upcoming.length > 0 && (
        <div style={{ background: "#1a2e1a", border: "1px solid #2d4a2d", borderRadius: 12, padding: 20 }}>
          <h2 style={{ margin: "0 0 14px", fontSize: 15, color: "#c8e6c9" }}>
            Upcoming Deliveries ({upcoming.length})
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
              <thead>
                <tr>
                  {["Farmer", "Phone", "Location", "Tubes", "Delivery Date"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...upcoming]
                  .sort((a, b) => a.bookingDate.localeCompare(b.bookingDate))
                  .map((b, i) => (
                    <tr key={b.id}>
                      <td style={{ ...tdStyle(i), fontWeight: "bold" }}>{b.name}</td>
                      <td style={tdStyle(i)}>{b.phone}</td>
                      <td style={tdStyle(i)}>{b.location}</td>
                      <td style={tdNum(i)}>{b.tubes.toLocaleString()}</td>
                      <td style={{ ...tdStyle(i), color: "#4ade80" }}>{formatDate(getDeliveryDate(b))}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
