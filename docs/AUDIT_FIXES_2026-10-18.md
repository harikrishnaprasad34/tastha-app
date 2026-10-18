# Customer audit fixes — 18 October 2026

App baseline: `8b0d9ab` on main. Website/API reference: `09281e5`.

| Finding | Implemented correction |
| --- | --- |
| F1 terminal checkout lock | Recovery clears a failed attempt only for server FAILED + canRetry false + matching merchant/order references + failed order payment status. Pending/authorized/review/retryable/mismatched/incomplete responses remain persisted. A fresh COD checkout after terminal recovery gets a new idempotency key. |
| F2 search account data | Search state is remounted on customer identity change, including logout; old suggestions/results are not reused. Old async callbacks are aborted on unmount. |
| F3 delivery-aware search | Search sends deliveryPinCode. Its state/request lifetime changes with confirmed PIN. |
| F4 review login return | Protected destinations preserve route-specific review orderId/productId and address/order IDs, excluding unrelated fields. |
| F5 filter routes | Shared catalog query keys and route conversion support brand/minPrice/maxPrice/offersOnly/category/search/sort; controls update route parameters and configured links retain supported filters. |
| F6 stale payment confirmation | PaymentStatus state is keyed by order ID; a different order starts with fresh state. Manual revalidation clears previous confirmation before requesting status. |
| F7 order freshness | Focus and app-active revalidation added to orders, order detail and tracking. Local requests clean up on blur/refresh; Redux orders requests retain existing coalescing. |
| F8 save generated looks | Authenticated customers choose explicit available size/colour pairs for each generated product, save and reopen them. Saved list shows stored size/colour. Account change resets the style draft. Companion backend validates the complete selection atomically against visible products, current stock and active exact variants; prices and ownership come from the server. |

## Backend dependency and rollout

Companion source is on `tastha_official/codex/fix-mobile-saved-look-variants` rebased onto `bee834f` to preserve newer website checkout changes. It adds `variantSelectionVersion: 1` to owned saved-look GET responses and accepts an explicit `selections` array on POST. Existing website items requests remain compatible.

Backend review: https://github.com/harikrishnaprasad34/tastha_official/pull/22 (draft).

The app checks the capability before POST. Until this backend change is reviewed, merged and deployed, exact-variant saving shows an unavailable message and sends no save request. This avoids the older API's first-variant fallback. No backend deployment or database migration was performed in this task.

Signing in from guest style studio returns to the studio; the guest's generated draft is not carried through authentication and must be generated again. This is a remaining continuity improvement, not a claim of guest-draft persistence.

## Verification

- App: 119 tests passed across eight files, including terminal failure followed by fresh COD/new key, preservation of unresolved payments, route/filter round trips, customer/PIN component identity, order-ID component identity and focus/resume cleanup.
- App lint and TypeScript passed; Android and iOS Hermes exports passed (~3.3 MB each).
- Backend: exact selection service strict compilation passed; controller transpilation passed; 10 isolated service/controller tests passed, including authenticated ownership, authoritative prices, unavailable/malformed selections, capability response and legacy payload compatibility.
- The complete backend build/suite and real MongoDB persistence were not run in this partial checkout. Backend tests isolate the controller/models; they do not constitute a deployed integration test.
- No emulator/handset, signed native compilation, native rendered screenshots, actual OTP/customer writes or test-mode gateway settlement was exercised. Device/end-to-end acceptance remains outstanding.

The React review checked state identity, effect cleanup, route allowlists, shared query contracts, exact variant preservation and explicit backend capability handling. Broader previously recorded feature gaps remain outside these eight corrections.
