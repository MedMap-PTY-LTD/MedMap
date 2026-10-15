"use strict";
// src/client/payfastClient.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBookingAndPay = void 0;
async function createBookingAndPay(booking) {
    // 1. Call your backend to create booking + get PayFast form
    const response = await fetch('/api/bookings/create-with-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking),
    });
    const data = await response.json();
    if (data.error) {
        throw new Error(data.error);
    }
    // 2. PayFast returns formHtml — inject and auto-submit
    //    This redirects the user to PayFast's hosted checkout
    if (data.formHtml) {
        const container = document.createElement('div');
        container.innerHTML = data.formHtml;
        document.body.appendChild(container);
        // The form auto-submits via its embedded <script>
    }
    else if (data.paymentUrl) {
        // Fallback: direct redirect
        window.location.href = data.paymentUrl;
    }
}
exports.createBookingAndPay = createBookingAndPay;
//# sourceMappingURL=payfastClient.js.map