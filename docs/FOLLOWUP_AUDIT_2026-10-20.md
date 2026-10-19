# Follow-up module review — 20 October 2026

Reference: tastha_official/codex/fix-checkout-order-security collection routes,
collectionController, collection.service, CollectionsPage and CollectionDetailPage.
Target: tastha-app/main; app version 1.0.2, Android versionCode 3.

## Changes

- Native Collections list/detail routes use `/collections` and
  `/collections/:slug?limit=40&deliveryPinCode=...`. Website collection links no
  longer turn curated membership into an ordinary category filter. Native detail
  displays the server's selection of up to 40 products, matching the website limit;
  it does not claim this is a paginated view of every product in a collection.
- Shared collection responses live in Redux. Identity/request guards discard
  late replies for another edit or PIN. Focus/foreground refresh cancels obsolete
  requests. Denied coverage stays denied; unknown coverage is not set to true.
- Tab, account support and payment selection icons now use scalable native SVG
  paths. Active/inactive tab colours come from navigation, instead of always
  showing white text symbols. New SVG dependency was resolved with Expo SDK 58.
- Checkout refreshes cart, saved addresses, bill and payment options on focus or
  foreground return; it suspends that refresh while a payment is active.
- Recovery rejects a returned order that differs from the persisted merchant order.
  Retry and signature-verification responses must match that identity before an
  attempt can be cleared or returned as paid.
- COD confirmation requires an explicitly accepted server order status. Missing,
  unknown, cancelled and returned states cannot produce "Order confirmed" merely
  because they are not one of two rejection strings.
- APK startup workflow now downloads the artifact from the successful triggering
  build rather than a hard-coded old artifact. It installs/opens the APK on an
  Android emulator and retains crash logs plus a screenshot. This is a startup
  check, not an end-to-end test of checkout or every screen.

## Live read-only observations

On this run `/collections` responded successfully with an empty collection list.
The app must therefore show an honest empty state until collections are published.
`/payment/methods` advertised UPI, CARD, NET_BANKING and COD as enabled.
PIN 501505 availability returned configured=false, serviceable=null,
code=UNCONFIGURED. No coverage setting was changed; no charge or order was created.

## Verification scope

TypeScript, lint and regression tests check collection membership/routing,
request races, payment identity and COD status handling. Final CI/build results
must be checked separately. Emulator startup verifies launch only.

The route inventory now contains 28 customer screen files excluding layouts.
Home, catalog/product/search, bag/wishlist, login/signup/OTP/recovery,
account/profile/security, location/addresses, checkout/payment status,
orders/tracking/reviews, AI/saved looks and contact/help routes remain present.
This inventory is not a claim that each page has passed rendered device testing.

## Still incomplete or unverified

- Native admin dashboard and CRUD modules are not implemented on this branch.
- Dedicated About, careers/blog and full CMS/legal parity remain incomplete.
- Returns/refund and push-notification journeys require further implementation.
- Actual Razorpay success/cancel/retry/restart and refunds have not been exercised.
- Real GPS precision, map keys, address confirmation, accessibility, large text
  and responsive layouts need device acceptance across the customer screens.
- No claim of full Zepto visual parity, all-module completion or live payment
  success is made. The existing Tastha brand is retained.
