import {
  configureStore,
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type { ApiClient } from "../api/client";
import type { SessionManager } from "../api/session";
import type {
  Address,
  AddressInput,
  Cart,
  CatalogFilter,
  DeliveryLocation,
  Discovery,
  Order,
  Page,
  Product,
  User,
} from "../models";
import { mergeProducts } from "../shared/catalog";
import { appendCatalogFilters } from "../shared/catalogFilters";
import { loadStorefrontHome } from "../api/home";
import { publicLocationAfterSignOut } from "../shared/deliveryLocation";
import { normalizeProductPage } from "../shared/catalogPage";

import {
  readPublicSettings,
  type PublicStoreSettings,
} from "../shared/storefrontSettings";

interface Catalog {
  items: Product[];
  key: string;
  page: number;
  total: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  requestId: string | null;
  home: Discovery | null;
  homeLoading: boolean;
  homeError: string | null;
  homeId: string | null;
  homePin: string | null;
}
interface Commerce {
  bag: Cart | null;
  wishlist: Product[];
  addresses: Address[];
  orders: Order[];
  selectedAddressId: string | null;
  busy: boolean;
  pending: Record<string, string>;
  errors: Record<string, string | null>;
}
export interface AppState {
  publicSettings: {
    data: PublicStoreSettings | null;
    loading: boolean;
    error: string | null;
    requestId: string | null;
  };
  auth: { user: User | null; ready: boolean; error: string | null };
  catalog: Catalog;
  commerce: Commerce;
  location: DeliveryLocation | null;
}
interface Extra {
  api: ApiClient;
  session: SessionManager;
}
type Config = { state: AppState; extra: Extra };
const thunk = createAsyncThunk.withTypes<Config>();
export const fetchPublicSettings = thunk(
  "publicSettings/fetch",
  async (_, { extra, signal }) => {
    const response = await extra.api.request<{
      success?: boolean;
      settings?: unknown;
    }>("/store/settings", { auth: "none", signal });
    if (!response.success)
      throw Error("Contact details are temporarily unavailable.");
    return readPublicSettings(response.settings);
  },
  { condition: (_, { getState }) => !getState().publicSettings.loading },
);
const publicSettings = createSlice({
  name: "publicSettings",
  initialState: {
    data: null as PublicStoreSettings | null,
    loading: false,
    error: null as string | null,
    requestId: null as string | null,
  },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchPublicSettings.pending, (s, a) => {
      s.loading = true;
      s.error = null;
      s.requestId = a.meta.requestId;
    });
    b.addCase(fetchPublicSettings.fulfilled, (s, a) => {
      if (s.requestId !== a.meta.requestId) return;
      s.data = a.payload;
      s.loading = false;
      s.requestId = null;
    });
    b.addCase(fetchPublicSettings.rejected, (s, a) => {
      if (s.requestId !== a.meta.requestId) return;
      s.data = null;
      s.loading = false;
      s.error =
        a.error.message || "Contact details are temporarily unavailable.";
      s.requestId = null;
    });
  },
});
const initialCatalog = (): Catalog => ({
  items: [],
  key: "",
  page: 0,
  total: 0,
  hasMore: true,
  loading: false,
  error: null,
  requestId: null,
  home: null,
  homeLoading: false,
  homeError: null,
  homeId: null,
  homePin: null,
});
const initialCommerce = (): Commerce => ({
  bag: null,
  wishlist: [],
  addresses: [],
  orders: [],
  selectedAddressId: null,
  busy: false,
  pending: {},
  errors: {},
});
const encode = encodeURIComponent;
const cartFrom = (data: { cart?: Cart }) => {
  if (!data.cart || !Array.isArray(data.cart.items))
    throw Error("Tastha returned an incomplete bag. Please refresh.");
  return data.cart;
};
const productsFrom = (data: { wishlist?: { products?: Product[] } }) => {
  if (!Array.isArray(data.wishlist?.products))
    throw Error("Wishlist is unavailable.");
  return data.wishlist.products.filter((p) => p && typeof p._id === "string");
};

