import { it, expect, vi } from "vitest";
import { createCheckout } from "../src/api/checkout";
import type { ApiClient } from "../src/api/client";
import { protectedReturnTo, loginPath } from "../src/navigation/authReturn";
it("audit reproduction: terminal failed recovery clears the checkout lock", async () => {
  const clear = vi.fn(),
    open = vi.fn();
  const request = vi
    .fn()
    .mockResolvedValue({
      resolution: "FAILED",
      canRetry: false,
      merchantOrderId: "T1",
      order: { orderNumber: "T1", paymentStatus: "FAILED" },
    });
  const checkout = createCheckout(
    { request } as unknown as ApiClient,
    {
      read: async () => ({
        fingerprint: "previous-bag",
        idempotencyKey: "old",
        merchantOrderId: "T1",
      }),
      write: vi.fn(),
      clear,
    },
    () => "new",
    open,
  );
  expect(await checkout.recover()).toEqual({
    resolution: "FAILED",
    canRetry: false,
    merchantOrderId: "T1",
    order: { orderNumber: "T1", paymentStatus: "FAILED" },
  });
  expect(clear).toHaveBeenCalledOnce();
  expect(open).not.toHaveBeenCalled();
  expect(request).toHaveBeenCalledTimes(1);
});
it("preserves review identity through the protected login destination", () => {
  const path = loginPath(
    protectedReturnTo("/review", {
      orderId: "o1",
      productId: "p1",
      token: "private",
    }),
  );
  expect(new URLSearchParams(path.split("?")[1]).get("returnTo")).toBe(
    "/review?orderId=o1&productId=p1",
  );
});
