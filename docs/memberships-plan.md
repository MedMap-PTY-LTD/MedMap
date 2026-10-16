# MedMap payments and memberships plan

**Status:** Phases 1–5 are implemented in the local source. The frontend and booking-service production builds pass. Changes have not been deployed or verified with a live membership subscription or renewal.
**Updated:** 16 October 2026.

## Agreed direction

- Set up both provider and patient memberships, using the benefits in the supplied screenshots.
- Provider Member is **R199/month** and Partner is **R699/month**. The screenshot's old provider prices are superseded.
- Paid patient plans renew every **three months**. Paid provider plans renew monthly.
- Patient booking-fee rules stay as shown. Basic Premium's five free bookings count only when appointments are completed.
- Collect applicable booking fees through PayFast when the appointment is booked; count Basic Premium's free allowance only on completion.
- Basic Premium's five-booking counter resets on each member's three-month renewal date.
- Use **PayFast live payments only**. The user confirms that live PayFast payments have worked.
- Admins will issue account credit as the standard refund method, and may also issue it to compensate an inconvenienced client.
- Booking fees are non-refundable by default. When an exceptional case warrants a refund (for example, the doctor is closed), an admin may credit the patient's account.
- Upgrades take effect after the new plan payment succeeds. The customer pays the full new plan price, and the new billing period starts on that payment date.
- Downgrades take effect at the end of the current billing period; the current tier remains active until then.
- If a renewal payment fails, the membership has a seven-day grace period. Benefits continue during grace, and reminders are sent by email and in-app.
- Work order: **PayFast first, memberships second**, then finish the admin credit flow and final rollout checks.

## Phase 1 — PayFast foundation (implemented locally)

The Render blueprint explicitly sets `PAYFAST_MODE=live` and declares the live merchant values as secrets. The live merchant values still need to be configured in Render before a release. The existing booking-payment checkout and ITN verification remain PayFast based; the patient membership checkout now uses the same live PayFast configuration and validated notification path. The user confirms live PayFast payments have worked.

