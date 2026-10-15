# PayFast live-mode activation

The application can create live PayFast checkout sessions, but it remains in sandbox mode unless the booking service is explicitly configured for live. The live flow charges the current R10 booking fee. The consultation fee remains payable at the doctor's office.

## Before activation

- Confirm the PayFast merchant account is verified and its live Merchant ID and Merchant Key are available.
- If a security passphrase is enabled in PayFast, use that exact value. The passphrase is optional for this one-time checkout flow; omit `PAYFAST_LIVE_PASSPHRASE` if the PayFast account has none.
- Never paste merchant credentials into chat, commit them, or add them to Netlify. They are read only by the booking backend.
- Live transactions move real money and PayFast fees apply. PayFast documents a ZAR 5 minimum for live payments; the current booking fee is R10.

## Render environment

In the Render Dashboard, open the `medmap-booking-service` service and its Environment page. Set:

| Variable | Value |
| --- | --- |
| `PAYFAST_MODE` | `live` |
| `PAYFAST_LIVE_MERCHANT_ID` | Live Merchant ID from PayFast |
| `PAYFAST_LIVE_MERCHANT_KEY` | Live Merchant Key from PayFast |
| `PAYFAST_LIVE_PASSPHRASE` | The account passphrase, only if one is configured |

Keep the callback and return URL settings already used by the sandbox deployment:

- Browser return: `https://medmap.co.za/payfast/success` and `/payfast/cancel`
- ITN: `https://medmap-f4ob.onrender.com/api/payments/payfast/notify`
- PayFast live checkout and validation use `https://www.payfast.co.za`.

Saving environment variables on Render triggers a deploy/restart unless Save only is selected. The live secrets must be set before the live service starts. The public configuration endpoint exposes only the mode and booking fee, never merchant credentials.

## Release and verification

1. Review the code diff and confirm the merchant values are not in Git.
2. Keep GitHub `main` unchanged until the release is approved. A push to `main` deploys the Netlify frontend and may also trigger Render if its service is set to auto-deploy from that branch; confirm the Render service's Auto-Deploy setting first.
3. Set the four live-mode environment values in Render and deploy the reviewed backend revision.
4. Confirm `GET /health` reports `paymentMode: live` and the `www.payfast.co.za` process/validation origins.
5. Place one clearly identified live test booking only after the merchant owner approves it. It will charge the real R10 booking fee and incur PayFast's normal transaction fee.
6. Confirm the PayFast hosted page, accepted ITN, confirmed booking status, and booking history. If any step fails, return Render to `PAYFAST_MODE=sandbox` and redeploy; do not disable signature, source-IP, or server-side ITN validation.

Returning to sandbox requires setting `PAYFAST_MODE=sandbox` in Render and redeploying. It does not reverse completed live transactions or process refunds. Refunds remain manual in the PayFast merchant dashboard.
