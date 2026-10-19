import { describe, expect, it } from "vitest";
import vm from "node:vm";
import {
  websitePages,
  trustedWebsiteUrl,
  externalWebsiteLink,
  websitePageUrl,
  websitePage,
} from "../src/website/pages";
import {
  maxExportBytes,
  parseWebsiteExport,
  websiteExportScript,
} from "../src/website/exports";
import { routeFor } from "../src/navigation/routes";
import { websiteBootstrap } from "../src/website/bootstrap";

const origin = "https://tasthaofficial.vercel.app";
const message = (extra = {}) =>
  JSON.stringify({
    type: "tastha-export",
    nonce: "test",
    mime: "application/pdf",
    name: "Invoice.pdf",
    base64: "JVBERg==",
    ...extra,
  });
describe("website workspace boundaries", () => {
  it("clears website credentials before navigation on native account changes", () => {
    const values = new Map<string, string>();
    const key = "tastha.native.workspace.identity.v1";
    const events: string[] = [];
    const sandbox = {
      localStorage: {
        getItem: (k: string) => values.get(k) || null,
        setItem: (k: string, v: string) => {
          values.set(k, v);
        },
        clear: () => {
          events.push("clear");
          values.clear();
        },
      },
      sessionStorage: { clear() {} },
      document: { cookie: "", body: { textContent: "" } },
      window: { location: { replace: () => events.push("navigate") } },
    };
    const run = (identity: string) => {
      const result = websiteBootstrap(
        websitePage("admin-dashboard")!,
        identity,
      );
      expect(result.baseUrl).toBe(origin + "/");
      vm.runInNewContext(
        result.html.match(/<script>([\s\S]*)<\/script>/)![1],
        sandbox,
      );
    };
    run("account-a");
    values.set("tashta_access_token", "website-token");
    run("account-a");
    expect(values.get("tashta_access_token")).toBe("website-token");
    run("guest");
    expect(values.has("tashta_access_token")).toBe(false);
    expect(values.get(key)).toBe("guest");
    expect(events).toEqual([
      "clear",
      "navigate",
      "navigate",
      "clear",
      "navigate",
    ]);
    const malicious = websiteBootstrap(
      websitePage("home")!,
      "</script><script>evil()</script>",
    );
    expect(malicious.html.match(/<script>/g)).toHaveLength(1);
  });
  it("contains every canonical admin module from AdminPortalRoutes", () => {
    const expected = [
      "dashboard",
      "storefront-content",
      "products",
      "brands",
      "inventory",
      "categories",
      "orders",
      "customers",
      "users",
      "roles",
      "permissions",
      "coupons",
      "ai-stylist",
      "reports",
      "sales-analytics",
      "broadcasts",
      "templates",
      "support",
      "settings",
      "audit-logs",
      "profile",
    ];
    expect(
      websitePages
        .filter((p) => p.group === "Administration")
        .map((p) => p.path)
        .sort(),
    ).toEqual(expected.map((p) => "/admin/" + p).sort());
    expect(new Set(websitePages.map((p) => p.id)).size).toBe(
      websitePages.length,
    );
    for (const page of websitePages)
      expect(trustedWebsiteUrl(websitePageUrl(page))).toBe(true);
    expect(routeFor("Admin")).toBe("/website/admin-dashboard");
    expect(routeFor("WebsitePages")).toBe("/website");
    expect(websitePage("https://evil.example")).toBeUndefined();
  });
  it.each([
    "https://tasthaofficial.vercel.app.evil.test/admin",
    "https://evil.test",
    "http://tasthaofficial.vercel.app",
    "https://user:secret@tasthaofficial.vercel.app",
    "file:///sdcard/token",
    "javascript:alert(1)",
    "data:text/html,test",
    "blob:https://tasthaofficial.vercel.app/file",
    "https://tasthaofficial.vercel.app:444/admin",
  ])("rejects an untrusted top-level URL: %s", (url) => {
    expect(trustedWebsiteUrl(url)).toBe(false);
  });
  it("only allows deliberate safe external links", () => {
    expect(externalWebsiteLink("tel:+919999999999")).toBe(true);
    expect(externalWebsiteLink("upi://pay?pa=merchant%40bank")).toBe(true);
    expect(externalWebsiteLink("javascript:alert(1)")).toBe(false);
    expect(externalWebsiteLink("intent://unsafe")).toBe(false);
    expect(externalWebsiteLink("https://user:secret@example.com")).toBe(false);
  });
  it("accepts a bounded export from the current trusted document", () => {
    expect(
      parseWebsiteExport(
        message({ name: "../../invoice.exe" }),
        origin + "/admin/orders",
        "test",
      ),
    ).toEqual({
      base64: "JVBERg==",
      mime: "application/pdf",
      filename: "------invoice.pdf",
    });
    expect(parseWebsiteExport(message(), origin, "other-nonce")).toBeNull();
    expect(() =>
      parseWebsiteExport(message(), "https://evil.test", "test"),
    ).toThrow();
    expect(() =>
      parseWebsiteExport(message({ mime: "application/x-sh" }), origin, "test"),
    ).toThrow();
    expect(() =>
      parseWebsiteExport(message({ base64: "not*base64" }), origin, "test"),
    ).toThrow();
    expect(() =>
      parseWebsiteExport(
        message({
          base64: "A".repeat(Math.ceil((maxExportBytes * 4) / 3) + 8),
        }),
        origin,
        "test",
      ),
    ).toThrow();
  });
  it("bridges a website blob download and iframe print without reading tokens", () => {
    let click: (event: unknown) => void = () => {};
    const messages: string[] = [];
    const frame = { src: "blob:test" };
    const frameWindow = { print() {} };
    class Frame {
      declare readonly contentWindow: typeof frameWindow;
    }
    Object.defineProperty(Frame.prototype, "contentWindow", {
      configurable: true,
      get: () => frameWindow,
    });
    class Reader {
      result = "data:application/pdf;base64,JVBERg==";
      onload?: () => void;
      readAsDataURL() {
        this.onload?.();
      }
    }
    const sandbox = {
      window: {
        ReactNativeWebView: {
          postMessage: (value: string) => messages.push(value),
        },
        print() {},
      },
      URL: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
      FileReader: Reader,
      HTMLIFrameElement: Frame,
      document: {
        addEventListener: (_: string, fn: typeof click) => {
          click = fn;
        },
        querySelectorAll: () => [frame],
      },
      get localStorage() {
        throw Error("Authentication must not be read");
      },
    };
    vm.runInNewContext(websiteExportScript("test"), sandbox);
    sandbox.URL.createObjectURL();
    // Store a blob using the installed wrapper, rather than accessing native credentials.
    (sandbox.URL.createObjectURL as (blob: unknown) => string)({
      size: 4,
      type: "application/pdf",
    });
    let prevented = false;
    click({
      target: {
        closest: () => ({ href: "blob:test", download: "report.pdf" }),
      },
      preventDefault: () => {
        prevented = true;
      },
    });
    expect(prevented).toBe(true);
    const parsed = parseWebsiteExport(messages[0], origin, "test");
    expect(parsed?.filename).toBe("report.pdf");
    const instance = Object.assign(new Frame(), frame) as Frame & {
      contentWindow: typeof frameWindow;
    };
    instance.contentWindow.print();
    expect(JSON.parse(messages[1]).name).toBe("Tastha-invoice.pdf");
  });
});
