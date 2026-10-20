# Native staff workspace — 1.0.4

Reference: tastha_official branch `codex/fix-checkout-order-security`, backend auth controller, admin routes, adminAccess service and dashboardMetrics service.

## Implemented

- Account → Staff workspace opens a native screen, with separate secure staff storage and API client. Customer sessions continue accepting CUSTOMER roles only.
- Password sign-in must return a server-generated admin challenge. The app posts that challenge and the entered WhatsApp OTP to `/auth/verify-admin-otp`; it does not use a static or locally validated code.
- Dashboard, paginated order list and paginated catalog list are read-only. Each refresh checks `/admin/access` before retrieving the selected module. Server role permissions, including wildcard rules, govern views; staff roles alone do not grant access.
- Dashboard shows server metric availability, scope and basis for the last 30 days. Unavailable money/counts remain unavailable; verified zero is shown as zero.
- Search and pagination match the website API. Requests cancel on blur, foreground refresh or parameter changes. Previous records clear before refresh; errors never become a successful empty list.
- Staff sign-out clears staff state independently from customer state and attempts device refresh-token revocation.

## Validation and limits

Local suite: 199 tests; lint and TypeScript checks. Tests cover default customer-role rejection, isolated stores and sign-out, permission checks before data requests, search/page contract, malformed pagination and unknown metrics.

The Android binary and emulator launch checks are run separately in CI; consult their actual outcomes for the pushed commit. No staff credentials were available for live OTP, authorized dashboard, order or catalog device tests. No live admin writes, payments or refunds were performed.

This increment does not implement admin CRUD, fulfillment updates, refund processing, staff/roles/settings management, full CMS parity, push notifications or a complete customer returns flow. Live payment, GPS and every-page physical-device validation remain incomplete. The customer checkout verification rules and WorkManager release constructor protection are retained.
