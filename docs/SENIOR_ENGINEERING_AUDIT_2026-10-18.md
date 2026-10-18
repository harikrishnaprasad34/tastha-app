> Historical audit findings. See [implemented corrections and remaining rollout requirements](AUDIT_FIXES_2026-10-18.md).

# Tastha app engineering audit — 18 October 2026

## Verdict and exact scope

**The app is not yet equivalent to the current website or ready for parity sign-off.** Two high-priority defects can block purchasing or retain account-specific search information. Passing isolated tests and JavaScript exports do not establish device behavior, completed native compilation, or a successful customer purchase.

Audited app: `harikrishnaprasad34/tastha-app/main` at `8b0d9ab283f01c349af2909f3a906d83430cc93b`.
Website reference: `harikrishnaprasad34/tastha_official/main` at `09281e54525dccc4311aa508c9403af81bec2613`; this is also the previously verified checkout/security reference. Remote refs were checked during this review. All 79 local `src/` file hashes matched the remote app tree. Existing parity reports and app AGENTS.md were reviewed in this session.

This is a targeted source/API-contract audit with isolated reproduction probes. No physical device, emulator, production customer writes, OTP delivery or real-money payments were used. Some findings are source-confirmed behavior paths whose native reproduction remains pending; evidence is identified below.

## Findings

### F1 — P1: terminal failed payment can lock future checkout

**Evidence:** `src/api/checkout.ts` lines 31–57 and 93–98; `src/screens/PaymentStatus.tsx`.

`recover()` deletes persisted attempts only for CONFIRMED + COMPLETED. The current backend paymentController explicitly returns terminal `FAILED, canRetry: false` responses. That terminal result leaves `merchantOrderId` in secure storage. Changing the bag, delivery address, amount or switching to COD then changes the fingerprint; `pay()` throws before sending a new order request. PaymentStatus has no terminal-attempt reset action. Even an unchanged fingerprint cannot retry when the server denies retry.

**Isolated reproduction:** seed a saved attempt; return `{resolution:'FAILED',canRetry:false}`; call recover; attempt COD with a different fingerprint. The probe confirms no storage clear and rejection with “earlier payment needs a status check”. No new payment is sent. This is an availability defect; it does not demonstrate duplicate charging.

**Required fix:** model terminal versus ambiguous states explicitly. Reset only after a definitive server result proving the attempt cannot settle; retain PENDING/AUTHORIZED/REVIEW. Issue a fresh idempotency key for a fresh checkout. Cover late settlement and lost responses before enabling reset.

### F2 — P1: another account's recent-search suggestions can remain visible

**Evidence:** `src/screens/Search.tsx` lines 14–36; public `src/app/search.tsx`.

The suggestions state survives `userId` changes. The new account/guest request does not clear previous `recent` values and its failure is silently ignored. If the search screen remains mounted, Alice loads suggestions, then signs out or Bob signs in, and the replacement request fails, Alice's suggestions remain in the screen state. Existing commerce reset logic does not reset this local state.

**Reproduction to run on device:** load an account's distinctive recent query, change identity, block `/search/suggestions`, and revisit the retained search screen. Source confirms the missing reset; native stack retention determines the precise reproduction path.

**Required fix:** clear account-derived search data immediately on identity change, bind responses to the identity, and handle failed suggestions without retaining previous account data. Test mounted-screen account changes and offline logout.

### F3 — P2: search ignores confirmed delivery PIN

**Evidence:** `src/screens/Search.tsx` lines 38–66; website backend `backend/src/controllers/searchController.ts`.

Search sends only `/search?q=...` and its effect depends on query/retry, not delivery PIN. The backend explicitly reads `deliveryPinCode` and applies delivery blocking. Unlike catalog/home requests, search cannot apply the selected PIN and does not refresh when it changes. This can produce inconsistent search versus catalog results; exact product impact depends on configured delivery rules.

**Required fix:** send confirmed PIN, include it in request identity/dependencies, clear old results on PIN changes and prevent late old-PIN responses from rendering. Validate with two configured coverage fixtures.

### F4 — P2: review destination loses order/product identity through login

**Evidence:** `src/components/SessionGate.tsx` lines 51–63; `src/app/review.tsx` lines 7–24.

RequireCustomer preserves only query field `id`. Reviews require `orderId` and `productId`. Opening `/review?orderId=o1&productId=p1` without a valid session redirects with returnTo `/review`. After authentication the review route shows the fallback instead of the intended item.

**Isolated reproduction:** applying the guard's current parameter whitelist to this route yields login returnTo `/review`. This probe executes the routing helper; a native authentication journey is still required.

**Required fix:** use route-specific typed query allowlists for protected destinations. Preserve review identity without accepting arbitrary external return URLs. Test review and address-form deep links after expiry/login.

### F5 — P2: new catalog filters are dropped from configured links

