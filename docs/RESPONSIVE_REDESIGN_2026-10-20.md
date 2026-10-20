# Screenshot-driven shopping redesign — 1.0.5

The supplied Home, Account and Bag screenshots showed large serif titles, a tall common header, full-width account buttons, text-only cart rows and excessive outline treatments. Zepto's official Play listing and shopping screenshots were inspected for compact discovery, category and product patterns. Tastha charcoal and gold remain the palette; catalog and campaign content still use Tastha's APIs.

## Changes

- Shared 22px titles, 17px section headings, 14px body/action text and 13px supporting text. System font scaling remains enabled. Buttons retain at least 44px touch areas and busy indicators have contrast on gold.
- Compact location/search header on discovery tabs; shorter brand/search header on Account and Bag. Smaller consistent SVG navigation icons and gold count badges.
- Home uses compact discovery chips, category tiles with visible image fallbacks, constrained campaign artwork and smaller product carousels. Server campaigns, categories, sections, budgets and occasions remain dynamic.
- Account uses a profile summary and grouped icon rows for all existing destinations, including support and staff workspace.
- Bag uses selected-variant thumbnails, accessible quantity/remove controls, a compact coupon row, bill summary and a checkout footer in normal layout flow. Existing server amounts, stock restrictions and checkout APIs are retained. Checkout is disabled while the bag refreshes or has an error.
- Catalog filters can collapse so products appear sooner. Catalog, wishlist and collection grids adapt between one and four columns; large system text reduces the column count. Content width is capped at 1040 logical pixels. Rotation is enabled.
- Product card image height derives from card width; missing photos show a neutral icon. Wishlist keeps the same heart and variant chooser rather than duplicate stacked buttons.
- Location introductory text is shorter; actual detection, confirmation, PIN and coverage logic are retained.

## Verification boundaries

Local checks: 210 tests, lint and TypeScript. New tests cover narrow/tablet grid calculations, large-font layouts and selected-variant thumbnail identity.

The installed-APK CI check now captures guest Home, Account, Catalog, Bag, Wishlist, staff/customer login, Location and Search, plus 320dp, 1.8x text, landscape and tablet states. These checks require the expected route content and a live app process; screenshots still require visual inspection. Consult the actual CI result for the commit rather than treating this description as evidence of a pass.

Authenticated Bag/Account and real catalog-data visuals cannot be fully certified from guest emulator checks. No live payments, staff OTP, orders or refunds are performed by this visual check. Complete website parity and all physical-device combinations remain unverified.
