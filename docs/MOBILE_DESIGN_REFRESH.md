# Mobile storefront refresh

The native app keeps Tastha’s charcoal and gold identity, with the compact shopping hierarchy of mainstream commerce apps: a two-line delivery header, persistent search, proper Ionicons, category artwork, concise campaigns, image-first product rails, and smaller readable typography. Product information remains from Tastha’s public API; no inventory, ratings, delivery estimates, building names, or discounts are invented.

## Native surface coverage

| Surface | Change |
| --- | --- |
| Home | Compact shortcut icons, category artwork/fallback icons, bounded campaign copy, live product rails before budget/occasion content, short support footer |
| Catalog | Filters collapsed initially; two-column cards maintain width even for odd result counts |
| Product, wishlist, search, related products | Shared image-first product cards, real wishlist icons, consistent price hierarchy; existing stock/size confirmation retained |
| Bag | Product thumbnails, compact item information and quantity controls, actionable empty bag |
| Account | Icon-led navigation rows for profile, orders, addresses, saved looks, security, support, website and admin |
| Location | Automatic first-entry detection with OS permission, visible loading/failure states, manual/search fallback, building/road/locality hierarchy, concise two-line header |
| Login, signup, verification, profile, addresses, checkout, orders, tracking, reviews, payment, style studio, help | Shared compact sans-serif typography, form spacing, panels, 46-point minimum buttons, contrast-correct busy indicator; tracking uses vector status icons |
| Website page directory | Icon-led grouped navigation; embedded website/admin content continues to use the live website’s own design |

## Data compatibility fixes

The live website categories contain `data:image/webp;base64,...` images. The previous HTTPS-only image helper discarded them, leaving plain category text. Bounded PNG/JPEG/WebP base64 payloads now work; SVG, HTML, malformed and oversized data payloads remain rejected.

The location API supplies `building`, `road`, `houseNumber`, `neighbourhood` and `suburb`; these fields now participate in address formatting. A reverse-geocoder’s generic nearby `placeName` is not treated as proof of a building. Explicit search selections may use their place name. Native building names that duplicate street/locality/postcode values are excluded. Full addresses remain editable for confirmation; the header shows only a primary title and short secondary line. Manual edits still clear stale coordinates/PINs as before.

## Verification and limits

- Unit tests cover structured/native building/road fallbacks, duplicate parts, compact header, explicit search selections and safe CMS image types, alongside existing commerce/security tests.
- Android release CI captures startup, resume, restart, home, catalog, wishlist, bag, account, search and website/admin sign-in rendering.
- Emulator GPS cannot prove address precision on a physical phone. An actual building name depends on provider coverage and the user must confirm the result.
- Authenticated order/checkout/admin mutations are not exercised without an authorized test account. Existing tests cover their data and security logic; no production orders or payments are made for visual testing.
- The live API reported delivery availability as unconfigured during this audit. The app displays that status and does not bypass checkout eligibility.
- Embedded website/admin pages are not a native redesign; their content remains controlled by `tastha_official` deployments.

## JavaScript-only layout iteration

The first release screenshots exposed cramped tab labels and a campaign that still pushed product cards below the initial viewport. The final layout reserves 64 points plus the safe-area inset for tabs, reduces catalog header spacing, and places live product rails before campaigns.

`android-layout.yml` can build this development APK from the verified native base at commit `bfa624e611887317d2fd5f4b5cdf6c61f66107f3` (artifact 12170007127). It requires unchanged dependencies, native configuration and assets, checks the immutable archive digest and Hermes bytecode version, rejects new native resources, verifies every native/resource file is identical, aligns the APK and verifies the same development signing certificate. The result must pass installed Android launch/resume/restart and page captures before upload. This path is for JavaScript-only layout iteration; normal Android/iOS workflows still perform complete native builds.
