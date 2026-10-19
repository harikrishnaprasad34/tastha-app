import { trustedWebsiteUrl } from "./pages";

const extensions: Record<string, string> = {
  "application/pdf": "pdf",
  "text/csv": "csv",
  "text/plain": "txt",
  "application/json": "json",
  "application/zip": "zip",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "image/png": "png",
  "image/jpeg": "jpg",
};
export const maxExportBytes = 20 * 1024 * 1024;
export function parseWebsiteExport(raw: string, source: string, nonce: string) {
  if (
    !trustedWebsiteUrl(source) ||
    raw.length > Math.ceil((maxExportBytes * 4) / 3) + 2048
  )
    throw Error("This download cannot be opened safely.");
  const data = JSON.parse(raw);
  if (data?.nonce !== nonce || data?.type !== "tastha-export") return null;
  if (data.error)
    throw Error(
      "The export could not be prepared. Try a smaller date range or fewer records.",
    );
  const mime =
    typeof data.mime === "string" ? data.mime.split(";")[0].toLowerCase() : "";
  const extension = extensions[mime];
  if (
    !extension ||
    typeof data.base64 !== "string" ||
    !data.base64.length ||
    data.base64.length > Math.ceil((maxExportBytes * 4) / 3) ||
    data.base64.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(data.base64)
  )
    throw Error("This file type or download size is not supported in the app.");
  const stem =
    String(data.name || "Tastha-export")
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 70) || "Tastha-export";
  return {
    base64: data.base64 as string,
    mime,
    filename: stem + "." + extension,
  };
}

export function websiteExportScript(nonce: string) {
  // This bridge only handles files explicitly exported by the website. It never
  // reads credentials or copies website authentication into native storage.
  return `(() => {
    if (window.__tasthaExportInstalled) return true;
    window.__tasthaExportInstalled = true;
    const nonce = ${JSON.stringify(nonce)};
    const maxBytes = ${maxExportBytes};
    const blobs = new Map();
    const post = data => window.ReactNativeWebView.postMessage(JSON.stringify({ ...data, type: 'tastha-export', nonce }));
    const send = (blob, name) => {
      if (blob.size > maxBytes || !blob.size) { post({ error: true }); return; }
      const reader = new FileReader();
      reader.onerror = () => post({ error: true });
      reader.onload = () => post({ name, mime: blob.type, base64: String(reader.result).split(',')[1] });
      reader.readAsDataURL(blob);
    };
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = blob => { const url = create(blob); blobs.set(url, blob); return url; };
    URL.revokeObjectURL = url => { blobs.delete(url); revoke(url); };
    const frameWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
    if (frameWindow && frameWindow.get && frameWindow.configurable) {
      Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
        ...frameWindow,
        get() {
          const win = frameWindow.get.call(this);
          const blob = blobs.get(this.src);
          if (win && blob) { try { win.print = () => send(blob, 'Tastha-invoice.pdf'); } catch {} }
          return win;
        }
      });
    }
    document.addEventListener('click', event => {
      const a = event.target && event.target.closest && event.target.closest('a');
      if (!a) return;
      const href = a.href;
      const blob = blobs.get(href);
      if (blob) { event.preventDefault(); send(blob, a.download || 'Tastha-export'); }
      else if (a.hasAttribute('download') && href.startsWith('data:')) {
        event.preventDefault(); fetch(href).then(r => r.blob()).then(b => send(b, a.download)).catch(() => post({ error: true }));
      }
    }, true);
    const print = window.print.bind(window);
    window.print = () => {
      const frame = [...document.querySelectorAll('iframe')].find(f => blobs.has(f.src));
      if (frame) send(blobs.get(frame.src), 'Tastha-invoice.pdf');
      else print();
    };
    return true;
  })(); true;`;
}
