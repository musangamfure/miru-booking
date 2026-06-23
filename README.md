# 🍄 Miru Mushrooms — Booking Manager

A full-stack web application for managing mushroom tube bookings, built with **Next.js 14**, **MongoDB Atlas**, and deployed on **Vercel**. Runs on both desktop and mobile, stores all data in the cloud, and generates WhatsApp messages and PDF reports automatically.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [MongoDB Atlas Setup](#mongodb-atlas-setup)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Deploying to Vercel](#deploying-to-vercel)
- [API Reference](#api-reference)
- [Customisation](#customisation)
- [Troubleshooting](#troubleshooting)

---

## Features

### Booking Management

- Add, edit, and delete farmer bookings
- Fields: Farmer Name, Telephone, Tubes Booked, Booking Date, Inoculation Date (Imigina yatewe umurama), Farm Location
- Amount due and delivery date are calculated automatically — delivery is due **30 days after the inoculation date** (falls back to the booking date for older records that don't have one)

### WhatsApp Integration

- One-click **WhatsApp** button opens WhatsApp with a pre-filled message
- **Copy Message** button copies the message as plain text to the clipboard
- Message includes: booking confirmation, delivery date, total amount, loading manpower cost, and a note that transport cost will be communicated separately

### Loading Cost Calculation

The loading manpower cost is auto-calculated for every message:

```
Loading Cost = ceil(tubes ÷ 60) × RWF 350
```

Example: 500 tubes = 9 sacks × RWF 350 = **RWF 3,150**

### Delivery Tracking

- Record partial or full deliveries against a booking from the **Bookings**, **Delivered**, or **Overdue** views
- Each delivery is a separate, timestamped entry (tubes delivered + optional note) — a booking can be delivered in several trips
- Full CRUD on individual deliveries: every delivery line in the **Delivered** view has a **⋮** menu to **edit** (change the amount/note) or **delete** that single entry
- **Over-delivery protection:** the amount delivered can never exceed the tubes booked. This is enforced atomically in the database (not just in the UI), so two requests for the same booking — e.g. a double click on "Confirm Delivery" — can't both succeed and push pending tubes negative

### Overdue Deliveries

A dedicated **Overdue** view lists every booking whose 30-day delivery window (from inoculation) has passed while it still has tubes pending — the deliveries that were missed. It shows the total count, total tubes still owed, and each farmer's name, phone, and location, with quick links to deliver or message them. The same list is included in the PDF report.

### Report Tab

**On-screen analytics:**

- KPI cards — total bookings, tubes, revenue, upcoming deliveries, **overdue deliveries**
- Monthly breakdown (bookings, tubes, revenue, average per booking)
- Bookings by location with percentage share
- Top 5 farmers by volume
- Upcoming deliveries table

**Downloadable PDF report** (pure JavaScript — no Python required):

- Page 1: header banner, KPI cards, monthly summary, location breakdown
- Page 2: full booking register with totals row, upcoming deliveries, **and overdue deliveries**
- Days remaining colour-coded — 🔴 7 days or fewer, 🟡 14 days or fewer, 🟢 more than 14 days
- Footer on every page with page number and generation timestamp

### Excel Export

Download all bookings as a formatted `.xlsx` file from any screen.

### Offline Fallback

If MongoDB Atlas is unreachable, data is automatically read from and saved to **localStorage**. A live badge in the header shows the current data source: 🟢 MongoDB or 🟡 Offline (localStorage).

### Responsive Design

- **Mobile** (under 768px): sticky bottom navigation, card layout, bottom-sheet modals for WhatsApp and delete
- **Desktop** (768px and above): top navigation bar, row layout, centered booking form, centered modals
- Layout switches instantly when the screen width changes

---

## Tech Stack

| Layer          | Technology                       |
| -------------- | -------------------------------- |
| Framework      | Next.js 14 (App Router)          |
| Frontend       | React 18                         |
| Database       | MongoDB Atlas (free M0 tier)     |
| ODM            | Mongoose                         |
| PDF Generation | jsPDF + jsPDF-AutoTable          |
| Excel Export   | SheetJS (xlsx)                   |
| Deployment     | Vercel                           |
| Styling        | Inline styles (no CSS framework) |

---

## Project Structure

```
miru-bookings/
│
├── app/
│   ├── api/
│   │   ├── bookings/
│   │   │   ├── route.js                          # GET all bookings, POST new booking
│   │   │   └── [id]/
│   │   │       ├── route.js                      # PUT update, DELETE booking by ID
│   │   │       └── deliveries/
│   │   │           ├── route.js                  # GET history, POST new delivery (atomic)
│   │   │           └── [deliveryId]/
│   │   │               └── route.js              # PUT edit, DELETE a single delivery (atomic)
│   │   └── report/
│   │       └── route.js                          # GET — generates and streams PDF
│   ├── layout.js                                 # Root HTML layout and metadata
│   └── page.js                                   # Entry point — renders BookingApp
│
├── components/
│   ├── BookingApp.js                             # Orchestrator: state, data-fetching, layout
│   └── booking/
│       ├── Toast.js                              # Toast notification
│       ├── UserMenu.js                           # Account menu + sign out
│       ├── ReminderCard.js                       # "Due in 3 days" dashboard banner
│       ├── hooks/useIsMobile.js                  # Responsive layout detection
│       ├── form/BookingForm.js                   # Create/edit booking form
│       ├── bookingItems/
│       │   ├── MobileBookingCard.js
│       │   └── DesktopBookingRow.js
│       ├── modals/
│       │   ├── ConfirmModal.js                   # Generic delete/confirm dialog
│       │   ├── WhatsAppModal.js                  # WhatsApp message preview
│       │   ├── DeliveryModal.js                  # Record a new delivery
│       │   └── EditDeliveryModal.js              # Edit an existing delivery
│       ├── delivery/DeliveryActionsMenu.js       # "⋮" edit/delete menu per delivery row
│       └── views/
│           ├── DeliveredView.js                  # Delivery history per booking
│           ├── OverdueView.js                    # Missed deliveries
│           └── ReportView.js                     # On-screen analytics
│
├── lib/
│   ├── mongodb.js                  # MongoDB connection singleton
│   ├── models/
│   │   └── Booking.js              # Mongoose schema and model
│   ├── booking-helpers.js          # Server-side: normalize/delivery-date/overdue (shared by all API routes)
│   ├── api.js                      # Client API calls + localStorage fallback
│   └── utils.js                    # Client-side helpers (dates, WhatsApp, reminders, Excel)
│
├── .env.local                    # Your secrets — never commit this file
├── .env.local.example            # Template showing required variables
├── .gitignore
├── jsconfig.json                 # Enables the @/ import alias
├── next.config.js
├── package.json
└── README.md
```

Each piece of UI lives in its own small file under `components/booking/`, and every API route shares the same `lib/booking-helpers.js` for computing delivered/pending tubes and delivery dates — so a bugfix or a business-rule change (like the 30-day window) only needs to happen in one place.

---

## Getting Started

### Requirements

- [Node.js](https://nodejs.org) v18 or higher
- A free [MongoDB Atlas](https://cloud.mongodb.com) account

### 1. Enter the project folder

```bash
cd miru-bookings
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up MongoDB Atlas

See the [MongoDB Atlas Setup](#mongodb-atlas-setup) section below.

### 4. Create your environment file

```bash
cp .env.local.example .env.local
```

Open `.env.local` and paste your MongoDB connection string.

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## MongoDB Atlas Setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and create a free account
2. Create a new **Project**, then create a **Cluster** — choose the free **M0** tier
3. Go to **Database Access** → **Add New Database User**
   - Choose **Password** authentication
   - Use letters and numbers only in your password — avoid `@`, `!`, `#` as these break the connection URL
   - Grant the user **Read and Write to Any Database**
4. Go to **Network Access** → **Add IP Address**
   - Local development: click **Add Current IP Address**
   - Vercel deployment: click **Allow Access from Anywhere** (`0.0.0.0/0`)
5. Back on your cluster, click **Connect** → **Drivers** → select **Node.js**
6. Copy the connection string — it looks like:
   ```
   mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/
   ```
7. Replace `<password>` with your actual password, then paste the full string into `.env.local`

---

## Environment Variables

Your `.env.local` file should contain:

```env
MONGODB_URI=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/miru-bookings?retryWrites=true&w=majority
```

**Important notes:**

- Never commit `.env.local` to Git — it is already excluded in `.gitignore`
- The database name `miru-bookings` at the end of the URI is created automatically on the first write
- If your password contains special characters, encode them:
  - `@` → `%40`
  - `!` → `%21`
  - `#` → `%23`

---

## Running Locally

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Run the production build locally
npm start
```

---

## Deploying to Vercel

Vercel is the recommended platform for this project. **GitHub Pages cannot be used** — it does not support Next.js server-side API routes.

1. Push your project to a GitHub repository (confirm `.env.local` is not committed)
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click **Add New Project** and import your repository
4. In **Environment Variables**, add:
   - **Name:** `MONGODB_URI`
   - **Value:** your full MongoDB Atlas connection string
5. Click **Deploy**

Vercel automatically redeploys every time you push to your main branch.

---

## API Reference

All endpoints are under `/api/`. Booking endpoints return JSON; the report endpoint returns a PDF file.

| Method   | Endpoint                                   | Description                                         |
| -------- | ------------------------------------------- | ---------------------------------------------------- |
| `GET`    | `/api/bookings`                             | Fetch all bookings                                   |
| `POST`   | `/api/bookings`                             | Create a new booking                                 |
| `PUT`    | `/api/bookings/:id`                         | Update a booking by ID                               |
| `DELETE` | `/api/bookings/:id`                         | Delete a booking by ID                               |
| `GET`    | `/api/bookings/:id/deliveries`              | List delivery history for a booking                  |
| `POST`   | `/api/bookings/:id/deliveries`              | Record a new delivery (atomic — can't over-deliver)  |
| `PUT`    | `/api/bookings/:id/deliveries/:deliveryId`  | Edit a single delivery's amount/note (atomic)        |
| `DELETE` | `/api/bookings/:id/deliveries/:deliveryId`  | Remove a single delivery                             |
| `GET`    | `/api/report`                               | Download PDF report                                  |

### Booking object

```json
{
  "id": "664abc123def456",
  "name": "Uwimana Claudette",
  "phone": "250788123456",
  "tubes": 500,
  "bookingDate": "2026-02-26",
  "location": "Musanze",
  "createdAt": "2026-02-26T10:00:00.000Z"
}
```

All five fields (`name`, `phone`, `tubes`, `bookingDate`, `location`) are required when creating or updating a booking.

---

## Customisation

All key business values are defined in `lib/utils.js`:

| What to change           | Where                     | Current value                  |
| ------------------------ | ------------------------- | ------------------------------ |
| Price per tube           | `PRICE_PER_TUBE` constant | RWF 600                        |
| Delivery window          | `getDeliveryDate()`       | 30 days from booking date      |
| Loading cost rate        | `buildWhatsAppMessage()`  | RWF 350 per sack of 60 tubes   |
| WhatsApp message wording | `buildWhatsAppMessage()`  | —                              |
| Excel file name          | `exportToExcel()`         | `Miru_Mushrooms_Bookings.xlsx` |

To rename the database, change `miru-bookings` in your `MONGODB_URI` to any name you prefer — MongoDB will create it automatically.

---

## Troubleshooting

**`Module not found: Can't resolve '@/components/BookingApp'`**
The `jsconfig.json` file is missing from the project root. Create it:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  }
}
```

**`querySrv EBADNAME` error**
Your MongoDB password contains a special character that breaks the URL. Encode `@` as `%40` and `!` as `%21` in the password portion of your connection string.

**`Python was not found` error when downloading the PDF**
You have an old version of `app/api/report/route.js` that used Python. The current version uses jsPDF (pure JavaScript) and needs no Python. Replace the file and run `npm install` again.

**Blank screen after deploying to GitHub Pages**
GitHub Pages does not support server-side code. Use Vercel instead — it is free and requires no extra configuration.

**🟡 Offline (localStorage) badge in header**
MongoDB Atlas is not reachable. Check:

1. `MONGODB_URI` is correctly set in `.env.local` (or in Vercel environment variables)
2. Your IP address or `0.0.0.0/0` is added under MongoDB Atlas → Network Access
3. The username and password in the URI are correct

**Hydration error on first load**
Ensure `components/BookingApp.js` has `"use client"` on the very first line, and that the inline CSS string uses single quotes inside `input[type='date']` rather than double quotes.
