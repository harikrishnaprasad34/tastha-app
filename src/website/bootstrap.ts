import { websiteOrigin, websitePageUrl, type WebsitePage } from "./pages";

export function websiteBootstrap(page: WebsitePage, identity: string) {
  // Clear the preceding website identity before remote website code is loaded.
  const script = `try {
    const key = 'tastha.native.workspace.identity.v1';
    const identity = ${JSON.stringify(identity).replace(/</g, "\\u003c")};
    if (localStorage.getItem(key) !== identity) {
      localStorage.clear(); sessionStorage.clear();
      document.cookie.split(';').forEach(cookie => {
        document.cookie = cookie.split('=')[0].trim() + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; secure';
      });
      localStorage.setItem(key, identity);
    }
    window.location.replace(${JSON.stringify(websitePageUrl(page))});
  } catch {
    document.body.textContent = 'Website storage is unavailable. Close this screen and retry.';
  }`;
  return {
    html: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#0A0B0E;color:#D4AF37;font:16px sans-serif;padding:24px}</style></head><body>Opening Tastha…<script>${script}</script></body></html>`,
    baseUrl: websiteOrigin + "/",
  };
}
