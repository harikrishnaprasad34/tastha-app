import { catalogQueryKeys } from "../shared/catalogFilters";
const routes: Record<string, string> = {
  Contact: "/contact",
  Security: "/security",
  SavedLooks: "/saved-looks",
  Otp: "/otp",
  Recovery: "/recovery",
  Home: "/(tabs)",
  Shop: "/(tabs)/shop",
  Wishlist: "/(tabs)/wishlist",
  Bag: "/(tabs)/bag",
  Account: "/(tabs)/account",
  EditProfile: "/edit-profile",
  OrderDetail: "/order/",
  Login: "/login",
  Signup: "/signup",
  Addresses: "/addresses",
  AddressForm: "/address-form",
  Orders: "/orders",
  Checkout: "/checkout",
  Location: "/location",
  AI: "/ai",
  Search: "/search",
};
export function routeFor(name: string, id?: string) {
  if (name === "Review" && id) return "/review?" + id;
  if (name === "PaymentStatus")
    return "/payment-status" + (id ? "?id=" + encodeURIComponent(id) : "");
  if (name === "AddressForm" && id)
    return "/address-form?id=" + encodeURIComponent(id);
  if (name === "StoreLink") return storeLink(id);
  if (name === "Help") {
    if (!id || !["faq", "terms", "privacy", "shipping", "returns"].includes(id))
      throw Error("Choose a valid Tastha help section.");
    return "/help/" + id;
  }
  if (name === "TrackOrder") {
    if (!id) throw Error("An order identifier is required.");
    return "/order/" + encodeURIComponent(id) + "/tracking";
  }
  if (name === "OrderDetail") {
    if (!id) throw Error("An order identifier is required.");
    return "/order/" + encodeURIComponent(id);
  }
  if (name === "SearchResults") {
    if (!id?.trim()) throw Error("Enter a search term.");
    return "/(tabs)/shop?search=" + encodeURIComponent(id.trim());
  }
  if (name === "Shop" && id)
    return "/(tabs)/shop?category=" + encodeURIComponent(id);
  if (name === "Product") {
    if (!id) throw Error("A product identifier is required.");
    return "/product/" + encodeURIComponent(id);
  }
  const path = routes[name];
  if (!path) throw Error("Unknown Tastha screen.");
  return path;
}

export function storeLink(value?: string): string {
  if (!value || !/^\/(?!\/)/.test(value) || /[\\\s\x00-\x1f]/.test(value))
    return "/(tabs)/shop";
  const [path, query] = value.split("?");
  const q = new URLSearchParams(query);
  if (
    ["/shop", "/products", "/offers", "/collections", "/categories"].includes(
      path,
    )
  ) {
    const allowed = new URLSearchParams();
    for (const key of catalogQueryKeys)
      if (q.has(key)) allowed.set(key, q.get(key)!);
    return "/(tabs)/shop" + (allowed.size ? "?" + allowed : "");
  }
  const decode = (value: string) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return "";
    }
  };
  const product = path.match(/^\/product[s]?\/([^/]+)$/);
  if (product && decode(product[1]))
    return "/product/" + encodeURIComponent(decode(product[1]));
  const category = path.match(
    /^\/(?:shop\/category|category|categories|collections)\/([^/]+)$/,
  );
  if (category && decode(category[1]))
    return "/(tabs)/shop?category=" + encodeURIComponent(decode(category[1]));
  if (path === "/contact") return "/contact";
  if (path === "/choose-occasion")
    return (
      "/ai" +
      (q.get("occasion")
        ? "?occasion=" + encodeURIComponent(q.get("occasion")!)
        : "")
    );
  return "/(tabs)/shop";
}
