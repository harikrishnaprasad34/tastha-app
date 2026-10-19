# Website pages inside Tastha

## Implementation

The native customer experience is retained. Account now includes **All website
pages** and **Admin workspace**. The new directory opens the actual deployed
Tastha website inside an Android/iOS WebView; this is a hybrid integration, not
a native rewrite of the website's administrative forms.

Website reference: `harikrishnaprasad34/tastha_official`,
`codex/fix-checkout-order-security`; route inventory verified from
`frontend/src/routes.js` and `frontend/src/pages/Admin/routes/AdminPortalRoutes.tsx`.
Deployed website origin comes from the existing `WEBSITE` constant.
Unmerged or undeployed website changes are not bundled into the app automatically.

## Administration

All 21 canonical website modules are available:

| Module | Website route |
| --- | --- |
| Dashboard | /admin/dashboard |
| Storefront content: homepage, banners, occasions and categories | /admin/storefront-content |
| Products | /admin/products |
| Brands | /admin/brands |
| Inventory | /admin/inventory |
| Categories | /admin/categories |
| Orders, details and refunds | /admin/orders |
| Customers | /admin/customers |
| Staff and users | /admin/users |
| Roles | /admin/roles |
| Permissions | /admin/permissions |
| Coupons | /admin/coupons |
| AI stylist | /admin/ai-stylist |
| Reports | /admin/reports |
| Sales analytics | /admin/sales-analytics |
| Broadcasts | /admin/broadcasts |
| Templates | /admin/templates |
| Support inbox | /admin/support |
| Settings | /admin/settings |
| Audit logs | /admin/audit-logs |
| Admin profile | /admin/profile |

The website handles sign-in, refresh, sign-out, role guards and backend action
permissions. The native customer sign-in remains customer-only. Website sessions
are independent within the same native account. A local bootstrap clears website
storage before loading remote code whenever the native account identity changes,
including native sign-out. Website sign-out remains available within its own menu.
No native tokens or
passwords are injected into website JavaScript or exposed to the file bridge.

## Customer website coverage

The directory includes shopping/category links, collections, offers, search,
wishlist, bag, checkout, occasion selection, recommendations, perfect look,
complete look, saved looks, profile, profile editing, orders/tracking, change
password, sign-in, signup, OTP, recovery, about, careers, contact, FAQs, and all
published policy pages. Product details, collection details, order details,
tracking, payment success/failure, password-reset links, route aliases and error
states remain reachable through the website's own navigation and workflows.
The app's native menus, cart and session remain separate from the website cart
and session; this integration does not claim synchronization between them.

## Native integration

- Searchable page directory; minimum touch targets and Tastha colors.
- Android hardware back and iOS back gestures, loading state, retry and
  WebView process-recovery handling.
- Top-level navigation stays on the exact HTTPS website origin. External
  HTTPS, telephone, email and UPI links require confirmation; file, JavaScript,
  data and arbitrary intent URLs cannot navigate the main view.
- Website file inputs use the platform WebView picker. Location requests use
  the OS permission flow; no location is requested automatically by the shell.
- Website Blob/data-link exports and iframe PDF print operations are bridged
  to the OS share sheet (which can save or print through installed apps).
  This is not an automatic paper-print operation.
- The bridge verifies its document origin and per-screen nonce, restricts file
  types, validates base64, sanitizes filenames and caps exports at 20 MiB.
  Files are written to cache and removed after sharing.
- Cleartext/mixed content and local file access are disabled. Website sessions
  are not shared with an external browser. Third-party cookies are disabled.

## Acceptance limits

Automated tests cover page inventory, URL boundaries, native route entry,
export validation, Blob downloads and iframe print bridging. Android acceptance
checks native cold launch, resume, restart, directory rendering and the deployed
admin sign-in wall. Authenticated staff CRUD, permissions, financial exports,
file import, location, payment redirects and full customer purchase flows still
require a real authorized test account and test data. No production administrative
records are changed as part of these checks. Android APK and iOS source/native
build results must be checked on the associated PR before distribution.
