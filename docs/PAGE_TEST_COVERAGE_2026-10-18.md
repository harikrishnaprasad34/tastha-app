# Customer page coverage — 18 October 2026

Target: tastha-app/main, baseline 9d9692a56473864265f14b785a15758d0c5e591f.

## Inventory and coverage limits

All 26 Expo customer screen files were inventoried. Layout files are excluded.
The existing tests predominantly exercise pure functions, API/session behavior,
Redux operations and identity keys. They do not constitute rendered Android/iOS
end-to-end tests. No physical device or emulator is attached for this review.

| Customer screens | What was checked | Still missing |
| --- | --- | --- |
| Home, Shop, Product, Wishlist, Bag, Account | Navigation destinations; existing catalog, variant, cart, wishlist and session tests | Rendered lists, rapid taps, focus/back behavior, large text and screen-reader acceptance |
| Login, Signup, OTP, Recovery, Security | Destination files and existing authentication/session contracts | Actual form interactions, OTP delivery/expiry, password recovery and device restart |
| Edit profile, Addresses, Address form, Saved looks | Destinations and existing profile/address/session regression tests | Cold links and native keyboard/forms; saved-look backend capability acceptance |
| Orders, Order detail, Tracking, Review, Payment status | Destinations, encoded identifiers and existing order/payment logic | Native cancel/reorder/review upload/invoice interactions; payment SDK lifecycle |
| Checkout | Destination and existing quote/payment safety tests | Native gateway test-mode success/cancel/retry and kill/reopen recovery |
| Search | Destination and existing account/PIN identity test | Debounce, malformed responses, keyboard and result interactions |
| Location | Destination and existing location validation logic | Permission denied, real GPS/pin drag/reverse lookup, Android Maps configuration |
| Style studio | Destination | Generation/refinement failure, pending-input changes, saved variant selection |
| Contact | Destination and existing public settings validation | Form keyboard, submission validation and error preservation on device |
| Help | All five policy overview selectors; malformed deep-link regression | Full published policy parity; native accessibility/navigation |

## Confirmed fixes

1. CMS /offers links previously opened ordinary Shop with no offersOnly flag.
   The native link adapter now forces offersOnly=true for /offers, preserves
   allowed sorting, and leaves ordinary shopping unchanged.
2. Help used JavaScript's inherited-property membership check. Sections such as
   constructor, toString and __proto__ were treated as page objects and could
   crash when reading their sections. Only own policy keys are now accepted;
   unknown sections fall back to FAQ.

New regressions cover all named navigation destinations, encoded product/order
identifiers, five policy selectors and invalid help/offer links. These are route
and component-logic tests, not native gesture or visual tests.

## Missing website journeys

- No dedicated native About or collection-detail route. Collection campaign
  links currently map to a category filter, which is not equivalent to a CMS
  collection's membership. This needs a separate implementation.
- Full published legal policies, guest-bag merge, full returns/refunds and push
  notification journeys remain incomplete.
- Exact-variant saved-look creation remains dependent on backend capability.
- Passing test/bundle checks does not certify live API configuration, GPS
  accuracy, payment completion, native visual parity or production readiness.

## Validation

Full suite: 166 tests passed across 11 files. TypeScript and lint passed
with zero lint warnings. Android and iOS Hermes bundle exports passed
(approximately 3.3 MB each). No device interaction tests were run.
