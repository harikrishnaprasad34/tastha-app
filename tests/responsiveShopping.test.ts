import { describe, expect, it } from "vitest";
import { shoppingLayout } from "../src/shared/layout";
import { cartLineImage } from "../src/shared/catalog";
import type { CartLine } from "../src/models";
describe("adaptive shopping layouts", () => {
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
