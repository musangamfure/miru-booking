import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/lib/models/Booking";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatDate(d) {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(
    dt.getMonth() + 1
  ).padStart(2, "0")}/${dt.getFullYear()}`;
}

function getDeliveryDate(bookingDate) {
  const d = new Date(bookingDate);
  d.setDate(d.getDate() + 30);
  return d;
}

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export async function GET() {
  try {
    await connectDB();
    const raw = await Booking.find().sort({ bookingDate: 1 }).lean();
    const bookings = raw.map(({ _id, ...rest }) => ({
      ...rest,
      id: _id.toString(),
    }));

    const PRICE = 600;
    const totalTubes = bookings.reduce((s, b) => s + b.tubes, 0);
    const totalRevenue = totalTubes * PRICE;
    const today = new Date();

    const byMonth = {};
    bookings.forEach((b) => {
      const d = new Date(b.bookingDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      if (!byMonth[key])
        byMonth[key] = { tubes: 0, count: 0, revenue: 0, month: d.getMonth() };
      byMonth[key].tubes += b.tubes;
      byMonth[key].count += 1;
      byMonth[key].revenue += b.tubes * PRICE;
    });

    const byLocation = {};
    bookings.forEach((b) => {
      if (!byLocation[b.location])
        byLocation[b.location] = { tubes: 0, count: 0 };
      byLocation[b.location].tubes += b.tubes;
      byLocation[b.location].count += 1;
    });

    const upcoming = bookings.filter(
      (b) => getDeliveryDate(b.bookingDate) >= today
    );

    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const W = 210,
      MARGIN = 14,
      CW = W - MARGIN * 2;
    const DARK = hexToRgb("#1a2e1a");
    const ACCENT = hexToRgb("#4a7c59");
    const PALE = hexToRgb("#e8f5e9");
    const LIGHT = hexToRgb("#c8e6c9");
    const WHITE = [255, 255, 255];
    const MUTED = [120, 120, 120];
    const GOLD = hexToRgb("#f59e0b");
    const RED = hexToRgb("#dc2626");
    const genDate = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    let pageNum = 1;
    const addFooter = () => {
      doc.setFillColor(...DARK);
      doc.rect(0, 287, 210, 10, "F");
      doc.setFontSize(7.5);
      doc.setTextColor(...LIGHT);
      doc.text("Miru Mushrooms - Confidential Booking Report", MARGIN, 293);
      doc.text(`Page ${pageNum}  |  ${genDate}`, W - MARGIN, 293, {
        align: "right",
      });
    };

    // ── PAGE 1 ─────────────────────────────────────────────────
    let y = MARGIN;

    // Header
    doc.setFillColor(...DARK);
    doc.roundedRect(MARGIN, y, CW, 22, 3, 3, "F");
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    doc.text("MIRU MUSHROOMS", W / 2, y + 9, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...LIGHT);
    doc.text("Booking Report", W / 2, y + 16, { align: "center" });
    y += 26;

    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`Generated on ${genDate}`, W / 2, y, { align: "center" });
    y += 8;

    // KPI cards
    const kpis = [
      { label: "TOTAL BOOKINGS", value: String(bookings.length) },
      { label: "TOTAL TUBES", value: totalTubes.toLocaleString() },
      { label: "TOTAL REVENUE (RWF)", value: totalRevenue.toLocaleString() },
      { label: "UPCOMING DELIVERIES", value: String(upcoming.length) },
    ];
    const cardW = (CW - 6) / 4;
    kpis.forEach((k, i) => {
      const x = MARGIN + i * (cardW + 2);
      doc.setFillColor(...PALE);
      doc.roundedRect(x, y, cardW, 18, 2, 2, "F");
      doc.setFillColor(...ACCENT);
      doc.rect(x, y + 2, 1.2, 14, "F");
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...ACCENT);
      doc.text(k.value, x + cardW / 2, y + 9, { align: "center" });
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.text(k.label, x + cardW / 2, y + 14, { align: "center" });
    });
    y += 24;

    // Monthly summary
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text("Monthly Booking Summary", MARGIN, y);
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y + 1.5, MARGIN + CW, y + 1.5);
    y += 5;

    const monthRows = Object.keys(byMonth)
      .sort()
      .map((key) => {
        const [yr, mo] = key.split("-");
        const m = byMonth[key];
        return [
          `${MONTHS_SHORT[parseInt(mo) - 1]} ${yr}`,
          String(m.count),
          m.tubes.toLocaleString(),
          `RWF ${m.revenue.toLocaleString()}`,
          String(Math.round(m.tubes / m.count)),
        ];
      });

    autoTable(doc, {
      startY: y,
      head: [["Month", "Bookings", "Tubes", "Revenue (RWF)", "Avg Tubes"]],
      body: monthRows.length ? monthRows : [["No data yet", "", "", "", ""]],
      theme: "plain",
      styles: { fontSize: 8.5, cellPadding: 3, textColor: [30, 50, 30] },
      headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold" },
      alternateRowStyles: { fillColor: PALE },
      columnStyles: {
        0: { cellWidth: CW * 0.22 },
        1: { cellWidth: CW * 0.14, halign: "center" },
        2: { cellWidth: CW * 0.14, halign: "right" },
        3: { cellWidth: CW * 0.3, halign: "right" },
        4: { cellWidth: CW * 0.2, halign: "center" },
      },
      margin: { left: MARGIN, right: MARGIN },
    });
    y = doc.lastAutoTable.finalY + 8;

    // By location
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text("Bookings by Location", MARGIN, y);
    doc.setDrawColor(...ACCENT);
    doc.line(MARGIN, y + 1.5, MARGIN + CW, y + 1.5);
    y += 5;

    const locRows = Object.entries(byLocation)
      .sort((a, b) => b[1].tubes - a[1].tubes)
      .map(([loc, v]) => [
        loc,
        String(v.count),
        v.tubes.toLocaleString(),
        totalTubes ? `${Math.round((v.tubes / totalTubes) * 100)}%` : "0%",
      ]);

    autoTable(doc, {
      startY: y,
      head: [["Location", "Farmers", "Total Tubes", "% of Total"]],
      body: locRows.length ? locRows : [["No data", "", "", ""]],
      theme: "plain",
      styles: { fontSize: 8.5, cellPadding: 3, textColor: [30, 50, 30] },
      headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold" },
      alternateRowStyles: { fillColor: PALE },
      columnStyles: {
        0: { cellWidth: CW * 0.45 },
        1: { cellWidth: CW * 0.18, halign: "center" },
        2: { cellWidth: CW * 0.22, halign: "right" },
        3: { cellWidth: CW * 0.15, halign: "center" },
      },
      margin: { left: MARGIN, right: MARGIN },
    });

    addFooter();

    // ── PAGE 2 ─────────────────────────────────────────────────
    doc.addPage();
    pageNum = 2;
    y = MARGIN;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text("Complete Booking Register", MARGIN, y);
    doc.setDrawColor(...ACCENT);
    doc.line(MARGIN, y + 1.5, MARGIN + CW, y + 1.5);
    y += 5;

    const detailRows = bookings.map((b, i) => [
      String(i + 1),
      b.name,
      b.phone,
      b.location,
      b.tubes.toLocaleString(),
      `RWF ${(b.tubes * PRICE).toLocaleString()}`,
      formatDate(b.bookingDate),
      formatDate(getDeliveryDate(b.bookingDate)),
    ]);
    detailRows.push([
      "",
      "TOTAL",
      "",
      "",
      totalTubes.toLocaleString(),
      `RWF ${totalRevenue.toLocaleString()}`,
      "",
      "",
    ]);

    autoTable(doc, {
      startY: y,
      head: [
        [
          "#",
          "Farmer Name",
          "Phone",
          "Location",
          "Tubes",
          "Amount (RWF)",
          "Booked",
          "Delivery",
        ],
      ],
      body: detailRows,
      theme: "plain",
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: [30, 50, 30] },
      headStyles: {
        fillColor: DARK,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: 7.5,
      },
      alternateRowStyles: { fillColor: PALE },
      didParseCell: (d) => {
        if (d.row.index === detailRows.length - 1) {
          d.cell.styles.fontStyle = "bold";
          d.cell.styles.fillColor = hexToRgb("#d5edd6");
        }
      },
      columnStyles: {
        0: { cellWidth: CW * 0.05, halign: "center" },
        1: { cellWidth: CW * 0.17, fontStyle: "bold" },
        2: { cellWidth: CW * 0.13 },
        3: { cellWidth: CW * 0.15 },
        4: { cellWidth: CW * 0.08, halign: "right" },
        5: { cellWidth: CW * 0.14, halign: "right" },
        6: { cellWidth: CW * 0.14, halign: "center" },
        7: { cellWidth: CW * 0.14, halign: "center" },
      },
      margin: { left: MARGIN, right: MARGIN },
      repeatHeaders: true,
    });
    y = doc.lastAutoTable.finalY + 8;

    // Upcoming deliveries
    if (upcoming.length > 0) {
      if (y > 230) {
        doc.addPage();
        pageNum++;
        y = MARGIN;
      }
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);
      doc.text(`Upcoming Deliveries (${upcoming.length})`, MARGIN, y);
      doc.setDrawColor(...ACCENT);
      doc.line(MARGIN, y + 1.5, MARGIN + CW, y + 1.5);
      y += 5;

      const upRows = [...upcoming]
        .sort((a, b) => new Date(a.bookingDate) - new Date(b.bookingDate))
        .map((b) => {
          const dd = getDeliveryDate(b.bookingDate);
          const daysLeft = Math.ceil((dd - today) / (1000 * 60 * 60 * 24));
          return [
            b.name,
            b.phone,
            b.location,
            b.tubes.toLocaleString(),
            formatDate(dd),
            `${daysLeft}d`,
          ];
        });

      autoTable(doc, {
        startY: y,
        head: [
          [
            "Farmer",
            "Phone",
            "Location",
            "Tubes",
            "Delivery Date",
            "Days Left",
          ],
        ],
        body: upRows,
        theme: "plain",
        styles: { fontSize: 8, cellPadding: 3, textColor: [30, 50, 30] },
        headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold" },
        alternateRowStyles: { fillColor: PALE },
        didParseCell: (d) => {
          if (d.column.index === 5 && d.section === "body") {
            const days = parseInt(d.cell.text[0]);
            d.cell.styles.fontStyle = "bold";
            d.cell.styles.textColor =
              days <= 7 ? RED : days <= 14 ? GOLD : hexToRgb("#4a7c59");
          }
          if (d.column.index === 1 && d.section === "body")
            d.cell.styles.fontStyle = "bold";
        },
        columnStyles: {
          0: { cellWidth: CW * 0.22, fontStyle: "bold" },
          1: { cellWidth: CW * 0.16 },
          2: { cellWidth: CW * 0.22 },
          3: { cellWidth: CW * 0.1, halign: "right" },
          4: { cellWidth: CW * 0.18, halign: "center" },
          5: { cellWidth: CW * 0.12, halign: "center" },
        },
        margin: { left: MARGIN, right: MARGIN },
      });
    }

    addFooter();

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const now = new Date();
    const filename = `Miru_Report_${now.getFullYear()}${String(
      now.getMonth() + 1
    ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("Report generation error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
