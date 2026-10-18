import { it, expect, vi } from "vitest";
import { createCheckout, isTerminalUnpaid } from "../src/api/checkout";
import type { ApiClient } from "../src/api/client";
import {
  catalogRouteFilter,
  catalogRouteParams,
} from "../src/shared/catalogFilters";
import { storeLink } from "../src/navigation/routes";
import { protectedReturnTo } from "../src/navigation/authReturn";
it.each(["PENDING", "AUTHORIZED", "REVIEW"])(
  "preserves unresolved %s payment attempts",
  async (resolution) => {
    const clear = vi.fn();
    const api = {
      request: vi.fn().mockResolvedValue({ resolution, canRetry: false }),
    } as unknown as ApiClient;
    const checkout = createCheckout(
      api,
      {
        read: async () => ({
          merchantOrderId: "T1",
          fingerprint: "f",
          idempotencyKey: "old",
        }),
        write: vi.fn(),
        clear,
      },
      () => "new",
      vi.fn(),
    );
    await checkout.recover();
    expect(clear).not.toHaveBeenCalled();
  },
);
it("does not discard retryable failure, mismatched reference or incomplete terminal responses", () => {
  const result = {
    resolution: "FAILED",
    canRetry: false,
    merchantOrderId: "T1",
    order: { orderNumber: "T1", paymentStatus: "FAILED" },
  };
  expect(isTerminalUnpaid(result as never, "T1")).toBe(true);
  expect(isTerminalUnpaid({ ...result, canRetry: true } as never, "T1")).toBe(
    false,
  );
  expect(isTerminalUnpaid(result as never, "T2")).toBe(false);
  expect(
    isTerminalUnpaid({ resolution: "FAILED", canRetry: false }, "T1"),
  ).toBe(false);
});
it("round trips every supported catalog filter and drops unowned route fields", () => {
  const link = storeLink(
    "/shop?brand=A%26B&minPrice=500&maxPrice=1500&offersOnly=true&search=shirt&category=Shirts&sort=price_low&token=secret",
  );
  const params = Object.fromEntries(new URLSearchParams(link.split("?")[1]));
  expect(params.token).toBeUndefined();
  const filter = catalogRouteFilter(params);
  expect(filter.brand).toBe("A&B");
  expect(filter.offersOnly).toBe(true);
  expect(catalogRouteFilter(catalogRouteParams(filter))).toEqual(filter);
});
it("does not preserve arbitrary query fields or external protected destinations", () => {
  expect(
    protectedReturnTo("/address-form", { id: "address1", token: "private" }),
  ).toBe("/address-form?id=address1");
  expect(protectedReturnTo("https://evil.test", { id: "address1" })).toBe(
    "/(tabs)",
  );
});
it("allows a fresh COD checkout after a server-confirmed terminal failed online attempt", async () => {
  let persisted: {
    merchantOrderId?: string;
    fingerprint: string;
    idempotencyKey: string;
  } | null = {
    merchantOrderId: "T1",
    fingerprint: "old-bag",
    idempotencyKey: "old-key",
  };
  const request = vi
    .fn()
    .mockResolvedValueOnce({
      resolution: "FAILED",
      canRetry: false,
      merchantOrderId: "T1",
      order: { orderNumber: "T1", paymentStatus: "FAILED" },
    })
    .mockResolvedValueOnce({
      order: { orderNumber: "T2", paymentMethod: "COD" },
    });
  const checkout = createCheckout(
    { request } as unknown as ApiClient,
    {
      read: async () => persisted,
      clear: async () => {
        persisted = null;
      },
      write: async (value) => {
        persisted = value;
      },
    },
    () => "fresh-key",
    vi.fn(),
  );
  await checkout.recover();
  const order = await checkout.pay({
    accountId: "alice",
    cart: {
      _id: "bag",
      items: [
        {
          _id: "line",
          product: { _id: "p", name: "Shirt", price: 100 },
          quantity: 1,
          price: 100,
        },
      ],
      totalAmount: 100,
    },
    address: {
      _id: "a",
      fullName: "Alice",
      phone: "9999999999",
      streetAddress: "Road",
      city: "Hyderabad",
      state: "Telangana",
      pinCode: "500034",
    },
    quote: {
      subtotal: 100,
      discount: 0,
      shippingFee: 0,
      tax: 0,
      totalAmount: 100,
      currency: "INR",
    },
    coupon: "",
    method: "COD",
  });
  expect(order.orderNumber).toBe("T2");
  expect(request.mock.calls[1][1].body.idempotencyKey).toBe("fresh-key");
  expect(persisted).toBeNull();
});
