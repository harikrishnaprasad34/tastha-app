# Tastha App

Independent **React Native / Expo** customer app for Android, with iOS source support. Uses the existing Tastha backend and MongoDB through authenticated APIs; it does not create a second backend or copy customer data.

## Run

Use Node 24, Java 17 and an Android SDK for native builds.

```sh
npm ci
npm run typecheck
npm test
npm run android
```

The default API is the existing Tastha HTTPS endpoint. Override it with `EXPO_PUBLIC_API_URL` before building. This value is public app configuration. Never put Razorpay secrets, database credentials or signing passwords in `EXPO_PUBLIC_*` variables.

Razorpay requires a custom native build. Expo Go cannot load its native module; online payment is disabled there. Payment methods and totals come from the backend. The app never declares an online order paid based solely on the SDK result.

## Android APK

The GitHub Actions workflow checks types/tests, generates Android sources and builds a standalone release-mode **test APK signed with the generated debug key**. Download `tastha-android-development-apk` from a successful Actions run. It includes the JS bundle and does not require Metro. The workflow has not yet run. These test artifacts are not store releases and are not suitable for Play publication. In this public repository, Actions artifacts are visible to people with repository access.

Alternatively, configure an Expo account/project and run `npx eas-cli@latest build --platform android --profile preview` using `eas.json`. This may use paid/external build infrastructure; it has not been invoked here.

Production publication requires an owned signing key, merchant verification, device QA and privacy/store review. Android compilation in the current environment failed because the Gradle distribution was unreachable; no APK has been produced.

## Implemented source

- Dynamic homepage and paginated native product list with search, category and sorting.
- Explicit size/colour selection, selected-variant imagery and stock validation.
- Password login for customer accounts; secure token storage, refresh deduplication and stale-session response protection.
- Canonical backend cart/wishlist mutations, quantities, coupon application and saved addresses.
- Foreground device location with accuracy feedback; editable PIN/area, saved selection and immediate header/catalog refresh.
- Backend-authoritative quote, payment readiness, native Razorpay integration, persistent attempt identity, verification and order recovery checks; COD orders.
- Order history and honest AI capability/unavailable screen.

See [IMPLEMENTATION.md](docs/IMPLEMENTATION.md) for verification, limitations and remaining features. This is an initial native implementation, not a claim that the complete commerce specification is production-ready.

## Shared Android and iOS navigation

Both platforms now use the same Expo Router screens in `src/app/`, with native stacks and persistent tabs. Profile editing, category links and order details are preserved. Account-only routes redirect to sign-in when the session is absent. A first-visit location screen allows users to detect/confirm delivery location or browse without granting permission.

See [Shared mobile navigation verification](docs/SHARED_MOBILE_NAVIGATION.md) for the latest checks. The iOS workflow builds a simulator `.app` without signing; it is not an installable iPhone IPA or TestFlight release.

## Current customer parity update

The app now follows the current checkout/security website branch for post-login return navigation, discovery homepage and account menu. It adds OTP/recovery/security, owned saved looks, address editing, delivery checks/map integration, product reviews, review photos, invoice sharing, catalog outfit curation and payment status recovery. These are source implementations; native end-to-end and visual acceptance remain open.

See [the page-by-page report](docs/POST_LOGIN_PARITY_2026-10-18.md) for exact evidence, test results and blockers, including unconfigured live delivery coverage, unavailable genuine preview inference, Android map configuration and toolchain audit findings.
