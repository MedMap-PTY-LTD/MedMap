// src/types/index.ts
export interface BookingSlot {
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  doctorId: string;
  bookingId?: string;
}

export interface RescheduleHistory {
  fromDate: string;
  fromTime: string;
  toDate: string;
  toTime: string;
  rescheduledAt: any;
  reason?: string;
}

// 🔥 Payment status — added 'refund_pending' for PayFast manual refunds
export type PaymentStatus =
  | 'unpaid'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refund_pending'   // 🔥 waiting for admin to process in PayFast dashboard
  | 'refunded';

export interface Booking {
  id: string;
  doctorId: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  doctorName: string;
  doctorSpecialization: string;
  appointmentDate: string;
  appointmentTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  consultationFee: number;
  rescheduleCount: number;
  maxReschedules: number;
  rescheduleHistory: RescheduleHistory[];

  // 🔥 Payment fields (PayFast-aware)
  paymentStatus: PaymentStatus;
  paymentId?: string;          // internal payment record ID
  paymentReference?: string;   // your booking reference sent to PayFast (m_payment_id)
  paymentUrl?: string;         // PayFast hosted checkout URL
  pfPaymentId?: string;        // 🔥 PayFast's transaction ID (pf_payment_id) — needed for manual refunds
  refundReference?: string;    // 🔥 reference from PayFast dashboard when admin processes refund
  refundedAt?: any;            // 🔥 timestamp when refund was marked complete

  createdAt: any;
  updatedAt: any;
  cancelledAt?: any;
  cancellationReason?: string;
  confirmedAt?: any;
  completedAt?: any;
}

export interface DoctorAvailability {
  doctorId: string;
  date: string;
  slots: BookingSlot[];
  updatedAt: any;
}

export interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  revenue: number;
}

// 🔥 Payment types
export interface PaymentIntent {
  bookingId: string;
  amount: number;
  currency?: string;
  customerEmail: string;
  customerName: string;
  description: string;
  paymentMethod?: string;
}

// 🔥 PayFast returns formHtml, not just a URL
export interface PaymentIntentResult {
  paymentId: string;
  paymentUrl: string;
  formHtml?: string;
  status: PaymentStatus;
  error: string | null;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  error: string | null;
}

export interface PaymentRecord {
  paymentId: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;             // 'payfast'
  customerEmail: string;
  customerName: string;
  paymentMethod: string;
  paymentUrl?: string;
  reference: string;            // your m_payment_id
  pfPaymentId?: string;         // 🔥 PayFast's pf_payment_id
  amountGross?: number;         // 🔥 from ITN
  amountFee?: number;           // 🔥 from ITN
  amountNet?: number;           // 🔥 from ITN
  refundId?: string;
  refundAmount?: number;
  refundedAt?: string;
  refundReference?: string;     // 🔥 from admin marking refund done
  itnPayload?: Record<string, any>; // 🔥 raw ITN payload for audit
  createdAt: string;
  updatedAt: string;
}

// 🔥 Refund queue item — for admin manual PayFast refunds
export interface RefundQueueItem {
  id: string;
  bookingId: string;
  paymentId?: string;
  pfPaymentId?: string;         // 🔥 needed for PayFast dashboard refund
  amount: number;
  customerEmail: string;
  customerName: string;
  reason?: string;
  status: 'pending_manual_refund' | 'completed' | 'cancelled';
  refundReference?: string;     // 🔥 reference from PayFast after admin refunds
  processedAt?: any;
  createdAt: any;
  updatedAt?: any;
}

// Socket Events
export enum BookingEvents {
  CREATE_BOOKING = 'create:booking',
  RESCHEDULE_BOOKING = 'reschedule:booking',
  CANCEL_BOOKING = 'cancel:booking',
  UPDATE_STATUS = 'update:booking-status',
  GET_SLOTS = 'get:slots',
  GET_BOOKINGS = 'get:bookings',
  GET_UPCOMING = 'get:upcoming',
  GET_STATS = 'get:stats',
  SET_AVAILABILITY = 'set:availability',
  JOIN_DOCTOR = 'join:doctor',
  JOIN_PATIENT = 'join:patient',
  LEAVE_DOCTOR = 'leave:doctor',
  LEAVE_PATIENT = 'leave:patient',

  BOOKING_CREATED = 'booking:created',
  BOOKING_RESCHEDULED = 'booking:rescheduled',
  BOOKING_CANCELLED = 'booking:cancelled',
  BOOKING_UPDATED = 'booking:updated',
  AVAILABILITY_UPDATED = 'availability:updated',
}

// 🔥 Payment socket events
export enum PaymentEvents {
  CREATE_PAYMENT = 'create:payment',
  VERIFY_PAYMENT = 'verify:payment',
  REFUND_PAYMENT = 'refund:payment',
  GET_PAYMENT = 'get:payment',

  PAYMENT_CREATED = 'payment:created',
  PAYMENT_COMPLETED = 'payment:completed',
  PAYMENT_FAILED = 'payment:failed',
  PAYMENT_REFUNDED = 'payment:refunded',
}