export const fetchCatalog = thunk(
  "catalog/fetch",
  async (
    { filter, page, key }: { filter: CatalogFilter; page: number; key: string },
    { extra, signal, getState },
  ) => {
    const pin = getState().location?.pinCode || "";
    const q = new URLSearchParams({
      page: String(page),
      limit: "20",
      includeKpis: "false",
      sort: filter.sort,
      deliveryPinCode: pin,
    });
    if (filter.search.trim()) q.set("search", filter.search.trim());
    if (filter.category) q.set("category", filter.category);
    appendCatalogFilters(q, filter);
    const response = await extra.api.request<Page>("/products?" + q, {
      signal,
    });
    const result = normalizeProductPage(response, page);
    return { result, key };
  },
  {
    condition: (arg, { getState }) => {
      const c = getState().catalog;
      if (arg.page === 1)
        return !(c.loading && c.key === arg.key && c.page === 0);
      // Never append a page from an old filter or delivery location.
      return (
        arg.page > 1 &&
        !c.loading &&
        c.key === arg.key &&
        c.hasMore &&
        c.page === arg.page - 1
      );
    },
  },
);
export const fetchHome = thunk(
  "catalog/home",
  async (pinCode: string, { extra, signal }) => {
    const result = await loadStorefrontHome(extra.api, pinCode, signal);
    return { result, pinCode };
  },
  {
    condition: (pinCode, { getState }) => {
      const c = getState().catalog;
      return !(c.homeLoading && c.homePin === pinCode);
    },
  },
);
export const fetchBag = thunk(
  "commerce/bag",
  async (_, { extra, signal }) =>
    cartFrom(
      await extra.api.request<{ cart: Cart }>("/cart", {
        auth: "required",
        signal,
      }),
    ),
  { condition: (_, { getState }) => !getState().commerce.pending.bag },
);
export const fetchWishlist = thunk(
  "commerce/wishlist",
  async (_, { extra, signal }) =>
    productsFrom(
      await extra.api.request<{ wishlist: { products: Product[] } }>(
        "/wishlist",
        { auth: "required", signal },
      ),
    ),
  { condition: (_, { getState }) => !getState().commerce.pending.wishlist },
);
export const fetchAddresses = thunk(
  "commerce/addresses",
  async (_, { extra, signal, getState }) => {
    const r = await extra.api.request<{ addresses: Address[] }>(
      "/users/addresses",
      { auth: "required", signal },
    );
    if (!Array.isArray(r.addresses)) throw Error("Addresses are unavailable.");
    // Resolve the location after the request, since a customer can switch areas in-flight.
    const { location } = getState();
    return {
      addresses: r.addresses,
      preferredAddressId: location?.addressId,
      pinCode: location?.pinCode,
    };
  },
  { condition: (_, { getState }) => !getState().commerce.pending.addresses },
);
export const fetchOrders = thunk(
  "commerce/orders",
  async (_, { extra, signal }) => {
    const r = await extra.api.request<{ orders: Order[] }>(
      "/orders/my-orders",
      { auth: "required", signal },
    );
    if (!Array.isArray(r.orders)) throw Error("Orders are unavailable.");
    return r.orders;
  },
  { condition: (_, { getState }) => !getState().commerce.pending.orders },
);
type BagMutation =
  | {
      kind: "add";
      productId: string;
      selectedSize?: string;
      selectedColor?: string;
      variantSku?: string;
    }
  | { kind: "quantity"; itemId: string; quantity: number }
  | { kind: "coupon"; couponCode: string }
  | { kind: "removeCoupon" };
