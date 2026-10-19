import { optionalLocationLookup } from "../src/shared/locationLookup";
import { imageUrl } from "../src/shared/catalog";
import { describe, expect, it, vi } from "vitest";
import {
  deliveryHeader,
  describeDetectedPlace,
  locationFromSearchResult,
} from "../src/shared/deliveryLocation";
describe("delivery address presentation", () => {
  it("prefers a supplied building and keeps road and locality for confirmation", () => {
    expect(
      describeDetectedPlace(
        {
          name: "RTR Luxury PG",
          street: "Road No 7",
          district: "Madhapur",
          city: "Hyderabad",
          postalCode: "500081",
        },
        null,
      ),
    ).toEqual({
      label: "RTR Luxury PG, Road No 7, Madhapur, Hyderabad",
      pinCode: "500081",
    });
  });
  it("uses structured website roads without treating a nearby POI name as a building", () => {
    expect(
      describeDetectedPlace(null, {
        placeName: "Nearby cafe",
        road: "Road No 12",
        neighbourhood: "Madhapur",
        city: "Hyderabad",
        pincode: "500081",
      }).label,
    ).toBe("Road No 12, Madhapur, Hyderabad");
  });
  it("uses an explicit building from the location provider ahead of the road", () => {
    expect(
      describeDetectedPlace(null, {
        building: "Lotus Towers",
        road: "Road 2",
        city: "Hyderabad",
      }).label,
    ).toBe("Lotus Towers, Road 2, Hyderabad");
  });
  it("does not mistake a numeric native name or a repeated locality for a building", () => {
    expect(
      describeDetectedPlace(
        { name: "500081", street: "Road 2", postalCode: "500081" },
        null,
      ).label,
    ).toBe("Road 2");
    expect(
      describeDetectedPlace(
        { name: "Madhapur", district: "Madhapur", city: "Hyderabad" },
        null,
      ).label,
    ).toBe("Madhapur, Hyderabad");
  });
  it("shows a compact title and removes repeated address pieces", () => {
    expect(
      deliveryHeader({
        label: "Lotus Towers, Road 2, road 2, Madhapur, Hyderabad, India",
        pinCode: "500081",
      }),
    ).toEqual({
      title: "Lotus Towers",
      subtitle: "Road 2 · Madhapur · 500081",
    });
    expect(deliveryHeader(null).title).toBe("Choose delivery location");
  });
  it("keeps an explicitly selected search building ahead of the road", () => {
    expect(
      locationFromSearchResult({
        placeName: "Lotus Towers",
        road: "Road 2",
        city: "Hyderabad",
        pincode: "500081",
      })?.label,
    ).toBe("Lotus Towers, Road 2, Hyderabad");
  });
});

describe("website CMS category artwork", () => {
  it("accepts embedded raster artwork and rejects executable or oversized data", () => {
    expect(
      imageUrl("data:image/webp;base64,UklGRg==", "https://example.test"),
    ).toBe("data:image/webp;base64,UklGRg==");
    expect(
      imageUrl("data:image/svg+xml;base64,PHN2Zz4=", "https://example.test"),
    ).toBeUndefined();
    expect(
      imageUrl("data:text/html;base64,PHNjcmlwdD4=", "https://example.test"),
    ).toBeUndefined();
    expect(
      imageUrl(
        "data:image/png;base64," + "A".repeat(4 * 1024 * 1024),
        "https://example.test",
      ),
    ).toBeUndefined();
  });
});

describe("bounded location lookup", () => {
  it("returns a successful address and clears its timeout", async () => {
    vi.useFakeTimers();
    try {
      expect(await optionalLocationLookup(Promise.resolve("Road 2"))).toBe(
        "Road 2",
      );
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
  it("releases the form when a native provider stalls or fails", async () => {
    vi.useFakeTimers();
    try {
      const stalled = optionalLocationLookup(new Promise<string>(() => {}));
      await vi.advanceTimersByTimeAsync(7000);
      expect(await stalled).toBeNull();
      expect(
        await optionalLocationLookup(Promise.reject(Error("Provider offline"))),
      ).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
