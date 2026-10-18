# Tastha customer app parity — 18 October 2026

## Reference and scope

- Website reference: `harikrishnaprasad34/tastha_official`, `codex/fix-checkout-order-security`, commit `851863163e62bb4d1d2b59044c0f2d79f7802859`.
- App starting point: `harikrishnaprasad34/tastha-app/main`, commit `cf8f93d1d5759a53843eaae7fea0327e9e0237b8`.
- Delivery target: app `main`, following the user's subsequent instruction. Website source and production configuration are unchanged.
- Read the app's AGENTS.md; inspected website branches and open PRs #3, #8, #12, #18 and #19. Reviewed the unmerged UPI design and Keep me signed in reports and compared their changes. These web fixes are references, not claims that the website has merged/deployed them.
- SDK 58 documentation and installed package types were checked for routing, maps, image selection, secure files and sharing. The React review covered hook ordering, request cancellation, account isolation, accessible controls and shared platform behavior.

**This is source implementation plus isolated verification. Full functional and visual equivalence on Android/iPhone is not established.**

## Confirmed corrections to the old audit

The old audit used `tastha_main`. The requested newer website reference exposes `POST /payment/quote`, `GET /payment/razorpay/order/:merchantOrderId/status`, customer password change, saved looks, review and invoice APIs, and `/home/discovery`. Verification accepts gateway proof and looks up the owned order on the server. The earlier blanket “missing quote/status endpoints” finding does not apply to this reference.

The current website homepage is a configurable discovery page: category rail, campaign hero, budget links, configured product rails, occasions and finale. Earlier promo/newsletter comparisons described the older homepage. The app now follows the discovery structure and CMS data.

## Page and journey inventory

“Implemented” below means source connected to an inspected API contract, not an authenticated device test.

| Page / journey | Current implementation | Remaining verification or gaps |
| --- | --- | --- |
| Password login | Ordinary login opens storefront. Protected screens retain an allowlisted return destination. Product sign-in retains selected size/colour for review. Auth completion dismisses the auth stack. | Native back-stack/device interaction; adding to bag still requires customer confirmation after returning. |
| Session restore / expiry | Native SecureStore session restoration; coalesced refresh scoped to session revision; network errors preserve session; definitive refresh rejection clears it. Retry for startup storage errors. | Real keystore/keychain, force-stop, backgrounding, long-term refresh expiry and server revocation tests. |
| Account switching / logout | Commerce data reset on identity change; protected screen local state remounts by account ID. Stored delivery details have an account owner; another account sees only a general PIN area. Logout includes required bearer authorization for best-effort server revocation. | Offline server revocation cannot be guaranteed. Secure storage failure is reported. |
| Signup | Existing validated registration now follows the same post-authentication return flow. | Real registration and OTP delivery not exercised. |
| WhatsApp sign-in | Native code request and verification using customer `/auth/otp/send` and `/auth/otp/verify`; no embedded codes. | Delivery, expiration, rate limits and actual handset behavior. |
| Password recovery | Registered email, opaque recovery challenge, OTP proof and new-password submission through existing recovery APIs. | Full authenticated/test-account flow. |
| Account overview / profile | Current website menu labels, name/contact card, My Profile, My Orders, Saved Addresses, Saved AI Looks, Security & Sign In, help. Profile refreshes from server on focus; existing editing persists allowed fields. | Native visual comparison, richer website overview statistics and exact spacing. |
| Security & Sign In | Current/new/confirmation form calls `PUT /users/password`; clears local session after successful server password change. | Test-account current-password failure, revocation and subsequent sign-in. |
| Saved AI Looks | Owned list, actual populated products, empty/error/retry, confirmed removal. | Editing/saving a newly curated outfit with exact variant persistence is not implemented; existing saved-look API chooses first variants. |
| Header / tabs | Shared Android/iOS layout; location/search; canonical server bag quantity and wishlist badges; account data cleared when identity changes. | Native icon, large-font, safe-area and screen-reader visual QA. |
| Homepage | Current `/home/discovery`, configured rail order, campaign carousel, CMS imagery/copy, category and budget links, occasions, honest serviceability text. Older APIs are used only on discovery 404. | Recently viewed history is not persisted/sent; matching native screenshots unavailable. |
| Catalog / category / search | Existing deduplicated pagination, categories and search; CTA query filters now reach catalog; maximum price and website sort values supported. | Full website brand/colour/size/rating filters, voice search and scroll retention require more work. |
| Product detail | Existing gallery, stock-aware exact variant selection and related products. Sign-in return keeps selected variant. Public verified reviews with sorting, photo filtering and pagination added. | Size guide, zoom, complete delivery-detail layout and native image QA. |
| Wishlist | Existing canonical server list, removal and navigation to variant selection; tab badge added. | Transactional wishlist-to-bag move and complete website quick actions remain. |
| Bag | Existing backend quantity/remove/coupons, inventory messaging, summary and checkout link; badge reflects canonical quantities. | Guest bag/merge, richer line imagery and exact website sticky layout remain. |
| Addresses | Add/list/select/default/delete plus native edit through owned `PUT /users/addresses/:id`; returned address updates Redux. | Authenticated device CRUD and pin/address synchronization tests. |
| Location | Permission only after user action; cached/fresh GPS with accuracy feedback; search/manual PIN; native draggable/tappable pin; reverse-geocode with stale-result guard; confirmed selection refreshes header/catalog. | Android map needs restricted `ANDROID_GOOGLE_MAPS_API_KEY` and rebuild. iOS uses Apple Maps. Real permission/GPS/map tests not run. |
| Delivery eligibility | Selection consults the server; unknown coverage is not represented as success. Checkout requires explicit server `serviceable: true`. | Live coverage rules are unconfigured, blocking payable checkout until operator setup. |
| Checkout / methods | Backend quote/fingerprint, UPI/card/net banking/wallet-if-configured/COD, one payment CTA; retained summary during refresh; bottom inset respected. | Authenticated quote, native Razorpay and gateway availability must be tested with fixtures. |
| Payment interruption / result | Dedicated server-driven result/status page, persisted attempt recovery without requiring a surviving bag, server-reconciled paid-order response, and same-gateway-order retry only when server explicitly allows it. Unresolved attempts are not overwritten by another bag. | Real app-kill, SDK cancel/fail, webhook timing, terminal-attempt reset and test-mode settlement. Ambiguous attempts stay blocked. |
| Orders / detail / tracking | Existing history/search/filter/detail/cancel and server-state tracking preserved; order result links to these pages. Handles unpopulated product IDs when presenting review actions. | Refresh-on-focus for all order screens, reorder, complete refund views and carrier events/ETA remain. |
| Invoices | Owned invoice preflight refreshes authorization; PDF downloads with bearer header, opens native share sheet and removes temporary cache file. No tokens in public URLs. | Actual PDF, native share lifecycle and test-account ownership tests. |
| Delivered-item reviews | Own-review fetch, rating/text/fit, optional 3 photos, revision-protected update and pending-moderation response. Multipart boundary is set by fetch; authentication refresh preserves the form. | Native photo picker/upload, HEIC handling, moderation and server image processing not exercised. |
| Style studio | Real occasion list, catalog outfit generation and refinement, original product thumbnails, size/budget inputs and product links. No fabricated personal-photo inference shown. | Full replacement/locking/saving/360 journey and genuine try-on remain incomplete. |
| Help / policies / About / Contact | Existing FAQ and policy overviews retained. | Full published policy pages, About/Contact and configured support details remain incomplete. |
| Error / offline / empty states | Existing error boundary, API timeout/cancellation and retry, plus per-screen empty/error/loading states. | Airplane-mode, server-failure, large-font, keyboard and assistive-technology device testing. |
| Notifications | No native push implementation added. | Permission, token registration, delivery and tap routing remain. |

