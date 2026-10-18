import { describe, expect, it } from "vitest";
import {
  appendCatalogFilters,
  catalogFilterError,
} from "../src/shared/catalogFilters";
import { productSizeGuide } from "../src/shared/sizeGuide";
import type { Product } from "../src/models";
describe("server catalog filters", () => {
  it("encodes supported full-catalog filters without query injection", () => {
    const query = new URLSearchParams();
    appendCatalogFilters(query, {
      search: "",
      category: "",
      sort: "newest",
      minPrice: "0",
      maxPrice: "1500",
      brand: " A&B ",
      offersOnly: true,
    });
    expect(query.get("brand")).toBe("A&B");
    expect(query.get("minPrice")).toBe("0");
    expect(query.get("offersOnly")).toBe("true");
    expect([...query.keys()]).toHaveLength(4);
  });
  it.each([
    ["200", "100"],
    ["-1", ""],
    ["NaN", "100"],
    ["Infinity", ""],
  ])("rejects invalid bounds %s / %s", (minPrice, maxPrice) => {
    expect(
      catalogFilterError({
        search: "",
        category: "",
        sort: "newest",
        minPrice,
        maxPrice,
      }),
    ).toBeTruthy();
  });
  it("clearing filters omits all optional query fields", () => {
    const query = new URLSearchParams();
    appendCatalogFilters(query, {
      search: "",
      category: "",
      sort: "newest",
      maxPrice: "",
    });
    expect(query.toString()).toBe("");
  });
});
describe("stored product size guides", () => {
  const product: Product = {
    _id: "p1",
    name: "Shirt",
    price: 999,
    variants: [{ size: "M", color: "Blue" }],
    sizeChart: {
      unit: "in",
      measurementType: "GARMENT",
      measurements: [
        { size: "M", chest: 40, length: 28, invalid: -2, text: "ignore" },
        { size: "XL", chest: 48 },
      ],
      notes: "Measure flat",
    },
  };
  it("converts actual saved measurements and excludes unrelated sizes", () => {
    expect(productSizeGuide(product, "cm")).toEqual({
      rows: [{ size: "M", chest: 101.6, length: 71.1 }],
      unit: "cm",
      measurementType: "Garment measurements",
      notes: "Measure flat",
    });
    expect(productSizeGuide(product, "in").rows[0].chest).toBe(40);
  });
  it("does not invent a default chart or unit", () => {
    expect(
      productSizeGuide({ ...product, sizeChart: undefined }, "cm").rows,
    ).toEqual([]);
    expect(
      productSizeGuide(
        { ...product, sizeChart: { measurements: [{ size: "M", chest: 40 }] } },
        "cm",
      ).unit,
    ).toBe("");
  });
});
