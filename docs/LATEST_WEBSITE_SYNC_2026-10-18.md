# Latest website sync — 18 October 2026

## Verified reference

GitHub branch enumeration returned `main` and `codex/fix-checkout-order-security` for `harikrishnaprasad34/tastha_official`. Both resolved to `09281e54525dccc4311aa508c9403af81bec2613`, “Tighten home closing section and align configured footer contacts”. App baseline: `9db0ee8` on `main`.

Read app AGENTS.md, existing parity reports, current app implementation and current website Contact, publicStoreSettings and storefrontSettings sources. The previous post-login report referenced website `8518631`; this sync uses the newer verified reference above.

## Changes

- Added native Contact Us screen reachable from account, help, homepage and configured `/contact` campaign links.
- Shared Redux public settings state reads the website's `GET /store/settings` contract. Concurrent requests coalesce, focus revalidates, incomplete responses fail validation, failures clear potentially outdated contact details, and internal merchant fields never enter the public DTO.
- Homepage and contact page share current configured email/phone; contact page also shows merchant legal name and address. Contact actions accept only validated mail/tel targets and report failures. Indian phone display matches the latest website formatter.
- Contact form matches website name/email/subject/message validation and trims submissions to `POST /contact`. Confirmation requires both server success and a nonempty reference; errors preserve input. No enquiry was sent during verification.
- Homepage closing copy now matches the latest website's MAKE IT YOURS section, serif text and gold emphasis, adapted to narrow native screens.

## Verification

- Typecheck and lint passed.
- 99 isolated tests passed across three files, including public-settings validation, exclusion of private fields, invalid contact URL handling, concurrent loads, stale-contact removal after failure, and internal contact routing.
- Android Hermes bundle export passed (1,430 modules; approximately 3.3 MB).
- iOS Hermes bundle export passed (1,437 modules; approximately 3.3 MB).
- No emulator or physical handset attached. No signed APK/IPA or visual/device parity claim.

## Remaining parity work

This is an incremental sync, not completion of all website features. The detailed inventory in POST_LOGIN_PARITY_2026-10-18.md remains applicable except that configured contact information and contact submission are now implemented in source. Full policies, catalog filters, guest bag merge, exact saved-look variants, complete returns/refunds, native notifications and the full styling/try-on journey remain. Authenticated device and payment tests and corresponding website/native screenshots remain required.

## Additional shopping features

- Added brand, minimum price, maximum price and offers-only controls using the verified productController.ts query contract. No client-side filtering of a partial catalog. Invalid price ranges do not dispatch catalog requests.
- Added clear-all filters and server total matching count. Old products and pagination are hidden immediately when changing filters until the current request resolves.
- Added expandable product size guides using saved `sizeChart.measurements`, restricted to that product's variant sizes, with inches/centimetres conversion and merchant notes. No generic measurements are substituted when the product has no chart. Unknown source units are not relabeled.
- Verified against website ProductListing.tsx, ProductDetails.tsx and productPresentation.ts at `09281e5`.
- Typecheck, lint and 107 isolated tests passed. Android/iOS Hermes exports passed, approximately 3.3 MB each. Native visual/interaction acceptance is still outstanding. No production customer writes performed.
- Size guide is now implemented; remaining catalog parity includes route persistence for the new filters and any future server-supported size/colour/rating filters. Guest cart merge and the other previously recorded gaps remain.
