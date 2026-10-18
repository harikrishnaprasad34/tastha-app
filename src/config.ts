const raw =
  process.env.EXPO_PUBLIC_API_URL ||
  "https://tastha-backend.onrender.com/api/v1";
const parsed = new URL(raw);
if (
  parsed.protocol !== "https:" ||
  parsed.username ||
  parsed.password ||
  parsed.search ||
  parsed.hash
) {
  throw new Error(
    "Tastha requires an HTTPS API URL without credentials or query parameters.",
  );
}
export const API_URL = raw.replace(/\/+$/, "");
export const API_ORIGIN = parsed.origin;
export const WEBSITE = "https://tasthaofficial.vercel.app";
export const colors = {
  background: "#0A0B0E",
  panel: "#121316",
  elevated: "#1c1e23",
  gold: "#D4AF37",
  text: "#f5f3ed",
  muted: "#a9a9b0",
  border: "#303139",
  error: "#ff9095",
};
