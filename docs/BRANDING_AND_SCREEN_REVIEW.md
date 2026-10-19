# Branding and screenshot review — 1.0.3

The launcher used the Expo placeholder. It now uses the lion and sword from the official website logo, on Tastha charcoal, with Android adaptive and monochrome variants. The full original website artwork is retained in assets/tastha-logo.png. Source: https://tasthaofficial.vercel.app/favicon.png (same artwork as tastha_official frontend/src/icons/tashta-logo.png).

Public route headers now have readable names, including WhatsApp sign in and Reset password. Empty search adds compact suggestion chips and an Explore all products action. WhatsApp notices preserve the server message and do not claim delivery when it is unconfirmed. The verification form remains available because the backend deliberately returns whatsappDelivered:false for environment-configured static test accounts. Actual delivery exceptions still return an error.

The screenshot response “Use email or username…” is backend HTTP409: multiple users match the phone number. The app explains the registered-email/password fallback. No user records, uniqueness checks, account roles or authentication policy were changed. Account deduplication requires a separate verified backend data repair; retrying an OTP cannot fix ambiguous account ownership. No OTP messages were requested during verification.

Version 1.0.3 / Android code4 requires a full native rebuild to change launcher resources; do not use the JavaScript-only layout repack workflow for this version.

The current official backend requires username during registration. Native signup now collects and normalizes it using the backend rule (3–30 letters, digits or underscores, first character a letter); password sign-in accepts registered email or username. Existing email requests retain their legacy email field. No account was created or signed into during checks.

Generated native resources also exposed a separate default splash image. Installed the SDK58-compatible expo-splash-screen module and configured the official mark on charcoal. Verified the generated Android adaptive icon, splash bitmap and splash background before publishing.
