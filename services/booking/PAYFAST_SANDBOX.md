# PayFast sandbox test deployment

The booking service defaults to PayFast sandbox and charges a virtual R10 booking fee. It uses PayFast's public sandbox test account. Live checkout is available only when explicitly selected with `PAYFAST_MODE=live` and separate live credentials are configured. See [PAYFAST_LIVE.md](./PAYFAST_LIVE.md) before enabling it.

On Render, RENDER_EXTERNAL_URL supplies the public callback URL automatically. PUBLIC_BASE_URL may override it for local tunnels. PAYFAST_CLIENT_URL defaults to https://medmap.co.za. It is separate from the general CLIENT_URL setting to prevent a backend URL from being used for the browser return. Firebase Admin credentials remain required for the booking service.

Checkout requires an explicit sandboxTest=true request. Newly created bookings carry isTestBooking=true, paymentEnvironment=sandbox, and a test-only note. Existing non-test bookings cannot enter sandbox checkout. Synthetic contact details are sent to PayFast instead of real patient information.

Public defaults: https://support.payfast.help/portal/en/kb/articles/how-do-i-make-test-payments-in-sandbox-mode-20-9-2022
Render environment: https://render.com/docs/environment-variables

## Local checks

From services/booking:
- npm test
- node node_modules/typescript/bin/tsc --noEmit

From frontend:
- npm run build
- node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit (baseline type errors remain)

## Hosted acceptance

1. Verify /health reports paymentIntegration=payfast-sandbox-v2 and the deployed revision.
2. Use explicitly authorized test accounts and a test doctor; create a clearly labeled test booking.
3. Verify PayFast's sandbox page shows R10.00 and MedMap Booking Fee.
4. Complete the virtual sandbox payment and verify the return page reports confirmed only after ITN validation.
5. Verify booking history retains the sandbox test label.
6. Test cancelled checkout/retry and cancel only the test booking; verify the R10 sandbox refund entry when applicable.

Source IP validation remains enabled. A proxy/tunnel must preserve the actual PayFast sender address. Do not disable that check to make a test pass.

Only custom Firebase admin claims can access refund administration. A profile role string is insufficient.

Live mode is not enabled by this document. Keep `PAYFAST_MODE` unset or set it to `sandbox` while doing sandbox verification.