**Evidence:** `src/navigation/routes.ts` lines 59–72; `src/app/(tabs)/shop.tsx`; `src/screens/Shop.tsx`.

`storeLink` accepts only category/search/sort/maxPrice. The newly supported brand/minPrice/offersOnly filters are discarded, and the shop route does not read them. A CMS link such as `/shop?brand=Tastha&minPrice=500&offersOnly=true` opens the broad catalog. Controls store these values only locally, so a fresh route instance cannot reconstruct the selected state.

**Required fix:** define one validated catalog-query schema shared by route parsing, CMS links, controls and API serialization. Add round-trip tests and preserve scrolling/results for the same query on return from product details.

### F6 — P2: payment-status state is not reset when its order ID changes

**Evidence:** `src/screens/PaymentStatus.tsx` lines 26–77.

The effect reruns on `id` but does not reset order/loading/error/resolution at the start. If the same mounted screen receives a new ID after displaying a completed order and the new request fails, the previous order remains and the heading can still say “Order confirmed”. This is a misleading confirmation path, not proof of an incorrect server order.

**Reproduction:** reuse the screen instance with paid order A, change ID to order B, fail B's request. Native route reuse must be exercised; the retained-state/error behavior follows directly from the component.

**Required fix:** associate displayed data with the requested ID, clear mismatched data before loading, and distinguish cached status from a fresh verification. Test ID changes and retry errors with rendered components.

### F7 — P2: order views do not refresh when returning to them

**Evidence:** `src/screens/Commerce.tsx` Orders effect around lines 425–427 and OrderDetail around 531–556; `src/screens/OrderTracking.tsx` lines 16–39.

Orders/detail/tracking use mount/dependency effects, not focus or app-resume revalidation. Retained screens can show pre-payment/pre-shipment data after returning from another screen or backgrounding. Manual refresh exists on some screens, but it does not provide automatic freshness. Cancellation has server validation, so stale UI alone does not prove an unauthorized cancellation.

**Required fix:** revalidate on focus/resume with cancellation and deduplication. Mark cached data while refreshing; preserve the customer's reading position.

### F8 — P2 parity gap: style generation cannot save a look from the app

**Evidence:** `src/screens/StyleStudio.tsx` generate/refine and rendered actions; `src/screens/SavedLooks.tsx`.

The app can generate/refine an outfit and list/delete saved looks, but has no action to save the newly generated look. The customer cannot complete generate → select exact variants → save → reopen in the app. Existing reports also identify first-variant behavior in the older save contract, so adding a button without a verified exact-variant persistence contract is insufficient.

**Required fix:** agree a backend contract for product/size/colour identity and persist the selected outfit. Verify ownership, unavailable products and round-trip variant fidelity.

## Architecture and test assessment

- Session manager revisions, refresh coalescing, secure token storage and Redux commerce resets are useful safeguards. This review did not establish a new token-exposure defect or a P0 vulnerability.
- Local screen state remains outside account/query identity in several flows. F2 and F6 illustrate why reducer resets alone do not establish customer isolation or freshness.
- Route parameters, filter models and API query serialization have separate allowlists. F4 and F5 demonstrate contract drift; consolidate typed schemas rather than continuing independent string lists.
- Persisted checkout needs an explicit state machine and terminal-state contract. F1 is not safe to solve by indiscriminately deleting all old attempts.
- Help remains policy summaries; guest bag/merge, transactional wishlist-to-bag, richer refunds/returns and native notifications are still incomplete from the prior inventory. These were not re-certified as implemented.

## Verification performed

- Confirmed remote commits and compared all 79 app source hashes: match.
- Existing 107 tests plus two audit reproduction probes: 109 passed across five files. The two new probes assert the observed undesirable behavior; they document defects and are not acceptance tests for fixed behavior.
- Typecheck and lint rerun: both PASS, zero reported errors/warnings.
- Android/iOS bundle exports passed in the preceding implementation turn. Not rerun here because this audit changes no product code. Exports do not equal native compilation or handset acceptance.
- No native rendered component tests, screenshots, force-stop tests or test-mode gateway settlement runs were available. This limits release confidence even when source tests pass.

## Recommended order of work and acceptance

1. Fix F1 and F2 first. Require server-backed terminal-payment fixtures and account-change/offline isolation tests.
2. Fix F3–F6 with route/query identity tests plus rendered-screen tests.
3. Fix F7 and implement F8's contract. Then finish the outstanding parity modules.
4. Run Android and iOS controlled customer journeys: login/expiry/offline/session restore, logout/account change, address CRUD/PIN changes, filters/search, delivered reviews, invoice sharing, COD and Razorpay test-mode cancellation/kill/recovery/webhook settlement.
5. Capture website and native screens for matching customer states and approve visual/accessibility parity separately.

No product fixes or deployments were performed as part of this audit. This report and the isolated audit probes are review artifacts; the remote app remains at the audited commit unless separately changed.
