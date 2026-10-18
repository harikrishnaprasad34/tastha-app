# Shared Android and iOS navigation update

Based on remote main `8aef9b56ec4b84352310845105675a94c91f0d75`; preserves the newer website-parity, profile, location, session and order work.

## Implemented

- Replaced the manual local stack with Expo Router, following AGENTS.md. One route tree serves Android and iOS, retaining catalog tabs while viewing products and using native stack back navigation.
- Protected saved addresses, address creation, checkout, profile editing, order history and order details with the same customer-session gate.
- Preserved CMS category navigation and encoded product/order deep-link IDs. Kept public catalog access available without login.
- Restored session and delivery settings independently. A delivery-storage failure does not suppress an already-restored account.
- Optional first-launch location selection: detect/confirm location or browse without location; no automatic permission request merely from opening the app.
- Shared charcoal/gold UI, iOS keyboard avoidance, platform-compatible serif headings and centered wrapping button labels.
- Payment refresh retains the last bill and selected method while marking options unverified. Refresh failure cannot re-enable payment; the bill must also match the current account, bag and address fingerprint.
- Added a macOS iOS workflow: pod installation and unsigned release-mode simulator compilation. No signing credentials, real-money transactions or customer notifications are used.
- Added reproducible ESLint configuration and SDK-compatible Router packages; pinned react-dom to the same React version to prevent npm peer-resolution conflicts.

## Verification

- TypeScript: passed.
- ESLint: passed with zero errors/warnings. The set-state-in-effect heuristic is explicitly disabled for the catalog/checkout API effects because they deliberately invalidate stale state; location search has one documented suppression for clearing dismissed suggestions.
- Vitest: 52 tests passed in one file, including four shared-route tests; existing session, pricing, inventory, API adapter and checkout coordinator regressions preserved.
- Android Hermes bundle: passed (about 3 MB).
- iOS Hermes bundle: passed (about 3 MB).
- iOS native generation on Linux: passed; this does not compile Objective-C/Swift or CocoaPods.
- Native Android APK and iOS simulator builds: must be checked in GitHub Actions after this commit. No device test, signed iPhone IPA, App Store submission or TestFlight upload claimed.

## Screenshots and remaining scope

The ten supplied screenshots show the Vercel website in Chrome, including a page-load error, loading screen, system account select, overlapping checkout/footer content, bill summary and Razorpay flow. They are not native-device validation. This commit improves native navigation and payment refresh; it does not claim to fix or redeploy those website pages.

The complete website-parity inventory remains in `MOBILE_WEBSITE_PARITY_AUDIT.md`. Full auth recovery/OTP, invoices, tracking, native map, notifications, genuine try-on inference, backend contract verification and on-device visual/accessibility checks remain open. Existing build-tool dependency audit findings are not resolved by this navigation change.
