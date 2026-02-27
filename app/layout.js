export const metadata = {
  title: "Miru Mushrooms – Booking Manager",
  description: "Manage mushroom tube bookings, send WhatsApp messages, and export to Excel.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
