import { describe, it, expect, vi } from "vitest";
import { safeReturnTo, loginPath } from "../src/navigation/authReturn";
import { restoreDeliveryForAccount } from "../src/shared/deliveryLocation";
import { storeLink } from "../src/navigation/routes";
import { deliveryEligibility } from "../src/api/deliveryEligibility";
import { loadStorefrontHome } from "../src/api/home";
import { createSessionManager } from "../src/api/session";
import { createApiClient } from "../src/api/client";
import { createCheckout } from "../src/api/checkout";
import { buildStore, actions, fetchBag } from "../src/state/store";
const user = { id: "alice", fullName: "Alice", role: "CUSTOMER" };
const auth = { user, accessToken: "old", refreshToken: "old-refresh" };
const memory = () => {
  let raw: string | null = null;
  return {
    get: async () => raw,
    set: async (value: string) => {
      raw = value;
    },
    remove: async () => {
      raw = null;
    },
  };
};
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
describe("post-login destinations", () => {
  it.each([
    "/checkout",
    "/order/id/tracking",
    "/address-form?id=123",
    "/(tabs)/wishlist",
  ])("preserves %s", (path) => expect(safeReturnTo(path)).toBe(path));
  it.each([
    "https://evil.test",
    "//evil.test",
    "/login",
    "/signup",
    "/admin",
    "/checkout\\evil",
  ])("rejects %s", (path) => expect(safeReturnTo(path)).toBe("/(tabs)"));
  it("normalizes public tab paths and defaults ordinary login to home", () => {
    expect(safeReturnTo("/bag")).toBe("/(tabs)/bag");
    expect(loginPath(undefined)).toBe("/login?returnTo=%2F(tabs)");
  });
  it("maps CMS budget, collection, product and occasion links", () => {
    expect(storeLink("/shop?maxPrice=1500&sort=price_low&token=secret")).toBe(
      "/(tabs)/shop?sort=price_low&maxPrice=1500",
    );
    expect(storeLink("/collections/shirts")).toBe(
      "/(tabs)/shop?category=shirts",
    );
    expect(storeLink("/product/p1")).toBe("/product/p1");
    expect(storeLink("/choose-occasion?occasion=wedding")).toBe(
      "/ai?occasion=wedding",
    );
    expect(storeLink("/product/%zz")).toBe("/(tabs)/shop");
    expect(storeLink("//evil.test")).toBe("/(tabs)/shop");
  });
});
describe("current website data", () => {
  it("uses configured discovery ordering and does not fall back on service failure", async () => {
    const data = {
      banners: [],
      categories: [],
      sections: [{ id: "deals", title: "Deals", products: [] }],
      config: { budgets: [999] },
    };
    const api = {
      request: vi.fn().mockResolvedValue(data),
    } as unknown as ReturnType<typeof createApiClient>;
    expect(await loadStorefrontHome(api, "500034")).toEqual(data);
    expect(api.request).toHaveBeenCalledTimes(1);
    vi.mocked(api.request).mockRejectedValue(Error("Unavailable"));
    await expect(loadStorefrontHome(api, "500034")).rejects.toThrow(
      "Unavailable",
    );
  });
  it.each([false, null, undefined])(
    "does not claim delivery with serviceable=%s",
    async (serviceable) => {
      const api = {
        request: vi.fn().mockResolvedValue({
          delivery: { serviceable, message: "Not verified" },
        }),
      } as unknown as ReturnType<typeof createApiClient>;
      await expect(deliveryEligibility(api, "500034")).rejects.toThrow(
        serviceable === undefined ? "could not be verified" : "Not verified",
      );
    },
  );
  it("accepts explicit server delivery confirmation", async () => {
    const api = {
      request: vi.fn().mockResolvedValue({ delivery: { serviceable: true } }),
    } as unknown as ReturnType<typeof createApiClient>;
    expect((await deliveryEligibility(api, "500034")).serviceable).toBe(true);
  });
});
describe("session persistence and isolation", () => {
  it("restores a persisted session in a fresh manager", async () => {
    const storage = memory();
    await createSessionManager(storage).save(auth);
    const reopened = createSessionManager(storage);
    await reopened.restore();
    expect(reopened.get()).toEqual(auth);
  });
  it("removes account-owned commerce and delivery when identity changes", async () => {
    const session = createSessionManager(memory());
    await session.save(auth);
    const request = vi
      .fn()
      .mockResolvedValue({ cart: { _id: "cart", items: [], totalAmount: 0 } });
    const store = buildStore({
      api: { request } as unknown as ReturnType<typeof createApiClient>,
      session,
    });
    store.dispatch(
      actions.setLocation({
        label: "Alice street",
        pinCode: "500034",
        addressId: "address-alice",
      }),
    );
    await store.dispatch(fetchBag());
    await session.save(
      { ...auth, user: { ...user, id: "bob" } },
      session.revision(),
      true,
    );
    expect(store.getState().commerce.bag).toBeNull();
    expect(store.getState().location?.addressId).toBeUndefined();
    expect(store.getState().location?.label).not.toContain("Alice");
  });
  it("does not make a new account join an older account refresh", async () => {
    const session = createSessionManager(memory());
    await session.save(auth);
    let resolveOld!: (value: Response) => void;
    const oldRefresh = new Promise<Response>((r) => {
      resolveOld = r;
    });
    let started!: () => void;
    const refreshing = new Promise<void>((r) => {
      started = r;
    });
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, options?: RequestInit) => {
        const body = options?.body ? JSON.parse(String(options.body)) : null;
        if (body?.token === "old-refresh") {
          started();
          return oldRefresh;
        }
        if (body?.token === "bob-refresh")
          return response({
            accessToken: "bob-new",
            refreshToken: "bob-rotated",
          });
        return (options?.headers as Record<string, string>).Authorization ===
          "Bearer bob-new"
          ? response({ success: true })
          : response({}, 401);
      },
    );
    const api = createApiClient("https://example.test", session, fetcher);
    const old = api.request("/cart", { auth: "required" }).catch((e) => e);
    await refreshing;
    await session.save(
      {
        ...auth,
        user: { ...user, id: "bob" },
        accessToken: "bob-old",
        refreshToken: "bob-refresh",
      },
      session.revision(),
      true,
    );
    await expect(api.request("/cart", { auth: "required" })).resolves.toEqual({
      success: true,
    });
    resolveOld(
      response({ accessToken: "alice-new", refreshToken: "alice-rotated" }),
    );
    await old;
    expect(session.get()?.user.id).toBe("bob");
    expect(session.get()?.accessToken).toBe("bob-new");
  });
});
describe("interrupted payment recovery", () => {
  it("recovers a server-confirmed order without a cart or SDK call", async () => {
    const clear = vi.fn(),
      gateway = vi.fn();
    const order = { _id: "o1", orderNumber: "T1", paymentStatus: "COMPLETED" };
    const api = {
      request: vi.fn().mockResolvedValue({ resolution: "CONFIRMED", order }),
    } as unknown as ReturnType<typeof createApiClient>;
    const checkout = createCheckout(
      api,
      {
        read: async () => ({
          fingerprint: "old-cart",
          idempotencyKey: "attempt",
          merchantOrderId: "T1",
        }),
        write: vi.fn(),
        clear,
      },
      () => "unused",
      gateway,
    );
    expect((await checkout.recover())?.order).toEqual(order);
    expect(clear).toHaveBeenCalledOnce();
    expect(gateway).not.toHaveBeenCalled();
  });
  it("keeps ambiguous payment attempts persisted", async () => {
    const clear = vi.fn();
    const api = {
      request: vi.fn().mockResolvedValue({ resolution: "PENDING" }),
    } as unknown as ReturnType<typeof createApiClient>;
    const checkout = createCheckout(
      api,
      {
        read: async () => ({
          fingerprint: "old",
          idempotencyKey: "attempt",
          merchantOrderId: "T1",
        }),
        write: vi.fn(),
        clear,
      },
      () => "unused",
      vi.fn(),
    );
    expect((await checkout.recover())?.resolution).toBe("PENDING");
    expect(clear).not.toHaveBeenCalled();
  });
});

