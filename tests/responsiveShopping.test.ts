import { describe, expect, it } from "vitest";
import { shoppingLayout } from "../src/shared/layout";
import { cartLineImage } from "../src/shared/catalog";
import type { CartLine } from "../src/models";
import { actions, buildStore } from "../src/state/store";
import { createSessionManager } from "../src/api/session";
import type { ApiClient } from "../src/api/client";
describe("location prompt across activity recreation", () => {
  const create = () => {
    const session = createSessionManager({
      get: async () => null,
      set: async () => {},
      remove: async () => {},
    });
    return { session, store: buildStore({ api: {} as ApiClient, session }) };
  };
  it("keeps the prompt acknowledgement outside remounted screen state", () => {
    const { store } = create();
    expect(store.getState().ui.locationPrompted).toBe(false);
    store.dispatch(actions.acknowledgeLocationPrompt());
    store.dispatch(actions.resetCatalog());
    expect(store.getState().ui.locationPrompted).toBe(true);
    expect(store.getState().location).toBeNull();
    expect(create().store.getState().ui.locationPrompted).toBe(false);
  });
  it("does not repeat the prompt when customer identity changes in the same app session", async () => {
    const { store, session } = create();
    store.dispatch(actions.acknowledgeLocationPrompt());
    await session.save(
      {
        accessToken: "a",
        refreshToken: "r",
        user: { id: "u1", role: "CUSTOMER", fullName: "Customer" },
      },
      session.revision(),
      true,
    );
    await session.clear();
    expect(store.getState().ui.locationPrompted).toBe(true);
    expect(store.getState().auth.user).toBeNull();
  });
});
describe("adaptive shopping layouts", () => {
  it.each([180, 200, 240, 280])(
    "does not overflow narrow %s pixel viewports",
    (width) => {
      const layout = shoppingLayout(width, 1.8);
      expect(layout.contentWidth).toBeLessThanOrEqual(width);
      expect(layout.carouselWidth).toBeLessThanOrEqual(
        width - layout.padding * 2,
      );
      expect(layout.carouselWidth).toBeGreaterThan(0);
      expect(layout.columns).toBe(1);
    },
  );
  it.each([320, 360, 393, 600, 768, 1024, 1440])(
    "keeps %s logical-pixel layouts within the available space",
    (width) => {
      const layout = shoppingLayout(width);
      expect(layout.contentWidth).toBeLessThanOrEqual(width);
      expect(layout.contentWidth).toBeLessThanOrEqual(1040);
      expect(
        (layout.contentWidth - layout.padding * 2) / layout.columns,
      ).toBeGreaterThanOrEqual(140);
      expect(layout.columns).toBeGreaterThanOrEqual(1);
      expect(layout.columns).toBeLessThanOrEqual(4);
    },
  );
  it("reduces columns for larger system text without disabling scaling", () => {
    expect(shoppingLayout(320).columns).toBe(2);
    expect(shoppingLayout(393).columns).toBe(2);
    expect(shoppingLayout(393, 1.8).columns).toBe(1);
    expect(shoppingLayout(1024).columns).toBe(4);
    expect(shoppingLayout(1024, 1.8).columns).toBe(3);
  });
});
describe("bag thumbnail identity", () => {
  const line: CartLine = {
    _id: "l1",
    quantity: 1,
    price: 200,
    selectedColor: "Black",
    selectedSize: "S",
    product: {
      _id: "p1",
      name: "Shirt",
      price: 200,
      images: ["/red.jpg"],
      variants: [
        { size: "S", color: "Red", sku: "red", images: ["/red.jpg"] },
        { size: "S", color: "Black", sku: "black", images: ["/black.jpg"] },
      ],
    },
  };
  it("shows the selected variant instead of the first colour", () => {
    expect(cartLineImage(line, "https://tastha.example")).toBe(
      "https://tastha.example/black.jpg",
    );
  });
  it("does not invent a photo for an unavailable variant", () => {
    expect(
      cartLineImage(
        { ...line, selectedColor: "Blue" },
        "https://tastha.example",
      ),
    ).toBeUndefined();
  });
  it("prefers the server line SKU when present", () => {
    expect(
      cartLineImage({ ...line, variantSku: "red" }, "https://tastha.example"),
    ).toBe("https://tastha.example/red.jpg");
  });
});