export const changeBag = thunk(
  "commerce/changeBag",
  async (arg: BagMutation, { extra, getState }) => {
    const bag = getState().commerce.bag;
    if (!bag?._id && arg.kind !== "add")
      throw Error("Your bag could not be identified. Refresh it and retry.");
    const path =
      arg.kind === "add"
        ? "/cart/add"
        : arg.kind === "quantity"
          ? "/cart/update"
          : arg.kind === "coupon"
            ? "/cart/apply-coupon"
            : "/cart/remove-coupon";
    const body =
      arg.kind === "add"
        ? {
            productId: arg.productId,
            quantity: 1,
            selectedSize: arg.selectedSize,
            selectedColor: arg.selectedColor,
            variantSku: arg.variantSku,
          }
        : arg.kind === "quantity"
          ? { cartId: bag!._id, itemId: arg.itemId, quantity: arg.quantity }
          : arg.kind === "coupon"
            ? { cartId: bag!._id, couponCode: arg.couponCode.trim() }
            : { cartId: bag!._id };
    return cartFrom(
      await extra.api.request<{ cart: Cart }>(path, {
        method: "POST",
        auth: "required",
        body,
      }),
    );
  },
  { condition: (_, { getState }) => !getState().commerce.busy },
);
export const changeWishlist = thunk(
  "commerce/changeWishlist",
  async ({ id, remove }: { id: string; remove: boolean }, { extra }) =>
    productsFrom(
      await extra.api.request<{ wishlist: { products: Product[] } }>(
        remove ? "/wishlist/" + encode(id) : "/wishlist/add",
        {
          method: remove ? "DELETE" : "POST",
          body: remove ? undefined : { productId: id },
          auth: "required",
        },
      ),
    ),
  { condition: (_, { getState }) => !getState().commerce.busy },
);
export const saveAddress = thunk(
  "commerce/saveAddress",
  async (address: AddressInput & { _id?: string }, { extra }) => {
    const { _id, ...body } = address;
    const r = await extra.api.request<{ address: Address }>(
      "/users/addresses" + (_id ? "/" + encode(_id) : ""),
      { method: _id ? "PUT" : "POST", auth: "required", body },
    );
    if (!r.address?._id) throw Error("Address save was not confirmed.");
    return r.address;
  },
  { condition: (_, { getState }) => !getState().commerce.busy },
);

