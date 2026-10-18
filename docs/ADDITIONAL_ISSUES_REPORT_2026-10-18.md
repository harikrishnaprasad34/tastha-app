> Historical additional findings. See [implemented corrections and remaining verification](FAST_SHOPPING_EXPERIENCE_2026-10-18.md).

# Additional Tastha app issues — 18 October 2026

## Scope and result

Reviewed `tastha-app/main` at **5aa5ae06eefdcaeb9a4680edbf44e0b023ea8481**, after the previous audit corrections. Website/backend reference: `tastha_official/main` at **bee834f665c6319e699df141d5fee302b46a8563**. Remote refs were checked; all 81 local source-file hashes match the committed app tree.

**Six additional findings: two high priority and four medium priority.** Three defects were reproduced with isolated execution. Three are confirmed code paths/UI omissions; native interaction testing remains outstanding. These findings are separate from the earlier eight. No new product fix, production write or deployment was performed during this review.

## 1. High — profile saving can overwrite refreshed tokens and force logout

**Files:** `src/screens/Account.tsx` lines 324–357; `src/api/session.ts` lines 59–75; `src/api/client.ts` refresh flow.

EditProfile captures `original = session.get()` before its PUT. If that request receives a 401, the API client rotates and stores fresh tokens. After success, EditProfile saves `{...original, user: merged}` with the *current* revision, restoring the consumed refresh token and old access token. Normal refresh does not increment the session revision, so the write is accepted.

**Reproduced:** the real API client/session manager refreshed successfully during profile PUT; the form's save sequence then restored the old token. The next protected request retried the consumed refresh token, received 401 and cleared the session. This directly undermines the persistent-login requirement.

**Fix direction:** profile updates must atomically modify user fields on the current matching account without replacing token fields from an earlier snapshot. Include a regression covering refresh during profile save and a concurrent refresh/storage write.

## 2. High — failed sign-out storage deletion allows session restoration on restart

**Files:** `src/api/session.ts` lines 77–81; `src/screens/Account.tsx` logout around lines 155–188.

`clear()` removes the in-memory session first, then attempts secure-storage deletion. If deletion fails, stored credentials remain. Account logout waits for clear before attempting server revocation, so a deletion failure also skips the revoke request. A fresh session manager can restore the previous account. The current alert suggests closing and retrying, but closing/reopening is precisely the restoration path.

**Reproduced:** saved a session, made storage.remove reject, confirmed the current manager appeared signed out, then created a fresh manager over the same storage. Restore loaded the previous customer.

**Fix direction:** best-effort server revocation must be independent of local deletion success. Use a durable logout marker/retry strategy where supported; communicate an incomplete sign-out accurately. Never claim a successful durable sign-out until the required state is established. Test secure-storage failures and offline restart; do not erase ordinary sessions merely for network failures.

## 3. Medium — address retry after local persistence failure creates duplicates

**Files:** `src/screens/Account.tsx` lines 502–515; `src/state/store.ts` saveAddress; backend `userController.ts` addAddress.

The form first creates the server address, then saves the selected delivery location locally. If local secure storage fails, the catch presents the operation as a save error and leaves the create form open with no retained new address ID. Retrying sends another POST. The backend uses Address.create; this path has no request idempotency key or content deduplication.

**Reproduced:** two form-equivalent sequences using the real Redux saveAddress thunk and a failing local-persistence fixture sent two POSTs and left two addresses in Redux. No live customer records were created.

**Fix direction:** separate successful server creation from local selection failure. Retain the created ID and retry only the local selection step, or navigate to the saved address with a clear selection warning. Add server idempotency if retrying writes is supported.

## 4. Medium — cold-start address-edit links cannot load their address

**Files:** `src/screens/Account.tsx` AddressForm lines 456–470; `src/app/address-form.tsx`; `src/components/SessionGate.tsx`.

AddressForm reads an existing address only from the in-memory commerce list. When id is supplied and Redux has not loaded addresses, it returns an error with no fetch or retry/navigation control. A restored session opening `/address-form?id=...` therefore cannot edit the address, even though the server owns it. Login return now preserves the ID, but it cannot populate the missing data.

**Reproduction:** clear in-memory commerce state while retaining sign-in, open an address-edit link, and observe the “Open Saved Addresses…” error. Source confirms no load path; device cold-start reproduction remains pending.

**Fix direction:** fetch owned addresses/address on entry, distinguish loading/not-found/network failure, and initialize the form when its target is available. Provide retry and a Saved Addresses action.

## 5. Medium — existing uploaded review photos cannot be removed

**Files:** `src/screens/OrderReview.tsx` submit and photo controls; backend `reviewController.ts` validateBody and upsert-review photo handling.

Every native review submission appends `keepPhotos=true`. “Remove selected photos” clears only newly picked local files. Existing photos are represented by a count/message and cannot be selected for removal. The backend supports keepPhotos=false to remove prior photos when no replacements are supplied. Customers can therefore replace photos but cannot delete all existing ones through the app.

**Reproduction:** open an existing photo review, choose no replacements, submit. keepPhotos remains true and the existing server photos are retained. This is a confirmed payload/UI gap; no live review was modified during the audit.

**Fix direction:** present existing-photo previews and an explicit remove-existing-photos option; map the user's choice to keepPhotos. Preserve revision checks and authenticated image access.

## 6. Medium — review pagination can display the wrong current page

**Files:** `src/components/ProductReviews.tsx`; backend `reviewController.ts` publicProductReviews.

The backend clamps requested pages to safePage and returns `pagination.page`. The native component reads total/totalPages but ignores returned page. If the review count shrinks while the user is on a later page, requesting page 3 can return page 2. The app continues showing 3 / 2; pressing Previous requests page 2 again and repeats the same reviews.

**Reproduction fixture:** request page 3, return pagination `{page:2,totalPages:2,total:15}` with page-2 data. Native state stays page=3 because the response handler never updates it. This is a source-confirmed response-contract mismatch; no rendered-device pagination test was run.

**Fix direction:** reconcile pagination.page with request identity and handle changing totals. Test a moderation/count reduction while browsing later pages.

## Verification and outstanding rollout

- 119 existing tests plus three new isolated audit probes: **122 passed across nine files**. The probes assert the current defects for reproduction; they are not acceptance tests for fixed behavior.
- App TypeScript and lint checks were rerun for this report.
- No native device/emulator, signed build, rendered screenshot comparison, real OTP, real payment or customer mutation was used.
- Backend saved-look PR #22 remains **open, draft and unmerged**. Exact-variant saved-look creation remains capability-gated until its backend is deployed. This is the previously disclosed dependency, not a new seventh finding.
- Prior reports' wider feature/configuration gaps were not certified resolved by this review.

## Recommended priority

Fix findings 1 and 2 first because they affect durable authentication and sign-out. Next resolve address creation/recovery (3–4), then review editing/pagination (5–6). Validate each with controlled authenticated Android/iOS fixtures and storage/network failure injection before release sign-off.
