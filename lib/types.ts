// ─────────────────────────────────────────────────────────────────
// Shared domain types — normalized shapes between API and UI.
// ─────────────────────────────────────────────────────────────────

export interface Delivery {
  id: string;
  tubesDelivered: number;
  deliveredAt: string;
  note: string;
}

export interface Refund {
  id: string;
  tubesRefunded: number;
  amountRefunded: number;
  reason: string;
  refundedAt: string;
}

/** A single payment recorded against a booking. */
export interface Payment {
  id: string;
  amount: number;
  paidAt: string;
  note: string;
}

export interface Booking {
  id: string;
  name: string;
  phone: string;
  tubes: number;
  bookingDate: string;
  /** Imigina yatewe umurama — delivery is due 30 days after this date. */
  inoculationDate: string;
  location: string;
  // Delivery tracking
  tubesDelivered: number;
  tubesPending: number;     // tubesNet - tubesDelivered
  deliveries: Delivery[];
  // Refund tracking
  tubesRefunded: number;
  amountRefunded: number;
  tubesNet: number;         // tubes - tubesRefunded
  refunds: Refund[];
  // Payment tracking
  amountDue: number;        // tubesNet * PRICE_PER_TUBE
  amountPaid: number;       // sum of payments[].amount
  amountBalance: number;    // amountDue - amountPaid
  /** Date the client promised to pay the remaining balance (ISO date string). */
  promisedPaymentDate: string;
  payments: Payment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface BookingFormData {
  name: string;
  phone: string;
  tubes: string | number;
  bookingDate: string;
  inoculationDate: string;
  location: string;
}

export interface DeliveryInput {
  tubesDelivered: number | string;
  note?: string;
}

export interface RefundInput {
  tubesRefunded: number | string;
  amountRefunded: number | string;
  reason: string;
}

export interface PaymentInput {
  amount: number | string;
  paidAt?: string;
  note?: string;
}

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type DataSource = "mongodb" | "localStorage";
