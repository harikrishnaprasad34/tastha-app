import { describe, it, expect, vi } from "vitest";
import { describeDetectedPlace, locationFromAddress, parseSavedLocation } from "../src/shared/deliveryLocation";
import { createSessionManager } from "../src/api/session";
import { createApiClient } from "../src/api/client";
import { customerLoginPayload } from "../src/api/authPayload";
import { createCheckout, type Attempt } from "../src/api/checkout";
import { mergeProducts, productImages, imageUrl } from "../src/shared/catalog";
import { getVariantAvailability } from "../src/shared/productAvailability";
import { isValidCheckoutQuote } from "../src/shared/checkoutQuote";
import {
  buildStore,
  changeBag,
  fetchBag,
  fetchCatalog,
  fetchAddresses,
  fetchHome,
  actions,
} from "../src/state/store";
import type { Session, Product, Cart, Quote, Address } from "../src/models";
const customer: Session = {
  accessToken: "access",
  refreshToken: "refresh",
  user: { id: "customer1", fullName: "Customer", role: "CUSTOMER" },
};
const storage = () => ({
  get: vi.fn(async () => null as string | null),
  set: vi.fn(async (_s: string) => {}),
  remove: vi.fn(async () => {}),
});
const product: Product = {
  _id: "p1",
  name: "Shirt",
  price: 100,
  variants: [
    {
      size: "M",
      color: "Black",
      stock: 2,
      sku: "BLACK-M",
      images: ["https://images.example/black.jpg"],
    },
    { size: "M", color: "Red", stock: 0, sku: "RED-M" },
  ],
};
const cart: Cart = {
  _id: "c1",
  items: [
    {
      _id: "l1",
      product,
      quantity: 1,
      price: 100,
      selectedSize: "M",
      selectedColor: "Black",
      variantSku: "BLACK-M",
    },
  ],
  totalAmount: 100,
};
const quote: Quote = {
  subtotal: 100,
  discount: 0,
  shippingFee: 0,
  tax: 0,
  totalAmount: 100,
  currency: "INR",
};
const address: Address = {
  _id: "a1",
  fullName: "Customer",
  phone: "9999999999",
  streetAddress: "Sample road",
  city: "Hyderabad",
  state: "Telangana",
  pinCode: "500001",
};
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
describe("secure sessions and requests", () => {
  it("does not rotate a token twice when an older request returns 401 late", async () => {
    const manager = createSessionManager(storage());
    await manager.save(customer);
    const lateResponse = deferred<Response>();
    let refreshCount = 0;
    const fetcher = vi.fn(async (url: RequestInfo | URL, options?: RequestInit) => {
      const path = String(url);
      if (path.endsWith("/auth/refresh-token")) {
        refreshCount++;
        return response({ accessToken: "new-access", refreshToken: "new-refresh" });
      }
      const token = (options?.headers as Record<string,string>).Authorization;
      if (path.endsWith("/cart") && token === "Bearer access")
        return lateResponse.promise;
      return token === "Bearer new-access"
        ? response({ success: true })
        : response({ message: "Expired" }, 401);
    });
    const api = createApiClient("https://example.test", manager, fetcher);
    const first = api.request("/cart", { auth: "required" });
    await api.request("/wishlist", { auth: "required" });
    lateResponse.resolve(response({ message: "Expired" }, 401));
    await expect(first).resolves.toMatchObject({ success: true });
    expect(refreshCount).toBe(1);
    expect(manager.get()?.accessToken).toBe("new-access");
  });
  it("keeps a saved sign-in when refresh fails due to connectivity", async () => {
    const deviceStorage = storage();
    const manager = createSessionManager(deviceStorage);
    await manager.save(customer);
    const api = createApiClient("https://example.test", manager, async (url) =>
      String(url).endsWith("/auth/refresh-token")
        ? Promise.reject(Error("offline"))
        : response({ message: "Access expired" }, 401),
    );
    await expect(api.request("/cart", { auth: "required" })).rejects.toThrow("Cannot reach");
    expect(manager.get()?.user.id).toBe(customer.user.id);
    expect(deviceStorage.remove).not.toHaveBeenCalled();
  });
  it("clears session only if refresh credentials are rejected", async () => {
    const manager = createSessionManager(storage());
    await manager.save(customer);
    const api = createApiClient("https://example.test", manager, async (url) =>
      response({ message: "Token invalid" }, String(url).endsWith("/auth/refresh-token") ? 401 : 401),
    );
    await expect(api.request("/cart", { auth: "required" })).rejects.toThrow("session expired");
    expect(manager.get()).toBeNull();
  });
  it("keeps device delivery location on login and sign-out", async () => {
    const manager = createSessionManager(storage());
    const appStore = buildStore({
      api: {} as ReturnType<typeof createApiClient>,
      session: manager,
    });
    appStore.dispatch(actions.setLocation({ label: "Road 12", pinCode: "500034" }));
    await manager.save(customer, manager.revision(), true);
    expect(appStore.getState().location?.label).toBe("Road 12");
    await manager.clear();
    expect(appStore.getState().location?.label).toBe("Road 12");
  });
  it("rejects a staff session in the customer client", async () => {
    const manager = createSessionManager(storage());
    await expect(
      manager.save({ ...customer, user: { ...customer.user, role: "ADMIN" } }),
    ).rejects.toThrow("customer session");
    expect(manager.get()).toBeNull();
  });
  it("cannot restore a session after logout during storage read", async () => {
    const wait = deferred<string | null>();
    const manager = createSessionManager({
      ...storage(),
      get: () => wait.promise,
    });
    const restore = manager.restore();
    await manager.clear();
    wait.resolve(JSON.stringify(customer));
    await restore;
    expect(manager.get()).toBeNull();
  });
  it("deduplicates refresh requests and retries with the new token", async () => {
    const manager = createSessionManager(storage());
    await manager.save(customer);
    let refreshes = 0;
    const fetcher = vi.fn(
      async (url: RequestInfo | URL, options?: RequestInit) => {
        if (String(url).endsWith("/auth/refresh-token")) {
          refreshes++;
          return response({ accessToken: "new", refreshToken: "new-refresh" });
        }
        const headers = options?.headers as Record<string, string>;
        return headers.Authorization === "Bearer new"
          ? response({ success: true })
          : response({ message: "Expired" }, 401);
      },
    );
    const api = createApiClient("https://example.test", manager, fetcher);
    await Promise.all([
      api.request("/cart", { auth: "required" }),
      api.request("/wishlist", { auth: "required" }),
    ]);
    expect(refreshes).toBe(1);
    expect(manager.get()?.accessToken).toBe("new");
  });
  it("rejects an authenticated response arriving after logout", async () => {
    const manager = createSessionManager(storage());
    await manager.save(customer);
    const wait = deferred<Response>();
    const api = createApiClient(
      "https://example.test",
      manager,
      () => wait.promise,
    );
    const request = api.request("/cart", { auth: "required" });
    await manager.clear();
    wait.resolve(response({ success: true }));
    await expect(request).rejects.toThrow("session changed");
  });
  it("does not retry a network-failed mutation", async () => {
    const manager = createSessionManager(storage());
    await manager.save(customer);
    const fetcher = vi.fn(async () => {
      throw Error("offline");
    });
    await expect(
      createApiClient("https://example.test", manager, fetcher).request(
        "/orders/create",
        { auth: "required", method: "POST" },
      ),
    ).rejects.toThrow("Cannot reach");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
describe("catalog and quote integrity", () => {
  it("merges pages without duplicate products", () =>
    expect(
      mergeProducts(
        [product],
        [
          { ...product, name: "Updated" },
          { ...product, _id: "p2" },
        ],
      ).map((p) => p.name),
    ).toEqual(["Updated", "Shirt"]));
  it("uses the selected variant image", () =>
    expect(
      productImages(
        { ...product, images: ["https://images.example/red.jpg"] },
        "https://api.example",
        product.variants![0],
      ),
    ).toEqual(["https://images.example/black.jpg"]));
  it("requires exact size and colour and checks selected stock", () => {
    expect(getVariantAvailability(product).status).toBe("selection_required");
    expect(
      getVariantAvailability(product, { size: "M", color: "Black" }).status,
    ).toBe("available");
    expect(
      getVariantAvailability(product, { size: "M", color: "Red" }).status,
    ).toBe("out_of_stock");
  });
  it("rejects inconsistent and non-finite totals", () => {
    expect(isValidCheckoutQuote(quote)).toBe(true);
    expect(isValidCheckoutQuote({ ...quote, totalAmount: 101 })).toBe(false);
    expect(isValidCheckoutQuote({ ...quote, tax: NaN })).toBe(false);
  });
  it("ignores a stale bag load after a confirmed mutation", async () => {
    const manager = createSessionManager(storage());
    await manager.save(customer);
    const wait = deferred<{ cart: Cart }>();
    const api = {
      request: vi.fn((path: string) =>
        path === "/cart"
          ? wait.promise
          : Promise.resolve({ cart: { ...cart, totalAmount: 200 } }),
      ),
    } as unknown as ReturnType<typeof createApiClient>;
    const store = buildStore({ api, session: manager });
    const load = store.dispatch(fetchBag());
    await store.dispatch(changeBag({ kind: "add", productId: "p1" }));
    wait.resolve({ cart });
    await load;
    expect(store.getState().commerce.bag?.totalAmount).toBe(200);
  });
  it("resets catalog pages immediately on location change", () => {
    const store = buildStore({
      api: {} as ReturnType<typeof createApiClient>,
      session: createSessionManager(storage()),
    });
    store.dispatch(
      fetchCatalog.fulfilled(
        {
          result: {
            success: true,
            products: [product],
            pagination: { page: 1, total: 1, hasNextPage: false },
          },
          key: "old",
        },
        "old",
        {
          filter: { search: "", category: "", sort: "newest", maxPrice: "" },
          page: 1,
          key: "old",
        },
      ),
    );
    store.dispatch(actions.setLocation({ label: "Area", pinCode: "500001" }));
    expect(store.getState().catalog.page).toBe(0);
    expect(store.getState().catalog.items).toEqual([]);
  });
});
describe("checkout security", () => {
  function setup(request: ReturnType<typeof vi.fn>) {
    let attempt: Attempt | null = null;
    const gateway = vi.fn(async () => ({
      razorpay_order_id: "order1",
      razorpay_payment_id: "payment1",
      razorpay_signature: "proof",
    }));
    const checkout = createCheckout(
      { request } as unknown as ReturnType<typeof createApiClient>,
      {
        read: async () => attempt,
        write: async (a) => {
          attempt = a;
        },
        clear: async () => {
          attempt = null;
        },
      },
      () => "stable-attempt",
      gateway,
    );
    return { checkout, gateway, getAttempt: () => attempt };
  }
  const input = {
    accountId: "customer1",
    cart,
    address,
    quote,
    coupon: "",
    method: "UPI",
  };
  const gatewayOrder = {
    razorpayOrderId: "order1",
    merchantOrderId: "merchant1",
    keyId: "rzp_test_public",
    amountInPaise: 10000,
    currency: "INR",
  };
  it("refuses a gateway amount mismatch before opening the SDK", async () => {
    const { checkout, gateway } = setup(
      vi.fn(async () => ({ ...gatewayOrder, amountInPaise: 1 })),
    );
    await expect(checkout.pay(input)).rejects.toThrow("amount");
    expect(gateway).not.toHaveBeenCalled();
  });
  it("never treats an unverified payment as paid", async () => {
    const request = vi.fn(async (path: string) =>
      path.endsWith("/verify")
        ? { order: { orderNumber: "T1", paymentStatus: "PENDING" } }
        : gatewayOrder,
    );
    const { checkout, getAttempt } = setup(request);
    await expect(checkout.pay(input)).rejects.toThrow("pending");
    expect(getAttempt()?.merchantOrderId).toBe("merchant1");
  });
  it("does not create a second gateway order for a failed-status older attempt", async () => {
    const request = vi.fn(async (path: string) =>
      path.endsWith("/status") ? { resolution: "FAILED" } : gatewayOrder,
    );
    const { checkout, gateway } = setup(request);
    gateway.mockRejectedValueOnce(Error("payment UI closed"));
    await expect(checkout.pay(input)).rejects.toThrow("payment UI closed");
    await expect(checkout.pay(input)).rejects.toThrow("earlier payment attempt");
    expect(request.mock.calls.filter((call) => call[0] === "/payment/razorpay/order")).toHaveLength(1);
  });
  it("does not trust an unfinished order marked confirmed by the status endpoint", async () => {
    const request = vi.fn(async (path: string) =>
      path.endsWith("/status")
        ? { resolution: "CONFIRMED", order: { orderNumber: "T2", paymentStatus: "PENDING" } }
        : gatewayOrder,
    );
    const { checkout, gateway } = setup(request);
    gateway.mockRejectedValueOnce(Error("payment UI closed"));
    await expect(checkout.pay(input)).rejects.toThrow("payment UI closed");
    await expect(checkout.pay(input)).rejects.toThrow("earlier payment attempt");
    expect(request.mock.calls.filter((call) => call[0] === "/payment/razorpay/order")).toHaveLength(1);
  });
  it("blocks duplicate payment clicks", async () => {
    const wait = deferred<unknown>();
    const { checkout } = setup(vi.fn(() => wait.promise));
    const first = checkout.pay(input);
    await expect(checkout.pay(input)).rejects.toThrow("already processing");
    wait.resolve({ ...gatewayOrder, amountInPaise: 1 });
    await expect(first).rejects.toThrow("amount");
  });
  it("reuses the persisted attempt after an interrupted COD request", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(Error("offline"))
      .mockResolvedValueOnce({ order: { orderNumber: "T1" } });
    const { checkout } = setup(request);
    await expect(checkout.pay({ ...input, method: "COD" })).rejects.toThrow(
      "offline",
    );
    await checkout.pay({ ...input, method: "COD" });
    expect(request.mock.calls[0][1].body.idempotencyKey).toBe(
      request.mock.calls[1][1].body.idempotencyKey,
    );
  });
  it("does not open the SDK when the session changed", async () => {
    const { checkout, gateway } = setup(vi.fn(async () => gatewayOrder));
    await expect(
      checkout.pay({ ...input, sessionIsCurrent: () => false }),
    ).rejects.toThrow("session changed");
    expect(gateway).not.toHaveBeenCalled();
  });
});

it("never substitutes another colour when the selected variant has no photo", () => {
  expect(
    productImages(
      { ...product, images: ["https://example.test/red.jpg"] },
      "https://example.test",
      product.variants![1],
    ),
  ).toEqual([]);
});

describe("first-run delivery flow", () => {
  it("restores a confirmed address but rejects bad PIN or malformed data", () => {
    expect(parseSavedLocation(JSON.stringify({
      label: "Road No 12, Banjara Hills",
      pinCode: "500034",
      lat: 17.41,
      lng: 78.44,
    }))?.label).toBe("Road No 12, Banjara Hills");
    expect(parseSavedLocation('{"label":"Area","pinCode":"123"}')).toBeNull();
    expect(parseSavedLocation("not-json")).toBeNull();
  });
  it("uses a detected street instead of broad city or area only", () => {
    expect(describeDetectedPlace({
      streetNumber: "12",
      street: "Road",
      district: "Banjara Hills",
      city: "Hyderabad",
      postalCode: "500034",
    }, { displayAddress: "Hyderabad", pinCode: "500001" })).toEqual({
      label: "12 Road, Banjara Hills, Hyderabad",
      pinCode: "500034",
    });
  });
  it("supports a manual or saved-address fallback without coordinates", () => {
    const place = locationFromAddress(address);
    expect(place.pinCode).toBe("500001");
    expect(place.addressId).toBe("a1");
    expect(place.label).toContain("Sample road");
    expect(place.lat).toBeUndefined();
  });
});

describe("checkout and saved delivery area stay synchronized", () => {
  it("restores the previously selected address, even when not the account default", async () => {
    const manager = createSessionManager(storage());
    const other = { ...address, _id: "a2", streetAddress: "Other area", pinCode: "500002", isDefault: true };
    const api = {
      request: vi.fn(async () => ({ addresses: [other, address] })),
    } as unknown as ReturnType<typeof createApiClient>;
    const appStore = buildStore({ api, session: manager });
    const saved = locationFromAddress(address);
    expect(parseSavedLocation(JSON.stringify(saved))?.addressId).toBe("a1");
    appStore.dispatch(actions.setLocation(saved));
    await appStore.dispatch(fetchAddresses());
    expect(appStore.getState().commerce.selectedAddressId).toBe("a1");
  });
  it("does not choose a default checkout address in a different PIN", async () => {
    const manager = createSessionManager(storage());
    const api = {
      request: vi.fn(async () => ({ addresses: [address] })),
    } as unknown as ReturnType<typeof createApiClient>;
    const appStore = buildStore({ api, session: manager });
    appStore.dispatch(actions.setLocation({ label: "Different street", pinCode: "500034" }));
    await appStore.dispatch(fetchAddresses());
    expect(appStore.getState().commerce.selectedAddressId).toBeNull();
    appStore.dispatch(actions.selectAddress("a1"));
    appStore.dispatch(actions.setLocation({ label: "New locality", pinCode: "500034" }));
    expect(appStore.getState().commerce.selectedAddressId).toBeNull();
  });
});

describe("catalog pagination protection", () => {
  const filter = { search: "", category: "", sort: "newest", maxPrice: "" };
  it("permits retrying the same page after a network error", async () => {
    const manager = createSessionManager(storage());
    let call = 0;
    const api = {
      request: vi.fn(async () => {
        call++;
        if (call === 2) throw Error("Network unavailable");
        return {
          products: [call === 1 ? product : { ...product, _id: "p2" }],
          pagination: { page: call === 1 ? 1 : 2, total: 40, hasNextPage: true },
        };
      }),
    } as unknown as ReturnType<typeof createApiClient>;
    const appStore = buildStore({ api, session: manager });
    await appStore.dispatch(fetchCatalog({ filter, page: 1, key: "retry" }));
    await appStore.dispatch(fetchCatalog({ filter, page: 2, key: "retry" }));
    expect(appStore.getState().catalog.error).toBeTruthy();
    await appStore.dispatch(fetchCatalog({ filter, page: 2, key: "retry" }));
    expect(appStore.getState().catalog.page).toBe(2);
    expect(appStore.getState().catalog.items).toHaveLength(2);
  });
  it("ignores skipped and stale catalog pages", async () => {
    const manager = createSessionManager(storage());
    const api = {
      request: vi.fn(async () => ({
        products: [product],
        pagination: { page: 1, total: 30, hasNextPage: true },
      })),
    } as unknown as ReturnType<typeof createApiClient>;
    const appStore = buildStore({ api, session: manager });
    await appStore.dispatch(fetchCatalog({ filter, page: 2, key: "current" }));
    expect(api.request).not.toHaveBeenCalled();
    await appStore.dispatch(fetchCatalog({ filter, page: 1, key: "current" }));
    expect(api.request).toHaveBeenCalledTimes(1);
    await appStore.dispatch(fetchCatalog({ filter, page: 3, key: "current" }));
    await appStore.dispatch(fetchCatalog({ filter, page: 2, key: "outdated" }));
    expect(api.request).toHaveBeenCalledTimes(1);
  });
});

describe("homepage images and safe address recovery", () => {
  it("uses only HTTPS banner imagery", () => {
    expect(imageUrl("https://assets.example.test/banner.png", "https://api.example.test"))
      .toBe("https://assets.example.test/banner.png");
    expect(imageUrl("javascript:alert(1)", "https://api.example.test"))
      .toBeUndefined();
  });
  it("rejects the saved address when its server PIN changed", async () => {
    const manager = createSessionManager(storage());
    const stale = { ...address, pinCode: "500099" };
    const api = {
      request: vi.fn(async () => ({ addresses: [stale] })),
    } as unknown as ReturnType<typeof createApiClient>;
    const appStore = buildStore({ api, session: manager });
    appStore.dispatch(actions.setLocation(locationFromAddress(address)));
    await appStore.dispatch(fetchAddresses());
    expect(appStore.getState().commerce.selectedAddressId).toBeNull();
  });
});

describe("location-sensitive homepage requests", () => {
  it("accepts the new PIN response and ignores a late response from the old PIN", async () => {
    const manager = createSessionManager(storage());
    const older = deferred<{ success: boolean; sections: { title: string; products: Product[] }[] }>();
    const newer = deferred<{ success: boolean; sections: { title: string; products: Product[] }[] }>();
    const api = {
      request: vi.fn((path: string) =>
        path.includes("500001") ? older.promise : newer.promise,
      ),
    } as unknown as ReturnType<typeof createApiClient>;
    const appStore = buildStore({ api, session: manager });
    appStore.dispatch(actions.setLocation({ label: "Old area", pinCode: "500001" }));
    const first = appStore.dispatch(fetchHome("500001"));
    appStore.dispatch(actions.setLocation({ label: "New area", pinCode: "500034" }));
    const second = appStore.dispatch(fetchHome("500034"));
    newer.resolve({ success: true, sections: [{ title: "New area picks", products: [] }] });
    await second;
    older.resolve({ success: true, sections: [{ title: "Outdated picks", products: [] }] });
    await first;
    expect(appStore.getState().catalog.home?.sections?.[0].title).toBe("New area picks");
    expect(appStore.getState().catalog.homePin).toBe("500034");
    expect(appStore.getState().catalog.homeLoading).toBe(false);
  });
  it("permits fetching a different PIN while the old homepage request is pending", async () => {
    const manager = createSessionManager(storage());
    const left = deferred<{ success: boolean }>();
    const right = deferred<{ success: boolean }>();
    const api = {
      request: vi.fn((path: string) =>
        path.includes("500001") ? left.promise : right.promise,
      ),
    } as unknown as ReturnType<typeof createApiClient>;
    const appStore = buildStore({ api, session: manager });
    const a = appStore.dispatch(fetchHome("500001"));
    const b = appStore.dispatch(fetchHome("500034"));
    expect(api.request).toHaveBeenCalledTimes(2);
    right.resolve({ success: true });
    await b;
    left.resolve({ success: true });
    await a;
  });
});

describe("backend-compatible customer account and coupon requests", () => {
  it("submits registered email and the legacy identifier without changing the password", () => {
    expect(customerLoginPayload("  TEST@EXAMPLE.COM  ", "Example pass")).toEqual({
      email: "test@example.com",
      identifier: "test@example.com",
      password: "Example pass",
    });
    expect(() => customerLoginPayload("9999999999", "pass")).toThrow("registered email");
  });
  it("sends both backend-supported refresh-token field names", async () => {
    const manager = createSessionManager(storage());
    await manager.save(customer);
    let refreshBody: Record<string, string> | undefined;
    const fetcher = vi.fn(async (url: RequestInfo | URL, options?: RequestInit) => {
      if (String(url).endsWith("/auth/refresh-token")) {
        refreshBody = JSON.parse(String(options?.body));
        return response({ accessToken: "next", refreshToken: "next-refresh" });
      }
      return (options?.headers as Record<string, string>)?.Authorization === "Bearer next"
        ? response({ success: true })
        : response({ message: "expired" }, 401);
    });
    await createApiClient("https://example.test", manager, fetcher).request(
      "/cart", { auth: "required" },
    );
    expect(refreshBody).toMatchObject({
      token: "refresh",
      refreshToken: "refresh",
    });
  });
  it("includes cartId for coupon apply and remove using the existing backend", async () => {
    const manager = createSessionManager(storage());
    await manager.save(customer);
    const request = vi.fn(async () => ({ cart }));
    const appStore = buildStore({
      api: { request } as unknown as ReturnType<typeof createApiClient>,
      session: manager,
    });
    appStore.dispatch(actions.replaceBag(cart));
    await appStore.dispatch(changeBag({ kind: "coupon", couponCode: " SAVE10 " }));
    expect(request).toHaveBeenCalledWith("/cart/apply-coupon", expect.objectContaining({
      body: { cartId: "c1", couponCode: "SAVE10" },
    }));
    await appStore.dispatch(changeBag({ kind: "removeCoupon" }));
    expect(request).toHaveBeenCalledWith("/cart/remove-coupon", expect.objectContaining({
      body: { cartId: "c1" },
    }));
  });
});
