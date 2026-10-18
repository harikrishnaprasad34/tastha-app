> Current-reference update: see [18 October post-login parity report](POST_LOGIN_PARITY_2026-10-18.md). This earlier report describes an older snapshot; its missing-API and homepage findings must not be applied to the newer checkout/security reference without rechecking.

# Tastha native app implementation and verification

This report covers the independent `tastha-app` source. The existing web repository and its draft PRs are separate. No production database, backend deployment, payment configuration, webhook, or customer record was changed by this mobile work.

## Repository and delivery

Target: `harikrishnaprasad34/tastha-app`, public, default branch `main`. GitHub metadata confirms the repository exists and reports the authenticated user's push permission. Creating the first README commit was rejected with HTTP 403, `Resource not accessible by integration`. Access was subsequently granted and an initialization commit succeeded on main (2aed84ab1d9ef67b80fa00bb8811dfbc23dc61b7). The prepared source is being uploaded; Android CI results must be checked separately. This is a GitHub API restriction, not an automatic approval-review rejection.

The source ZIP contains application source, dependency lockfile, tests, build workflow and configuration. It excludes node_modules, native build output, local git metadata, credentials and customer data. Generated Android files are reproducible with Expo prebuild. It is not an APK.

## Feature inventory

| Module                                  | Status                                     | Evidence / limits                                                                                                                                                   |
| --------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Independent React Native / Expo project | Implemented and verified                   | Type checks, Android bundle and native generation pass                                                                                                              |
| API/session infrastructure              | Implemented and verified in isolated tests | SecureStore adapter, serialized session writes, refresh coalescing, stale-session guards; device keystore behavior not tested                                       |
| Dynamic homepage                        | Implemented but not verified on device     | Read-only live discovery contract verified; banners open the general catalog rather than deep links                                                                 |
| Product list                            | Partially implemented                      | Native paginated FlatList, deduplication, search/category/sort and errors; back-navigation scroll retention, full filters, suggestions, voice and comparison remain |
| Product detail and stock                | Implemented but not verified on device     | Real product endpoint, exact size/colour selection, stock helper, variant imagery, share; zoom/reviews/delivery details remain                                      |
| Customer login                          | Partially implemented                      | Existing password login and token refresh; registration, OTP, recovery and profile editing remain                                                                   |
| Cart and wishlist                       | Implemented but not verified on device     | Server canonical mutations, quantities/coupon, variant selection before adding; guest cart merge and transactional wishlist-to-cart move remain                     |
| Delivery location                       | Partially implemented                      | Device permission, estimated accuracy, reverse geocoding, manual area/PIN, secure persistence, Redux/header refresh; draggable map and location search remain       |
| Saved addresses                         | Partially implemented                      | Create/list/select with Formik/Yup and backend persistence; edit/delete/default controls remain                                                                     |
| Checkout and Razorpay                   | Implemented but not verified end to end    | Quote validation, provider readiness, native SDK gating, persistent attempt ID, signature verification API, status recovery, COD; no test or live transaction made  |
| Orders                                  | Partially implemented                      | Authenticated history/status; detailed tracking, cancellation, returns, refunds, invoices and reordering remain                                                     |
| Genuine AI try-on                       | Blocked                                    | Live capability returns unavailable; no inference model integrated in this native work. Honest status screen; no photo upload, fake results or collage              |
| Notifications / offline push            | Missing                                    | No test notifications sent                                                                                                                                          |
| Native admin system                     | Missing                                    | Existing web administration is not copied or exposed in the customer app                                                                                            |
| Mobile visual/accessibility QA          | Blocked                                    | No emulator/device available; semantic labels/roles, native controls, safe areas and loading/errors are in source                                                   |
| Android installable APK                 | Blocked                                    | Gradle distribution download failed with Network is unreachable; Android SDK absent                                                                                 |
| iOS binary                              | Blocked                                    | Source support only; no macOS/Xcode/signing environment                                                                                                             |
| App store / production deployment       | Blocked                                    | No signing credentials, device QA, successful native build or store workflow verified                                                                               |

## Files and architectural choices

- `App.tsx`: native root, safe areas, error boundary, bottom tabs, stack/back handling, session/location restore. The small local navigation stack is not a full navigation library and does not yet preserve catalog scroll position on return.
- `src/screens/Shop.tsx`: homepage, native catalog and product selection.
- `src/screens/Account.tsx`: customer password login, sign-out, address creation, location confirmation.
- `src/screens/Commerce.tsx`: bag, wishlist, saved-address selection, order history, checkout, AI capability.
- `src/components/ui.tsx`: Tastha charcoal/gold controls, readable labels and explicit loading/error states.
- `src/state/store.ts`: shared Redux cart/customer/address/catalog/location state. Mutations update the returned cart/wishlist without fetching the entire catalog. Pending request IDs stop older loads overwriting mutation responses.
- `src/api/session.ts`, `client.ts`, `runtime.ts`: secure session persistence, bounded/cancelable API requests, one refresh in flight, account-change protection. Network failures do not automatically retry writes.
- `src/api/checkout.ts`, `nativeCheckout.ts`: attempt persistence, duplicate-click guard, exact amount check, native Razorpay proof and server confirmation. Payment secrets stay on the backend.
- `src/shared/*`: reused size/availability and quote validation from the existing web source, plus native product/image/line helpers. A selected variant without a photo shows an unavailable-photo message instead of another colour's first image.
- `tests/commerce.test.ts`: isolated session, request, catalog, cart race, stock/imagery, pricing and checkout regression tests.
- `app.json`, `eas.json`, `.github/workflows/android.yml`: native identity `com.tastha.app`, foreground location consent and APK build paths.

