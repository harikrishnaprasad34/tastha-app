# Tastha Website ↔ Mobile App Customer Parity Audit

Audit date: 2026-10-18  
Reference: `harikrishnaprasad34/tastha_official` branch `tastha_main` (`frontend/src/routes.js`, homepage components and backend route/controller files).  
Target: `harikrishnaprasad34/tastha-app` branch `main`.

## Definition of parity
Both Android and iOS should offer the same customer journeys, backend data, order/payment safety and premium Tastha visual identity. Native screens should follow the website's information architecture but use platform-appropriate layouts, accessibility and permissions. Passing source builds does **not** establish pixel-perfect or device-tested parity.

## Customer pages and modules

| Website route / area | Native app status | Required parity work |
| --- | --- | --- |
| `/`, `/home` | Improved, partial | Now uses `/home/banners`, `/home/categories`, `/home/trending`, `/home/new-arrivals`, `/home/occasions`. Promo, testimonials/reviews, newsletter and website-level hero treatments remain to be integrated |
| `/shop`, category/collection aliases, `/products` | Partial | Backend pagination normalized; add category rail imagery, recommendation sorting, rating, quick add, wishlist and visibility consistency |
| `/product/:id` | Partial | Current product fetch and variant stock; add related products from backend response, selection-aware galleries, reviews and comparable product details |
| `/wishlist` | Partial | Backend wishlist and variant-selection route; add full website quick actions and product availability |
| `/cart` | Partial | Quantity, remove, coupons; add complete summary and availability messaging and mobile-specific sticky actions |
| `/checkout/address` | Partial | Saved addresses, add/select; separate address-review step, default/delete operations and delivery serviceability |
| `/checkout/payment`, `/checkout/confirm` | **Blocked: backend contract mismatch** | See checkout contract section; do not enable unverified payment fallback |
| `/checkout/success`, `/payment-failed` | Missing dedicated screens | Native confirmation, error/recovery and order receipt |
| `/orders` | Improved | Search, filters and sort added; backend refresh required on focus and after order actions |
| `/orders/:id` | Improved | Authenticated details and confirm-before-cancel added; add item photos, invoices, return flow |
| `/track-order/:id` | Missing | Tracking stage timeline from trusted status and delivered/ETA data |
| `/profile` | Partial | Orders, saved addresses, login and edit link; richer menu and service settings needed |
| `/profile/edit` | Improved | Backend-persisted name/phone/style/size; backend does not support email editing |
| `/changepassword` | Missing | Requires secure account API / reauthentication design |
| `/profile/saved-looks` | Missing | Connect saved look routes and account-specific data |
| `/login` | Partial | Existing password login, secure token storage; website signup/OTP/forgot-password not yet implemented |
| `/signup`, `/otp`, `/forget-password`, `/reset-password` | Missing | Protected rate-limited auth flows and accessible form states |
| `/choose-occasion`, `/ai-recommendations`, `/perfect-look`, `/complete-look` | Missing functional native journey | Current AI screen only reports server capability; do not label as image-generation parity |
| `/search` | Partial via catalog | Dedicated search page, suggestions, history and routing |
| `/about`, `/contact`, `/faq`, `/offers` and policy pages | Missing | Native text content and website-consistent customer support routes |
| `/offline`, `/401`, `/403`, `/404`, `/500`, `/503` | Partial | Robust native offline/errors, protected navigation and recovery |
| Admin (`/admin/*`) | Outside customer app scope | Keep administrator functionality separately authorized; do not bundle staff access into the customer app |

## Backend contract blockers and bugs

1. Homepage: `/home/discovery` was not registered in the examined backend router. Mobile now consumes the actual website CMS endpoints. Public endpoint data is not guaranteed to honor `deliveryPinCode` until server-side filtering is added.
2. Product listing: website backend responds with `pagination.totalPages`, `page`, `limit`, `total`, not `hasNextPage`. The native adapter now derives `hasNextPage` safely.
3. Authentication: backend login expects `email`, refresh expects `token`, and logout expects refresh `token`/`userId`; native requests were aligned.
4. Cart coupons: backend requires `cartId` for apply/remove; native requests were aligned.
5. **Critical checkout blocker:** Examined `backend/src/routes/paymentRoutes.ts` does not expose `POST /payment/quote` or `GET /payment/razorpay/order/:merchantOrderId/status`, yet the native checkout expects both. `createRazorpayOrder` does not return a `merchantOrderId` matching mobile recovery logic; verification expects shipping/address/items as well as the payment proof. Implement and test a single server-authoritative quote, idempotency and status protocol before enabling mobile transactions. No fake quote, hardcoded total, client-side success or forced SDK bypass.
6. Location server fallback can return generic location and a fixed example PIN; the app rejects unverified placeholder PINs but the backend itself should be corrected.
7. Profile website example edit form currently shows static values and a success toast; the mobile edit form instead persists via the existing `PUT /users/profile` endpoint.
8. Live deployment may run a different commit from `tastha_main`; verify deployed server version and API contracts before real-device payment testing.

## Next implementation order

1. Unify secure checkout contracts with backend and add integration tests using test-mode gateway and idempotent retries.
2. Signup, OTP sign-in, password recovery and stable long-lived session behavior on a real Android/iOS device.
3. Shipping-address stage, serviceability, profile addresses (default/edit/delete), order confirmation, payment failure.
4. Product details/gallery/reviews, category filters and suggestions, quick-add + wishlist, image fallback/availability.
5. Order tracking, returns, reorder (with server stock/price validation), invoices and saved looks.
6. AI stylist occasion-to-look-to-outfit workflow, with genuine backend processing and explicit capability errors.
7. Promotions, testimonials, FAQ/legal pages, accessibility, empty/loading/offline states and visual regression screenshots.

## Acceptance tests before release

- Android and iOS: cold launch, reopen after days, refresh/logout, failed network/auth token, orientation/responsive safe areas.
- Location: permission denied/allowed, slow GPS, manual PIN, valid reverse geocoding, selected-address restore and server delivery eligibility.
- Products: empty/one/multi-page listing, filter+sort changes mid-fetch, selected stock variants, product images and wishlist.
- Orders: authenticated fetch, search/status filters, detail error/retry, cancel confirmation, tracking and refund edge cases.
- Checkout: quote matches server totals, test-mode authorized/failed/cancelled payment, signature verification, webhook, duplicate taps and recovery after app kill.
- Build: Android installable APK + signed release path; iOS native Xcode build + signed TestFlight path; real devices and accessibility.

**Status:** A passing CI build verifies a subset of source checks only. It does not certify full website equivalence, deployed backend readiness or native purchase success.
