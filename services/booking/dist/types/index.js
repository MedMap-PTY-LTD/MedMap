"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentEvents = exports.BookingEvents = void 0;
// Socket Events
var BookingEvents;
(function (BookingEvents) {
    BookingEvents["CREATE_BOOKING"] = "create:booking";
    BookingEvents["RESCHEDULE_BOOKING"] = "reschedule:booking";
    BookingEvents["CANCEL_BOOKING"] = "cancel:booking";
    BookingEvents["UPDATE_STATUS"] = "update:booking-status";
    BookingEvents["GET_SLOTS"] = "get:slots";
    BookingEvents["GET_BOOKINGS"] = "get:bookings";
    BookingEvents["GET_UPCOMING"] = "get:upcoming";
    BookingEvents["GET_STATS"] = "get:stats";
    BookingEvents["SET_AVAILABILITY"] = "set:availability";
    BookingEvents["JOIN_DOCTOR"] = "join:doctor";
    BookingEvents["JOIN_PATIENT"] = "join:patient";
    BookingEvents["LEAVE_DOCTOR"] = "leave:doctor";
    BookingEvents["LEAVE_PATIENT"] = "leave:patient";
    BookingEvents["BOOKING_CREATED"] = "booking:created";
    BookingEvents["BOOKING_RESCHEDULED"] = "booking:rescheduled";
    BookingEvents["BOOKING_CANCELLED"] = "booking:cancelled";
    BookingEvents["BOOKING_UPDATED"] = "booking:updated";
    BookingEvents["AVAILABILITY_UPDATED"] = "availability:updated";
})(BookingEvents || (exports.BookingEvents = BookingEvents = {}));
// 🔥 Payment socket events
var PaymentEvents;
(function (PaymentEvents) {
    PaymentEvents["CREATE_PAYMENT"] = "create:payment";
    PaymentEvents["VERIFY_PAYMENT"] = "verify:payment";
    PaymentEvents["REFUND_PAYMENT"] = "refund:payment";
    PaymentEvents["GET_PAYMENT"] = "get:payment";
    PaymentEvents["PAYMENT_CREATED"] = "payment:created";
    PaymentEvents["PAYMENT_COMPLETED"] = "payment:completed";
    PaymentEvents["PAYMENT_FAILED"] = "payment:failed";
    PaymentEvents["PAYMENT_REFUNDED"] = "payment:refunded";
})(PaymentEvents || (exports.PaymentEvents = PaymentEvents = {}));
//# sourceMappingURL=index.js.map