## Verification and evidence

| Check | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS, zero errors/warnings |
| `npm test` | PASS, 96 isolated tests across 2 files |
| `git diff --check` | PASS |
| Android Hermes export | PASS, approximately 3.3 MB |
| iOS Hermes export | PASS, approximately 3.3 MB |
| Android native project generation | PASS |
| iOS native project generation | PASS on Linux; not Xcode compilation |
| Local `assembleRelease` | BLOCKED before compilation: Gradle download reports `Network is unreachable` |
| iOS compiled/signed app | NOT RUN locally: macOS/Xcode unavailable |
| Native device/emulator tests | NOT RUN; no native device/emulator attached |
| Matching website/native screenshots | NOT RUN; no authenticated native render surface; no pixel-parity claim |
| Live customer writes, OTPs, orders, payments, reviews, invoice sharing | NOT RUN; no production customer mutations or real-money transactions performed |
| App-kill payment recovery | Isolated persisted-attempt regressions only; real test-mode app-kill NOT RUN |
| Dependency audit (`npm audit --omit=dev`) | 20 high, 0 critical; release blocker. Root advisories include braces and node-forge through Expo/Metro. Do not apply suggested Expo 44 / RN 0.72 downgrades to SDK 58. |

Read-only live checks of `/home/discovery?deliveryPinCode=500034`, `/location/availability?pinCode=500034` and `/ai-stylist/preview-capability` returned HTTP 200. Discovery exposes current CMS configuration/rails. Delivery reports `configured: false`, `serviceable: null`, `UNCONFIGURED`. Preview capability reports `available: false`, `PREVIEW_UNAVAILABLE`. These checks do not prove authenticated purchase readiness or genuine model inference.

The Android and iOS workflows on `main` provide native compilation attempts after push. A workflow URL alone is not a passing build result. Android checks now include lint. No APK, signed IPA, TestFlight submission or production deployment is certified by this report.

## Release blockers and next work

1. Configure merchant delivery coverage and the restricted Android Maps key; validate the actual deployed API version.
2. Resolve toolchain advisories using a validated SDK-compatible upstream patch.
3. Run controlled authenticated Android/iOS fixtures for account switching, long-lived login, CRUD, review photos, invoice sharing and test-mode payment recovery/webhooks.
4. Finish the remaining source gaps in the inventory: full filters/guest bag, exact saved-look variants, full policies/support, returns/refunds and native notifications.
5. Capture corresponding website and native screens at matching viewport sizes, then fix visual differences and accessibility issues. Device-tested exact parity remains an acceptance requirement.
