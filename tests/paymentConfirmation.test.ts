import { it, expect, vi } from "vitest";
import { createCheckout, type Attempt } from "../src/api/checkout";
import type { ApiClient } from "../src/api/client";
import type { Order } from "../src/models";
import { confirmedCustomerOrder } from "../src/shared/paymentStatus";
it("does not clear or confirm a saved payment when the returned order differs", async () => {
  const saved: Attempt = {
    merchantOrderId: "expected",
    fingerprint: "f",
    idempotencyKey: "key",
  };
  const clear = vi.fn();
  const api = {
    request: vi
      .fn()
      .mockResolvedValue({
        resolution: "CONFIRMED",
        order: { orderNumber: "another", paymentStatus: "COMPLETED" },
      }),
  } as unknown as ApiClient;
  const checkout = createCheckout(
    api,
    { read: async () => saved, write: vi.fn(), clear },
    () => "uuid",
    vi.fn(),
  );
  await expect(checkout.recover()).rejects.toThrow("different order");
  expect(clear).not.toHaveBeenCalled();
});
it.each([
  undefined,
  "NEW_UNKNOWN_STATUS",
  "CANCELLED",
  "RETURNED",
  "RETURN_REQUESTED",
])(
  "does not confirm COD from an unknown or inactive status: %s",
  (orderStatus) => {
    expect(
      confirmedCustomerOrder({
        orderNumber: "T1",
        paymentMethod: "COD",
        orderStatus,
        paymentStatus: "PENDING",
      } as Order),
    ).toBe(false);
  },
);
it("accepts a server-created COD order only in a known accepted status", () => {
  expect(
    confirmedCustomerOrder({
      orderNumber: "T1",
      paymentMethod: "COD",
      orderStatus: "PLACED",
      paymentStatus: "PENDING",
    } as Order),
  ).toBe(true);
});
it("does not title a cancelled paid order as confirmed", () => {
  expect(
    confirmedCustomerOrder({
      orderNumber: "T1",
      paymentMethod: "CARD",
      orderStatus: "CANCELLED",
      paymentStatus: "COMPLETED",
    } as Order),
  ).toBe(false);
});
