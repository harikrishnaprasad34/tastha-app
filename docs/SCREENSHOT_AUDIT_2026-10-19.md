# Screenshot review — 19 October 2026

Reference: tastha_official/codex/fix-checkout-order-security, frontend/src/routes.js,
frontend/src/pages/Checkout/PaymentPage.tsx and backend/src/routes/paymentRoutes.ts.
Target: tastha-app/main.

## Confirmed changes

- Checkout previously hid payment options unless an address, quote and delivery
  availability request all succeeded. Methods now load independently. A failed
  methods refresh leaves advertised choices visible but disabled; it cannot
  authorize payment. Initial method placeholders are disabled until the server responds.
- Missing delivery address now has an actionable bottom CTA. Loading/error states
  for cart and saved addresses are visible and retryable. No local amount is used
  as a payable total. Quote failure invalidates the previous bill for payment.
- Checkout has a compact progress label, separate payment heading and selection
  indicators. Account support links use compact rows and contextual descriptions.
- Location labels retain a distinct native building name before the road/locality.
  Duplicate city/street labels and standalone numeric names are excluded.
- Launcher configuration used Expo's blue template icon. It now uses the existing
  Tastha lion/sword artwork for app, adaptive Android icon and web favicon. Expo
  prebuild generated the Android resources and those were visually inspected.
- Version is 1.0.1 / Android versionCode 2.

## Verification and limits

TypeScript, lint and 171 tests pass. Android Hermes export and Android prebuild
pass. These checks do not certify rendered device behavior or successful payments.
The public /payment/methods endpoint responded with UPI, CARD, NET_BANKING and COD
enabled on this run. No authenticated quote, order, charge or refund was submitted.
Server signature verification, idempotency and recovery protections remain enforced.

## Page inventory / incomplete parity

26 customer route files exist, excluding layouts. Existing tests cover API/session,
Redux and routing contracts; they are not end-to-end tests of each rendered page.

| Module                          | Current evidence / unresolved work                                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home/shop/product/search        | Native routes exist; actual backend data, gestures, filters and layouts still require device acceptance.                                             |
| Bag/wishlist                    | Native routes and reducer/API tests exist; native interactions remain unverified.                                                                    |
| Authentication/profile/security | Native routes and session tests exist; actual OTP/email and restart acceptance remain unverified.                                                    |
| Location/addresses              | Building label regression covered; GPS, reverse lookup and map accuracy require device tests.                                                        |
| Checkout/payment status         | Split loading and missing-address flow fixed; gateway success/cancel/restart require test-mode device acceptance.                                    |
| Orders/tracking/reviews         | Native routes exist; actual cancellation, upload and invoice acceptance remain unverified.                                                           |
| AI/saved looks                  | Native screens exist; server capability and exact-variant output remain unverified.                                                                  |
| Contact/help/policies           | Native screens exist; full published CMS/legal parity remains incomplete.                                                                            |
| Collections/about/careers/blog  | Website routes are present; dedicated native parity remains incomplete.                                                                              |
| Admin                           | No native admin workspace/routes currently exist on main. A web login opened under Dashboard in the screenshot is not a native admin implementation. |
| Returns/refunds/push            | Full native journeys remain incomplete.                                                                                                              |

No claim is made that all modules are fixed, that live payment succeeds, or that
this source audit constitutes Zepto visual parity. The APK must be built from the
new commit and tested, rather than reusing an earlier artifact.

## Confirmed configuration mismatch

Live availability for PIN 501505 returned configured=false, serviceable=null,
code=UNCONFIGURED. The website checkoutService uses catalogDeliveryBlocked, which
blocks configured coverage denials but permits unconfigured rules to continue to
server quote/order validation. Native checkout previously required true and
therefore blocked this case. It now matches the backend only for the explicit
UNCONFIGURED response; unknown coverage stays null and is displayed as unconfirmed.
No merchant coverage settings were changed. Tests cover unconfigured, explicit
nonserviceability, invalid configuration and malformed/missing configuration.
