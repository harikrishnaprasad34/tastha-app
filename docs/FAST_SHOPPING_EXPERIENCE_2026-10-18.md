# Tastha fast-shopping experience — 18 October 2026

Baseline: app `5aa5ae0`. Direction: Zepto-inspired interaction speed while preserving Tastha's charcoal #0A0B0E, panel #121316, gold #D4AF37, serif headings, fashion catalog and existing account/AI/payment modules.

Reference review used Zepto's public location/search/cart/discovery surface at https://www.zepto.com/ and its public product discovery pages. This is a functional interaction reference, not a pixel-match claim or a delivery-speed commitment.

## Implemented

- Compact brand/location header with a clear DELIVER TO label and persistent search.
- Smaller circular category imagery; direct New in, Offers and Saved looks entry points alongside existing configurable campaign/collection rails.
- Product cards expose real brand, current/original prices, actual rupee savings, wishlist control and Add action. Original price appears only when greater than the current price.
- Native bottom quick-add sheet loads current product details and lets customers choose exact size/colour without leaving the collection. It blocks unknown/unavailable inventory and reuses backend cart actions. Guests retain their selected pair when sent to product sign-in return.
- Quick-add failures trigger a bag refresh and direct customers to inspect the bag before adding again. No optimistic order or unverified mutation success is displayed.
- Persistent bag summary above the existing native tab bar on Home, Shop and Wishlist. It uses server cart quantity/amount; final payable amount remains a checkout quote. Native navigation remains responsible for tabs and safe-area insets.
- Native sheet supports scroll, Android close handling and safe-area padding. Handset/large-font/screen-reader interaction still needs verification.

Existing product detail, filters, wishlist, bag, checkout/payment recovery, account, saved addresses, orders/tracking/reviews/invoices, location/map flow and AI modules remain in source. This update does not certify complete website/native feature parity.

## Additional audit corrections included

1. Profile updates now change user fields through a queued session operation that preserves current token fields. Refresh during profile saving no longer restores consumed credentials. The profile phone regex was also corrected to accept normal Indian mobile numbers.
2. Failed secure-session deletion falls back to overwriting credentials with a durable signed-out marker. Restore recognizes that marker. Server logout revocation starts independently of local deletion. If both local deletion and overwrite fail, the app reports incomplete storage cleanup and offers Retry; durable sign-out cannot be guaranteed when all durable writes fail, especially offline.
3. An address-create form retains the server-created ID before local location persistence. Retry updates that address rather than creating another. Cold address-edit routes load owned addresses and provide retry/navigation instead of relying solely on Redux cache.
4. Existing review photos can be explicitly removed with keepPhotos=false; revision checks remain. Review pagination uses the server-returned current page for labels and navigation when totals shrink.

## Verification

- 129 isolated tests passed across ten files. Regression coverage includes exact quick-add payloads, missing/unavailable/unknown stock, token-preserving profile saves, account changes, durable logout fallback, both-storage-operations-fail reporting, and retained address identity.
- TypeScript and lint: PASS, zero errors/warnings.
- Android/iOS Hermes exports: PASS (~3.3 MB each).
- React review covered modal lifecycle, shared server state, exact variant selection, non-nested product actions, safe-area-aware tab composition, account state lifetime and session write serialization.
- No physical device/emulator, signed native compilation or native screenshot/gesture/accessibility test was available. Source tests and JavaScript exports do not establish visual parity.
- No production customer writes, live payments, OTP sends or backend deployment were performed.

## Remaining acceptance work

- Test matching website/native customer journeys and capture screenshots on Android/iPhone, including modal keyboard/large text, tab-bar height and bottom safe areas.
- Validate live delivery coverage, Android Maps key, permission-denied/GPS accuracy and street-level location confirmation with real devices. Current code cannot promise a specific delivery ETA without merchant fulfillment support.
- Backend saved-look PR #22 is still a separate deployment dependency. Exact-variant saving remains capability-gated until that backend is active.
- Complete broader known gaps such as guest-bag merge, transactional wishlist-to-bag, full returns/refunds, push notifications and full published policy content; this pass does not mark them completed.