PayFast recurring billing supports quarterly card subscriptions and requires a passphrase for signatures. The patient membership checkout is restricted to live PayFast and credit-card recurring payments. [PayFast developer documentation](https://developers.payfast.co.za/docs#recurring_billing)

## Phase 2 — Patient memberships (implemented locally)

### Prices and booking fees

| Plan | Price | Renewal | Booking fee |
| --- | ---: | --- | --- |
| Free | R0 | None | R10 per completed booking, collected when booked |
| Basic Premium | R39 | Every 3 months | First 5 completed bookings in the membership period are free; then R8 per booking, collected when booked |
| Premium Plus | R99 | Every 3 months | No booking fee |

### Benefits from the screenshot

| Benefit | Free | Basic Premium | Premium Plus |
| --- | --- | --- | --- |
| Best for | Trying MedMap | Individuals | Families |
| Find and book doctors | Yes | Yes | Yes |
| Booking confirmation | Yes | Yes | Yes |
| Appointment reminders | No | Coming soon | Coming soon |
| Enhanced rescheduling and cancellation | Basic only | Coming soon | Coming soon |
| Full appointment history access | No | Coming soon | Coming soon |
| Family profile, up to 5 people | No | No | Coming soon |
| Priority booking | No | No | Coming soon |
| Priority support | No | No | Coming soon |
| Telemedicine credit each quarter | No | No | Yes — coming soon |

The local implementation has a server-owned patient plan catalog and prices, authenticated PayFast subscription checkout, validated recurring-payment notifications, subscription cancellation, membership status, and server-side booking-fee calculation. The first five Basic Premium bookings are reserved atomically when booked so concurrent bookings cannot exceed the allowance; the completed-booking count advances only when an appointment becomes completed. Canceled and no-show bookings release their reservation. The completed counter resets at each renewal date. Membership-covered booking fees are marked separately from paid fees. No live membership charge was made; deployment and live recurring verification remain outstanding.

Per the user's direction, checkout and booking-fee rules are the Phase 2 scope. Patient appointment reminders, enhanced rescheduling, membership access to full appointment history, family profiles, priority booking, priority support, and telemedicine credit are labeled **coming soon** until those features are implemented.

## Phase 3 — Provider memberships (implemented locally)

### Prices and cycles

| Plan | Price | Renewal |
| --- | ---: | --- |
| Free | R0 | None |
| Member | R199 | Monthly |
| Partner | R699 | Monthly |

### Benefits from the screenshot

| Benefit | Free | Member | Partner |
| --- | --- | --- | --- |
| Best for | Getting started | Growing practices | Busy practices that want the most patients and hands-on help |
| Listed in search | Yes | Yes | Yes |
| Receive patient bookings | Yes | Yes | Yes |
| Booking notifications | Yes | Yes | Yes |
| Profile | Basic: name, specialty, location | Enhanced: photo, bio, services, languages, practice details | Enhanced |
| Calendar and availability tools | Basic | Full | Full |
| Automatic appointment reminders to patients | No | Coming soon | Coming soon |
| Patient reviews and ratings | No | Yes | Yes |
| Booking statistics | No | Basic | Advanced — coming soon |
| Plan badge on profile | No | Member badge | Partner badge |
| Search placement | Standard | Standard | Featured, shown ahead of standard listings |
| Support | Email and in-app help | Priority email and chat | Dedicated support by phone and WhatsApp |
| Booking support from MedMap team | No | No | Yes |
| Assistance with medical aid claims | No | No | Yes — coming soon |
| Featured in MedMap promotions | No | No | Yes |
| Priority telemedicine listing | No | No | Yes — coming soon |

Keep the exact scope of each benefit tied to the selected tier. Do not present benefits marked **coming soon** as available before launch.

Provider checkout uses the live PayFast recurring card flow. PayFast's recurring billing specification assigns frequency `3` to monthly and `4` to quarterly subscriptions. The server owns the Member/Partner prices, subscription status, and billing periods; the PayFast notification handler validates payments and records recurring renewals. Providers can cancel future renewal while retaining benefits through the paid period. [PayFast recurring billing documentation](https://developers.payfast.co.za/docs#recurring_billing)

The public doctor profile carries a server-managed membership summary. Firestore rules prevent provider clients from changing the plan badge or featured flag. Active Member and Partner profiles display their plan badge and enhanced profile details; Free profiles keep the basic name, specialty, and location. Partner providers are queried separately and sorted ahead of standard listings. Free providers get the basic calendar view and can manage appointments; full availability controls and calendar statistics are available to Member and Partner. Booking statistics and reviews/ratings are displayed for paid providers; Free providers see an upgrade prompt instead of these statistics. The dashboard exposes all-booking summary counts and recorded revenue to both paid tiers; its status chart is based on the 50 most recent appointments. Partner advanced statistics, automatic patient reminders, medical aid claims assistance, and priority telemedicine listing remain marked **coming soon**. Partner support and promotion benefits are described in the plan; fulfilling them requires the MedMap team's operational process.

## Phase 4 — Admin-issued account credit

- The admin dashboard has an Account Credits tab. Admins can find patient accounts by email and issue credit as either a refund or service compensation.
- Each grant requires a reason and can include a booking or case reference. The ledger records the administrator, time, amount, balance after the change, reason, and source.
- Credits apply to future booking fees. They are applied automatically at live booking and may cover part or all of the fee; any remaining fee is paid through PayFast. Partial use leaves at least R5 payable to satisfy PayFast's minimum transaction amount. Consultation fees and membership charges are not covered.
- The balance and ledger are server-managed. Ordinary cancellations retain the booking fee. The admin dashboard queues eligible cancellation cases for review; an admin may issue account credit with a reason, or decline the request and retain the fee. This flow does not issue cash refunds through PayFast.
- Credits currently do not expire. Admin access follows the existing Firebase admin claim.

## Phase 5 — Membership lifecycle and booking-fee review (implemented locally)

The approved decisions are implemented locally:

- **Booking-fee refunds:** Keep booking fees for ordinary cancellations. An exceptional case can be placed in the admin credit-review queue; admins can grant account credit with an audited reason or decline the request.
- **Upgrades:** Active members can start an upgrade checkout. The full new plan price is charged, and PayFast confirmation switches the membership immediately and starts a new billing period on that payment date. The previous recurring subscription is then cancelled; failed cancellation attempts are retried by the membership lifecycle sweep.
- **Downgrades:** Keep the current tier through the paid period, then apply the lower tier and price at the next renewal. PayFast is updated with the new amount and run date, and the new plan becomes active after the renewal payment is confirmed.
- **Failed renewals:** Provide seven days of grace after a renewal fails and preserve paid benefits during grace. The service records an in-app notification and attempts an email immediately, then repeats reminders around the grace-period midpoint and final 24 hours. Memberships expire after the grace window if payment has not succeeded.
- **Existing policy retained:** Patient memberships renew every three months; provider memberships renew monthly. Basic Premium's five-booking counter resets on the member's renewal date. Credits remain non-expiring, apply to booking fees only, may combine with PayFast, and require the admin claim.

Reminder emails require `RESEND_API_KEY` and `MEMBERSHIP_EMAIL_FROM`; the sender must be authorized with the email provider. If these settings are missing, in-app reminders are still recorded and the skipped email is logged. The current reminder/expiry sweep runs in the booking service process, so production rollout should confirm it is scheduled reliably on the deployed hosting plan.

## Final rollout checks (before release)

- Confirm live merchant configuration and recurring billing settings; PayFast recurring checkout is card-only.
- Verify PayFast payment notifications, membership status changes, upgrade/downgrade timing, renewal cycles, grace-period expiry, reminder delivery, fee calculations, completed-booking counts, account-credit balances, and admin audit history before rollout.
- Confirm live membership billing end to end before release. No live membership charge has been made from this local implementation.

## Source locations

Source repository: [MedMap-PTY-LTD/MedMap](https://github.com/MedMap-PTY-LTD/MedMap), branch `main`. The local clone is in the `source/` subfolder of this workspace.

Relevant existing files include:

- `frontend/src/pages/Memberships.tsx`
- `frontend/src/pages/doctor/DoctorMemberships.tsx`
- `frontend/src/pages/doctor/DoctorDashboard.tsx`
- `frontend/src/pages/doctor/components/DoctorSearch.tsx`
- `frontend/src/pages/DoctorProfile.tsx`
- `frontend/firestore.rules`
- `frontend/src/pages/MembershipManagement.tsx`
- `frontend/src/client/payfastClient.ts`
- `services/booking/src/services/PatientMembershipService.ts`
- `services/booking/src/services/DoctorMembershipService.ts`
- `services/booking/src/routes/memberships.ts`
- `services/booking/src/services/AccountCreditService.ts`
- `services/booking/src/routes/accountCredits.ts`
- `frontend/src/pages/admin/AccountCredits.tsx`
- `services/booking/src/routes/payfastITN.ts`
- `services/booking/src/services/PaymentService.ts`
- `services/booking/src/routes/payfastITN.ts`

Phase 2 replaces the previous membership checkout path with the live PayFast recurring checkout. The repo's PayFast evidence and setup notes describe the earlier sandbox state; live membership billing has not yet been charged or verified.
