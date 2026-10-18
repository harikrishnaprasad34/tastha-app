const routes: Record<string, string> = {
  Home: "/(tabs)",
  Shop: "/(tabs)/shop",
  Wishlist: "/(tabs)/wishlist",
  Bag: "/(tabs)/bag",
  Account: "/(tabs)/account",
  EditProfile: "/edit-profile",
  OrderDetail: "/order/",
  Login: "/login",
  Addresses: "/addresses",
  AddressForm: "/address-form",
  Orders: "/orders",
  Checkout: "/checkout",
  Location: "/location",
  AI: "/ai",
};
export function routeFor(name: string, id?: string) {
  if (name === "TrackOrder") {
    if (!id) throw Error("An order identifier is required.");
    return "/order/" + encodeURIComponent(id) + "/tracking";
  }
  if (name === "OrderDetail") {
    if (!id) throw Error("An order identifier is required.");
    return "/order/" + encodeURIComponent(id);
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
