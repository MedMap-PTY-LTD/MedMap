# MedMap PayFast sandbox evidence

Test date: 15 October 2026. The hosted MedMap checkout was completed using PayFast sandbox virtual funds. The R10.00 booking fee was confirmed by a real PayFast ITN callback and validated by the Render booking service. MedMap showed the booking as Confirmed / Paid. No real money was charged and live payments remain disabled.

The test booking was subsequently cancelled. Its status is `refund_pending` because the integration queues manual refunds rather than executing one. The appointment slot was checked in the hosted booking UI and was available again.

Backend verification: 29 tests passed; booking service TypeScript check passed. Frontend production build passed. The exact callback deployment was `eea96b7`; cleanup UI and documentation were subsequently deployed in `e1407f6`.

## Included evidence

- `payfast-sandbox-checkout.jpg`: hosted PayFast sandbox page showing the R10.00 total.
- `payfast-virtual-payment-success.jpg`: hosted gateway success response.
- `medmap-booking-confirmed.jpg`: MedMap confirmation page after callback validation.
- `render-callback-accepted.json`: sanitized Render health callback status; no customer or booking identifiers.
- `MedMap_PayFast_Sandbox_Verification.pdf`: summary, test results, limits and the three screenshots.

No live PayFast credentials or customer account details are included. This demonstrates sandbox behavior only; it is not a live payment certification.
