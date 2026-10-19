import { describe, it, expect, vi } from "vitest";
import { loadCollection, loadCollections } from "../src/api/collections";
import type { ApiClient } from "../src/api/client";
import { collectionsSlice, fetchCollection } from "../src/state/collections";
import { routeFor, storeLink } from "../src/navigation/routes";
const collection = { _id: "c1", slug: "weekend-edit", title: "Weekend edit" };
const product = { _id: "p1", name: "Shirt", price: 233 };
const client = (body: unknown) =>
  ({ request: vi.fn().mockResolvedValue(body) }) as unknown as ApiClient;
describe("native collection membership", () => {
  it("opens curated collection routes instead of a category search", () => {
    expect(storeLink("/collections")).toBe("/collections");
    expect(storeLink("/collections/weekend-edit")).toBe(
      "/collection/weekend-edit",
    );
    expect(routeFor("Collection", "id/with space")).toBe(
      "/collection/id%2Fwith%20space",
    );
    expect(storeLink("/categories/shirts")).toBe(
      "/(tabs)/shop?category=shirts",
    );
  });
  it("uses the website collection endpoint with the confirmed delivery PIN", async () => {
    const api = client({ collection, products: [product, product] });
    const result = await loadCollection(api, "weekend-edit", "501505");
    expect(api.request).toHaveBeenCalledWith(
      "/collections/weekend-edit?limit=40&deliveryPinCode=501505",
      { signal: undefined },
    );
    expect(result.products).toEqual([product]);
  });
  it("does not fall back to unrelated products for a different returned edit", async () => {
    await expect(
      loadCollection(
        client({
          collection: { ...collection, slug: "other" },
          products: [product],
        }),
        "weekend-edit",
        "",
      ),
    ).rejects.toThrow("could not be verified");
  });
  it("preserves a configured delivery denial and hides returned products", async () => {
    const delivery = {
      configured: true,
      serviceable: false,
      message: "Not available",
    };
    const result = await loadCollection(
      client({ collection, products: [product], delivery }),
      "weekend-edit",
      "501505",
    );
    expect(result.products).toEqual([]);
    expect(result.delivery).toEqual(delivery);
  });
  it("does not mark unconfigured delivery as available", async () => {
    const delivery = {
      configured: false,
      serviceable: null,
      code: "UNCONFIGURED",
    };
    const result = await loadCollection(
      client({ collection, products: [product], delivery }),
      "weekend-edit",
      "501505",
    );
    expect(result.delivery?.serviceable).toBeNull();
  });
  it("rejects malformed collection lists and preserves request cancellation", async () => {
    await expect(
      loadCollections(client({ collections: [{ title: "Missing identity" }] })),
    ).rejects.toThrow();
    const api = client({ collections: [collection] });
    const controller = new AbortController();
    expect(await loadCollections(api, controller.signal)).toEqual([collection]);
    expect(api.request).toHaveBeenCalledWith("/collections", {
      signal: controller.signal,
    });
  });
  it("ignores late collection responses after a PIN change", () => {
    const args = { slug: "weekend-edit", pin: "501505" };
    let state = collectionsSlice.reducer(
      undefined,
      fetchCollection.pending("old", args),
    );
    state = collectionsSlice.reducer(state, {
      type: "location/setLocation",
      payload: { pinCode: "500034" },
    });
    state = collectionsSlice.reducer(
      state,
      fetchCollection.fulfilled(
        { collection, products: [product] },
        "old",
        args,
      ),
    );
    expect(state.detail.data).toBeNull();
  });
  it("does not replace the latest edit with an older in-flight response", () => {
    const first = { slug: "weekend-edit", pin: "501505" },
      next = { slug: "new-edit", pin: "501505" };
    let state = collectionsSlice.reducer(
      undefined,
      fetchCollection.pending("first", first),
    );
    state = collectionsSlice.reducer(
      state,
      fetchCollection.pending("next", next),
    );
    state = collectionsSlice.reducer(
      state,
      fetchCollection.fulfilled(
        { collection, products: [product] },
        "first",
        first,
      ),
    );
    expect(state.detail.key).toBe(JSON.stringify(["new-edit", "501505"]));
    expect(state.detail.data).toBeNull();
    expect(state.detail.loading).toBe(true);
  });
});
