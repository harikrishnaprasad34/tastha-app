import { describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../src/api/client";
import { loadStorefrontHome } from "../src/api/home";
import { imageUrl } from "../src/shared/catalog";

describe("home recovery", () => {
  it.each([0, 408, 500, 502, 503, 504])(
    "recovers discovery failure %s with independent public sections",
    async (status) => {
      const request = vi.fn(async (path: string) => {
        if (path.startsWith("/home/discovery"))
          throw new ApiError("Unavailable", status);
        if (path.startsWith("/home/categories"))
          return { categories: [{ name: "Shirts", slug: "shirts" }] };
        throw new ApiError("Still unavailable", 503);
      });
      const home = await loadStorefrontHome(
        { request } as unknown as ApiClient,
        "515408",
      );
      expect(home.categories?.[0].name).toBe("Shirts");
      expect(request).toHaveBeenCalledTimes(6);
      expect(
        request.mock.calls.every(([path]) =>
          path.includes("deliveryPinCode=515408"),
        ),
      ).toBe(true);
    },
  );
  it("never fans out after cancellation", async () => {
    const controller = new AbortController();
    const request = vi.fn(async () => {
      controller.abort();
      throw new ApiError("Cancelled");
    });
    await expect(
      loadStorefrontHome(
        { request } as unknown as ApiClient,
        "515408",
        controller.signal,
      ),
    ).rejects.toThrow("Cancelled");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("preserves authorization failures", async () => {
    const request = vi.fn().mockRejectedValue(new ApiError("Denied", 403));
    await expect(
      loadStorefrontHome({ request } as unknown as ApiClient, "515408"),
    ).rejects.toThrow("Denied");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("supports embedded CMS raster images without accepting executable data", () => {
    expect(
      imageUrl("data:image/webp;base64,UklGRg==", "https://example.com"),
    ).toBe("data:image/webp;base64,UklGRg==");
    expect(
      imageUrl("data:image/svg+xml;base64,PHN2Zz4=", "https://example.com"),
    ).toBeUndefined();
    expect(
      imageUrl("data:text/html;base64,PHNjcmlwdD4=", "https://example.com"),
    ).toBeUndefined();
    expect(
      imageUrl("data:image/webp;base64,INVALID!", "https://example.com"),
    ).toBeUndefined();
    expect(
      imageUrl(
        "data:image/png;base64," + "A".repeat(4 * 1024 * 1024),
        "https://example.com",
      ),
    ).toBeUndefined();
  });
});
