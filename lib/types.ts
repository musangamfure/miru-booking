// ─────────────────────────────────────────────────────────────────
// Shared domain types. These describe the NORMALIZED shapes that
// flow between the API and the UI (see lib/booking-helpers.ts on the
// server and lib/api.ts on the client) — not raw Mongoose documents.
// ─────────────────────────────────────────────────────────────────

/** A single recorded delivery against a booking. */
export interface Delivery {
  id: string;
  tubesDelivered: number;
  deliveredAt: string;
  note: string;
}

/** A booking as the UI consumes it — dates are ISO/plain date strings. */
export interface Booking {
  id: string;
  name: string;
  phone: string;
  tubes: number;
  bookingDate: string;
  /** Imigina yatewe umurama — delivery is due 30 days after this date. */
  inoculationDate: string;
  location: string;
  tubesDelivered: number;
  tubesPending: number;
  deliveries: Delivery[];
  createdAt?: string;
  updatedAt?: string;
}

/** Shape of the booking create/edit form (tubes is a string while typing). */
export interface BookingFormData {
  name: string;
  phone: string;
  tubes: string | number;
  bookingDate: string;
  inoculationDate: string;
  location: string;
}

/** Payload accepted by the create/edit delivery endpoints. */
export interface DeliveryInput {
  tubesDelivered: number | string;
  note?: string;
}

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Where a piece of data ultimately came from — used for the offline banner. */
export type DataSource = "mongodb" | "localStorage";
