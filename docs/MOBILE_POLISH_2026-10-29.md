# Mobile profile, responsive layout and launcher icon fixes

- Account quick actions for orders, wishlist and help preserve guest sign-in return routes. They stack on narrow displays and large text. Account content is capped at 680 logical pixels.
- The shared header displays the original logo without distortion. Navigation uses the existing SVG icon family.
- Profile forms retain drafts when session/profile data refreshes; guests return to the edit-profile route after login.
- Quick Add is capped at 680 logical pixels on tablets, preserving its existing safe-area padding and variant validation.
- Very narrow shopping widths no longer expand to a minimum of 240px. Product-gallery page widths now match the viewport.
- The original 295x610 brand image remains unchanged. Launcher configuration now uses dedicated 1024x1024 assets. Android foreground is centered with padding to protect the artwork under launcher masks. Existing unused Expo placeholder assets are not referenced.

## Icon provenance

Built-in image editing produced a square gold lion-and-sword icon based on assets/tastha-mark.png. Prompt: preserve the original recognizable emblem and proportions, center the complete design on near-black #0A0B0E, keep safe margins, no text, no border, no rounded outer corners or extra elements. The generated image was resized and packaged into assets/tastha-app-icon.png and assets/tastha-adaptive-foreground.png. This is an AI-rendered adaptation; the original source remains available.

## Validation and limits

TypeScript, lint, test suite, Android/iOS bundle exports, and native-project generation were checked. No emulator/device was available for installed-app visual testing. Bundle export and native-project generation are not signed APK/IPA builds. Launcher icon changes require a new native build and installation; they do not update an already installed app through JavaScript changes alone.

## Profile follow-up

The account hub now separates personal details, shopping, support and legal options. Profile card opens the edit screen; returns and terms have dedicated existing routes. Guest-only and signed-in menu routes are tested. Edit Profile groups personal details and shopping preferences, validates supported styles/sizes and Indian mobile numbers, disables controls during saving, and resets to confirmed saved values. The account profile fetch offers Retry and clears errors when identity changes. Local profile/menu regression suite brings the total to 232 tests. Device visual testing remains pending.

## Profile-icon interaction checks

Component interaction tests render the storefront header and account screen with native primitives and device APIs mocked. They invoke the actual profile-icon, identity-card, quick-action and menu-row callbacks, check guest sign-in return destinations, and verify the sign-out confirmation. The menu also renders completely for 320px, 1.8x text and tablet inputs; these assertions do not prove native visual layout. Nine added tests bring the suite to 241 tests. No additional broken account-menu destinations were found.