describe("authenticated review uploads", () => {
  it("lets fetch set the multipart boundary and retains the form across token refresh", async () => {
    const session = createSessionManager(memory());
    await session.save(auth);
    const form = new FormData();
    form.append("rating", "5");
    form.append("comment", "Good fit");
    const calls: RequestInit[] = [];
    const fetcher = vi.fn(
      async (url: RequestInfo | URL, options?: RequestInit) => {
        if (String(url).endsWith("/auth/refresh-token"))
          return response({ accessToken: "new", refreshToken: "rotated" });
        calls.push(options!);
        return calls.length === 1
          ? response({}, 401)
          : response({ success: true });
      },
    );
    const api = createApiClient("https://example.test", session, fetcher);
    await api.request("/reviews/orders/o1/products/p1", {
      method: "PUT",
      auth: "required",
      form,
    });
    expect(calls).toHaveLength(2);
    expect(calls[0].body).toBe(form);
    expect(calls[1].body).toBe(form);
    expect(calls[0].headers).not.toHaveProperty("Content-Type");
    expect(calls[1].headers).toHaveProperty("Authorization", "Bearer new");
  });
});

describe("persisted delivery ownership", () => {
  const raw = JSON.stringify({
    label: "Alice private street",
    pinCode: "500034",
    addressId: "alice-address",
    accountId: "alice",
    lat: 17.4,
    lng: 78.4,
  });
  it("restores the owning account address", () =>
    expect(restoreDeliveryForAccount(raw, "alice")?.addressId).toBe(
      "alice-address",
    ));
  it.each(["bob", undefined])(
    "removes another account's street, address ID and coordinates for %s",
    (accountId) =>
      expect(restoreDeliveryForAccount(raw, accountId)).toEqual({
        label: "Delivery area 500034",
        pinCode: "500034",
      }),
  );
  it("sanitizes legacy account address records without an owner", () =>
    expect(
      restoreDeliveryForAccount(
        JSON.stringify({
          label: "Old street",
          pinCode: "500034",
          addressId: "old",
        }),
        "bob",
      )?.addressId,
    ).toBeUndefined());
});

it("does not restore a legacy account address while signed out", () =>
  expect(
    restoreDeliveryForAccount(
      JSON.stringify({
        label: "Old private street",
        pinCode: "500034",
        addressId: "old",
      }),
    ),
  ).toEqual({ label: "Delivery area 500034", pinCode: "500034" }));

it("preserves unknown coverage while deferring unconfigured delivery to server checkout", async () => {
  const delivery = {
    configured: false,
    serviceable: null,
    code: "UNCONFIGURED",
  };
  const api = {
    request: vi.fn().mockResolvedValue({ delivery }),
  } as unknown as Parameters<typeof deliveryEligibility>[0];
  expect(await deliveryEligibility(api, "501505")).toEqual(delivery);
});
it.each([
  { configured: true, serviceable: false, code: "NOT_SERVICEABLE" },
  { configured: true, serviceable: null, code: "CONFIGURATION_INVALID" },
  { configured: false, serviceable: null },
])(
  "does not bypass a denial or malformed coverage response: %j",
  async (delivery) => {
    const api = {
      request: vi.fn().mockResolvedValue({ delivery }),
    } as unknown as Parameters<typeof deliveryEligibility>[0];
    await expect(deliveryEligibility(api, "501505")).rejects.toThrow();
  },
);
