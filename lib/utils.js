// ─────────────────────────────────────────────────────────────────
// Client-side formatting + business-rule helpers shared across views.
// Delivery-date math mirrors lib/booking-helpers.js (the server-side
// equivalent) — keep the two in sync if the 30-day rule ever changes.
// ─────────────────────────────────────────────────────────────────

export const PRICE_PER_TUBE = 600;
const DAYS_TO_DELIVERY = 30;

export const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
};

/**
 * Delivery is due 30 days after inoculation (Imigina yatewe umurama).
 * Falls back to the booking date for older records saved before the
 * inoculation date field existed.
 */
export const getDeliveryDate = (booking) => {
  const base =
    typeof booking === "string" ? booking : booking?.inoculationDate || booking?.bookingDate;
  if (!base) return "";
  const d = new Date(base);
  d.setDate(d.getDate() + DAYS_TO_DELIVERY);
  return d.toISOString().split("T")[0];
};

export const daysUntilDelivery = (booking) => {
  const delivery = new Date(getDeliveryDate(booking));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  delivery.setHours(0, 0, 0, 0);
  return Math.ceil((delivery - today) / (1000 * 60 * 60 * 24));
};

/** A booking is overdue once its delivery date has passed and tubes are still pending. */
export const isOverdue = (b) =>
  daysUntilDelivery(b) < 0 && (b.tubesPending ?? b.tubes) > 0;

export const buildWhatsAppMessage = (b) => {
  const delivery = formatDate(getDeliveryDate(b));
  const total = (b.tubes * PRICE_PER_TUBE).toLocaleString();
  const sacks = Math.ceil(b.tubes / 60);
  const loadingCost = (sacks * 350).toLocaleString();
  return (
    `Dear ${b.name},
` +
    `Thank you for booking ${b.tubes} mushroom tubes with Miru Mushrooms!

` +
    `Delivery Date: ${delivery}
` +
    `(30 days from inoculation date — Imigina yatewe umurama)

` +
    `Total Amount: RWF ${total}

` +
    `--- Additional Costs to Prepare For ---

` +
    `Loading Manpower: RWF ${loadingCost}
` +
    `(${b.tubes} tubes = ${sacks} sack${
      sacks > 1 ? "s" : ""
    } x 350 RWF per sack)

` +
    `Transportation: Our team will contact you with the exact cost based on your location in ${b.location}.

` +
    `Thank you for trusting us - Miru Mushrooms Team`
  );
};

export const buildWaLink = (b) => {
  const msg = buildWhatsAppMessage(b);
  const phone = b.phone.replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
};

/**
 * Pre-delivery reminder, sent a few days before the 30-day (from
 * inoculation) delivery window closes. Lists everything the farmer
 * should prepare in advance.
 */
export const buildReminderMessage = (b) => {
  const days = daysUntilDelivery(b);
  const delivery = formatDate(getDeliveryDate(b));
  const sacks = Math.ceil(b.tubes / 60);
  const loadingCost = (sacks * 350).toLocaleString();
  return (
    "Dear " +
    b.name +
    ",\n\n" +
    "Your mushroom tubes delivery is in " +
    days +
    " day" +
    (days !== 1 ? "s" : "") +
    " — on " +
    delivery +
    " (30 days from inoculation date — Imigina yatewe umurama).\n\n" +
    "Please prepare the following before delivery:\n\n" +
    "1. Transportation cost (varies by location — our team will confirm your exact amount).\n\n" +
    "2. Amafaranga y'abakarani (Loading manpower): RWF " +
    loadingCost +
    "\n" +
    "   (" +
    b.tubes +
    " tubes = " +
    sacks +
    " sack" +
    (sacks > 1 ? "s" : "") +
    " x 350 RWF per sack)\n\n" +
    "3. Black plastic / Ishashi y'umukarera\n" +
    "   (1 roll per " +
    Math.ceil(b.tubes / 100) +
    " rows of tubes)\n\n" +
    "4. Razors / Inzembe zo gukata amashashi y'imigina\n" +
    "   (At least 2 razors recommended)\n\n" +
    "5. Umuti wa Dudu wo kurwanya udukoko\n" +
    "   (Insect repellent spray for your mushroom house)\n\n" +
    "6. Abakozi bo gufasha umukozi wa Miru Mushrooms mu gutera imigina\n" +
    "   (Workers to assist with planting — please arrange in advance)\n\n" +
    "If you have any questions, please contact us.\n\n" +
    "Thank you — Miru Mushrooms Team"
  );
};

export const buildReminderLink = (b) => {
  const phone = b.phone.replace(/\D/g, "");
  return (
    "https://wa.me/" +
    phone +
    "?text=" +
    encodeURIComponent(buildReminderMessage(b))
  );
};

export const exportToExcel = async (bookings) => {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const headers = [
    "No.",
    "Farmer Name",
    "Telephone",
    "Tubes Booked",
    "Amount Paid (RWF)",
    "Booking Date",
    "Farm Location",
    "Delivery Date",
  ];
  const rows = bookings.map((b, i) => [
    i + 1,
    b.name,
    b.phone,
    b.tubes,
    b.tubes * PRICE_PER_TUBE,
    formatDate(b.bookingDate),
    b.location,
    formatDate(getDeliveryDate(b)),
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = [5, 25, 18, 14, 18, 14, 20, 14].map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, "Bookings");
  XLSX.writeFile(wb, "Miru_Mushrooms_Bookings.xlsx");
};

export const EMPTY_FORM = {
  name: "",
  phone: "",
  tubes: "",
  bookingDate: new Date().toISOString().split("T")[0],
  inoculationDate: new Date().toISOString().split("T")[0],
  location: "",
};