## Backend/database compatibility

No API, schema, index, migration, seed, data reset or topology change. The client uses existing `/auth/login`, `/auth/refresh-token`, `/auth/logout`, `/products`, `/home/discovery`, `/cart`, `/wishlist`, `/users/addresses`, `/orders/my-orders`, `/orders/create`, `/location/reverse`, `/payment/methods`, `/payment/quote`, Razorpay order/status/verify and AI preview-capability contracts.

Read-only live responses were retrieved for product paging (page=1, limit=1, total=4, hasNextPage=true), homepage (five sections), payment methods and AI capability (available=false). These prove public response shapes only. They do not prove stock reservation, merchant settlement, authenticated ownership, a completed order or native interaction.

Client environment: only `EXPO_PUBLIC_API_URL`, defaulting to the existing HTTPS backend. Tokens and per-account checkout attempts use SecureStore; delivery location is stored under a versioned key. No gateway secret is included. Existing backend static OTP policy is untouched; the native app implements no static OTP bypass.

## Tests and checks

| Check                                              | Outcome                                                         |
| -------------------------------------------------- | --------------------------------------------------------------- |
| Lint check on access retry | FAIL: Expo lint bootstrap generated a config but CLI rejected its installed ESLint version; direct ESLint reported 3 errors / 6 warnings. Temporary lint dependency/config changes were reverted. |
| `npm run typecheck`                                | PASS, zero TypeScript errors                                    |
| `npm test`                                         | PASS, 1 file / 17 tests                                         |
| `EXPO_OFFLINE=1 npm run bundle:android`            | PASS, Android Hermes bundle about 2.1 MB                        |
| `EXPO_OFFLINE=1 npm run build:android`             | PASS, native Android generation                                 |
| `./gradlew assembleRelease --no-daemon`            | FAIL before compilation, Gradle download Network is unreachable |
| Android/iOS device and emulator tests              | NOT RUN                                                         |
| Authenticated live shopping / address / order flow | NOT RUN; no customer credentials or real mutations used         |
| Razorpay transaction                               | NOT RUN; no money moved                                         |
| AI generation                                      | NOT RUN; live provider capability unavailable                   |
| GitHub Actions                                     | NOT RUN; repository write access rejected                       |
| Production npm audit, final                        | 15 high, 0 moderate, 0 low, 0 critical; not clean               |

Initial production audit reported 22 dependency findings: 15 high / 7 moderate. A targeted `xcode -> uuid` override to 11.1.1 removes the moderate chain; native project generation still passes. The remaining high findings originate in `braces` <=3.0.3 and `node-forge` <=1.4.0 through Expo/Metro build tooling. The configured registry reports those as latest versions, so no unverified major downgrade or fabricated patch was applied. These findings require upstream fixes or a separately validated toolchain patch before release. `npm audit --omit=dev` includes Expo CLI dependencies because Expo is a production dependency; this does not by itself establish exploitation in the shipped Hermes bundle.

## Important limitations and next work

1. Grant the GitHub app this new repository and Contents write access; then upload the source and verify the Android workflow. Access was confirmed on the subsequent retry.
2. Build and install the standalone test APK on actual Android devices. The workflow release-mode APK uses debug signing and bundles JavaScript. Store publication needs owned production signing keys and a reviewed release process.
3. Resolve remaining dependency audit findings and validate Razorpay's native module against the exact Expo/RN Android build. Successful JS bundling is not native compatibility evidence.
4. Complete passwordless/registration/recovery, map-pin search, full variant/gallery/reviews, guest cart, invoices/order actions, notifications, accessibility/responsive QA and catalog scroll retention.
5. Test checkout in a verified Razorpay test environment using approved customer fixtures. The source defaults to the existing production API; do not run automated customer/order mutations against it. Backend payment readiness is not proof that every merchant method settles successfully.
6. Integrate a licensed and operational real try-on model/provider before enabling personal-photo uploads. Consent, private storage, retention/deletion and faithful variant rendering remain mandatory.

No feature above is certified production-ready solely by unit tests or successful prebuild. The original full specification remains broader than this initial native customer app.