const auth = createSlice({
  name: "auth",
  initialState: { user: null, ready: false, error: null } as AppState["auth"],
  reducers: {
    setUser(s, a: PayloadAction<User | null>) {
      s.user = a.payload;
    },
    ready(s, a: PayloadAction<string | undefined>) {
      s.ready = true;
      s.error = a.payload || null;
    },
  },
});
const location = createSlice({
  name: "location",
  initialState: null as DeliveryLocation | null,
  reducers: {
    setLocation: (_, a: PayloadAction<DeliveryLocation | null>) => a.payload,
  },
});
const catalog = createSlice({
  name: "catalog",
  initialState: initialCatalog(),
  reducers: { reset: () => initialCatalog() },
  extraReducers: (b) => {
    b.addCase(fetchCatalog.pending, (s, a) => {
      if (a.meta.arg.page === 1) {
        s.items = [];
        s.page = 0;
        s.hasMore = true;
      }
      s.key = a.meta.arg.key;
      s.loading = true;
      s.error = null;
      s.requestId = a.meta.requestId;
    });
    b.addCase(fetchCatalog.fulfilled, (s, a) => {
      if (s.requestId !== a.meta.requestId) return;
      s.items = mergeProducts(s.items, a.payload.result.products);
      s.page = a.payload.result.pagination.page;
      s.total = a.payload.result.pagination.total;
      s.hasMore = a.payload.result.pagination.hasNextPage === true;
      s.loading = false;
      s.requestId = null;
    });
    b.addCase(fetchCatalog.rejected, (s, a) => {
      if (s.requestId !== a.meta.requestId) return;
      s.loading = false;
      s.requestId = null;
      if (!a.meta.aborted) s.error = a.error.message || "Cannot load products.";
    });
    b.addCase(fetchHome.pending, (s, a) => {
      if (s.homePin !== a.meta.arg) s.home = null;
      s.homePin = a.meta.arg;
      s.homeLoading = true;
      s.homeError = null;
      s.homeId = a.meta.requestId;
    });
    b.addCase(fetchHome.fulfilled, (s, a) => {
      if (s.homeId !== a.meta.requestId || s.homePin !== a.payload.pinCode)
        return;
      s.home = a.payload.result;
      s.homeLoading = false;
      s.homeId = null;
    });
    b.addCase(fetchHome.rejected, (s, a) => {
      if (s.homeId !== a.meta.requestId) return;
      s.homeLoading = false;
      s.homeId = null;
      if (!a.meta.aborted)
        s.homeError = a.error.message || "Homepage unavailable.";
    });
    b.addCase(location.actions.setLocation, () => initialCatalog());
  },
});
const commerce = createSlice({
  name: "commerce",
  initialState: initialCommerce(),
  reducers: {
    reset: () => initialCommerce(),
    selectAddress(s, a: PayloadAction<string>) {
      s.selectedAddressId = a.payload;
    },
    removeSavedAddress(s, a: PayloadAction<string>) {
      s.addresses = s.addresses.filter((item) => item._id !== a.payload);
      if (s.selectedAddressId === a.payload) s.selectedAddressId = null;
    },
    markDefaultAddress(s, a: PayloadAction<string>) {
      s.addresses.forEach((item) => {
        item.isDefault = item._id === a.payload;
      });
    },
    replaceBag(s, a: PayloadAction<Cart | null>) {
      s.bag = a.payload;
    },
  },
  extraReducers: (b) => {
    b.addCase(location.actions.setLocation, (s, a) => {
      const next = a.payload;
      if (next?.addressId) {
        s.selectedAddressId = next.addressId;
      } else if (
        !next?.pinCode ||
        !s.addresses.some(
          (address) =>
            address._id === s.selectedAddressId &&
            address.pinCode === next.pinCode,
        )
      ) {
        s.selectedAddressId = null;
      }
    });
    b.addCase(fetchBag.pending, (s, a) => {
      s.pending.bag = a.meta.requestId;
      s.errors.bag = null;
    });
    b.addCase(fetchBag.fulfilled, (s, a) => {
      if (s.pending.bag !== a.meta.requestId) return;
      s.bag = a.payload;
      delete s.pending.bag;
    });
    b.addCase(fetchBag.rejected, (s, a) => {
      if (s.pending.bag !== a.meta.requestId) return;
      s.errors.bag = a.error.message || "Bag unavailable";
      delete s.pending.bag;
    });
    b.addCase(fetchWishlist.pending, (s, a) => {
      s.pending.wishlist = a.meta.requestId;
      s.errors.wishlist = null;
    });
    b.addCase(fetchWishlist.fulfilled, (s, a) => {
      if (s.pending.wishlist !== a.meta.requestId) return;
      s.wishlist = a.payload;
      delete s.pending.wishlist;
    });
    b.addCase(fetchWishlist.rejected, (s, a) => {
      if (s.pending.wishlist !== a.meta.requestId) return;
      s.errors.wishlist = a.error.message || "Wishlist unavailable";
      delete s.pending.wishlist;
    });
    b.addCase(fetchAddresses.pending, (s, a) => {
      s.pending.addresses = a.meta.requestId;
      s.errors.addresses = null;
    });
    b.addCase(fetchAddresses.fulfilled, (s, a) => {
      if (s.pending.addresses !== a.meta.requestId) return;
      s.addresses = a.payload.addresses;
      const { addresses, preferredAddressId, pinCode } = a.payload;
      const isMatching = (id: string | null | undefined) =>
        addresses.find((address) => address._id === id);
      const savedPreferred = isMatching(preferredAddressId);
      const preferred =
        savedPreferred && (!pinCode || savedPreferred.pinCode === pinCode)
          ? savedPreferred
          : undefined;
      const selected = isMatching(s.selectedAddressId);
      const byPin = pinCode
        ? addresses.find((address) => address.pinCode === pinCode)
        : undefined;
      // Never silently ship to a saved address in a different delivery PIN.
      s.selectedAddressId =
        preferred?._id ||
        (selected && (!pinCode || selected.pinCode === pinCode)
          ? selected._id
          : undefined) ||
        byPin?._id ||
        (!pinCode
          ? addresses.find((address) => address.isDefault)?._id ||
            addresses[0]?._id
          : undefined) ||
        null;
      delete s.pending.addresses;
    });
    b.addCase(fetchAddresses.rejected, (s, a) => {
      if (s.pending.addresses !== a.meta.requestId) return;
      s.errors.addresses = a.error.message || "Addresses unavailable";
      delete s.pending.addresses;
    });
    b.addCase(fetchOrders.pending, (s, a) => {
      s.pending.orders = a.meta.requestId;
      s.errors.orders = null;
    });
    b.addCase(fetchOrders.fulfilled, (s, a) => {
      if (s.pending.orders !== a.meta.requestId) return;
      s.orders = a.payload;
      delete s.pending.orders;
    });
    b.addCase(fetchOrders.rejected, (s, a) => {
      if (s.pending.orders !== a.meta.requestId) return;
      s.errors.orders = a.error.message || "Orders unavailable";
      delete s.pending.orders;
    });
    b.addCase(changeBag.pending, (s, a) => {
      delete s.pending.bag;
      s.busy = true;
      s.pending.mutation = a.meta.requestId;
    });
    b.addCase(changeBag.fulfilled, (s, a) => {
      if (s.pending.mutation !== a.meta.requestId) return;
      s.bag = a.payload;
      s.busy = false;
      delete s.pending.mutation;
    });
    b.addCase(changeWishlist.pending, (s, a) => {
      delete s.pending.wishlist;
      s.busy = true;
      s.pending.mutation = a.meta.requestId;
    });
    b.addCase(changeWishlist.fulfilled, (s, a) => {
      if (s.pending.mutation !== a.meta.requestId) return;
      s.wishlist = a.payload;
      s.busy = false;
      delete s.pending.mutation;
    });
    b.addCase(saveAddress.pending, (s, a) => {
      delete s.pending.addresses;
      s.busy = true;
      s.pending.mutation = a.meta.requestId;
    });
    b.addCase(saveAddress.fulfilled, (s, a) => {
      if (s.pending.mutation !== a.meta.requestId) return;
      const index = s.addresses.findIndex((x) => x._id === a.payload._id);
      if (index >= 0) s.addresses[index] = a.payload;
      else s.addresses.push(a.payload);
      s.selectedAddressId = a.payload._id;
      s.busy = false;
      delete s.pending.mutation;
    });
    b.addMatcher(
      (a) =>
        [
          changeBag.rejected.type,
          changeWishlist.rejected.type,
          saveAddress.rejected.type,
        ].includes(a.type),
      (s, a: { meta: { requestId: string }; error: { message?: string } }) => {
        if (s.pending.mutation !== a.meta.requestId) return;
        s.busy = false;
        s.errors.mutation = a.error.message || "Unable to save";
        delete s.pending.mutation;
      },
    );
  },
});
export const actions = {
  ...auth.actions,
  ...commerce.actions,
  setLocation: location.actions.setLocation,
  resetCatalog: catalog.actions.reset,
};
export function buildStore(extra: Extra) {
  const store = configureStore({
    reducer: {
      auth: auth.reducer,
      publicSettings: publicSettings.reducer,
      catalog: catalog.reducer,
      commerce: commerce.reducer,
      location: location.reducer,
    },
    middleware: (g) => g({ thunk: { extraArgument: extra } }),
  });
  let identity = extra.session.get()?.user.id || null;
  extra.session.subscribe(() => {
    const user = extra.session.get()?.user || null;
    if (identity !== (user?.id || null)) {
      store.dispatch(commerce.actions.reset());
      const delivery = store.getState().location;
      if ((identity && delivery) || delivery?.addressId)
        store.dispatch(
          location.actions.setLocation(publicLocationAfterSignOut(delivery)),
        );
      identity = user?.id || null;
    }
    store.dispatch(auth.actions.setUser(user));
  });
  return store;
}
export type AppStore = ReturnType<typeof buildStore>;
export type AppDispatch = AppStore["dispatch"];
