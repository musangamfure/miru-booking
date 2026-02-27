export const PRICE_PER_TUBE = 600;

export const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
};

export const getDeliveryDate = (bookingDate) => {
  if (!bookingDate) return "";
  const d = new Date(bookingDate);
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
};

export const buildWhatsAppMessage = (b) => {
  const delivery = formatDate(getDeliveryDate(b.bookingDate));
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
    `(30 days from your booking date)

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
    formatDate(getDeliveryDate(b.bookingDate)),
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
  location: "",
};
