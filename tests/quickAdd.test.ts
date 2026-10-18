import { it, expect } from "vitest";
import { quickAddSelection } from "../src/shared/quickAdd";
import type { Product } from "../src/models";
const product: Product = {
  _id: "shirt",
  name: "Shirt",
  category: "Shirts",
  price: 999,
  variants: [
    { size: "M", color: "Blue", sku: "M-B", stock: 3 },
    { size: "L", color: "Black", sku: "L-K", stock: 2 },
    { size: "XL", color: "Black", stock: 0 },
  ],
};
it("quick add preserves the exact selected variant", () => {
  expect(quickAddSelection(product, "L", "Black")).toEqual({
    kind: "add",
    productId: "shirt",
    selectedSize: "L",
    selectedColor: "Black",
    variantSku: "L-K",
  });
});
it.each([
  ["", ""],
  ["M", "Black"],
  ["XL", "Black"],
])("blocks missing or unavailable selection %s/%s", (size, color) =>
  expect(() => quickAddSelection(product, size, color)).toThrow(),
);
it("does not add unknown inventory", () =>
  expect(() =>
    quickAddSelection(
      { ...product, variants: [{ size: "M", color: "Blue" }] },
      "M",
      "Blue",
    ),
  ).toThrow());
