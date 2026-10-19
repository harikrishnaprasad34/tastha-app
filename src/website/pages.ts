import { WEBSITE } from "../config";

export interface WebsitePage {
  id: string;
  title: string;
  path: string;
  group: "Shopping" | "Style studio" | "Account" | "Help" | "Administration";
}

// Verified against tastha_official's AdminPortalRoutes and routes.js.
// Aliases and record-specific routes remain accessible through website navigation.
export const websitePages: WebsitePage[] = [
  { id: "home", title: "Home", path: "/", group: "Shopping" },
  { id: "shop", title: "All products", path: "/shop", group: "Shopping" },
  ...[
    "men",
    "women",
    "kids",
    "jewellery",
    "footwear",
    "accessories",
    "collections",
    "categories",
    "offers",
    "search",
  ].map((id) => ({
    id,
    title: id[0].toUpperCase() + id.slice(1),
    path: "/" + id,
    group: "Shopping" as const,
  })),
  { id: "wishlist", title: "Wishlist", path: "/wishlist", group: "Shopping" },
  { id: "cart", title: "Shopping bag", path: "/cart", group: "Shopping" },
  { id: "checkout", title: "Checkout", path: "/checkout", group: "Shopping" },
  {
    id: "occasion",
    title: "Choose occasion",
    path: "/choose-occasion",
    group: "Style studio",
  },
  {
    id: "recommendations",
    title: "AI recommendations",
    path: "/ai-recommendations",
    group: "Style studio",
  },
  {
    id: "perfect-look",
    title: "Perfect look",
    path: "/perfect-look",
    group: "Style studio",
  },
  {
    id: "complete-look",
    title: "Complete your look",
    path: "/complete-look",
    group: "Style studio",
  },
  {
    id: "saved-looks",
    title: "Saved looks",
    path: "/profile/saved-looks",
    group: "Style studio",
  },
  { id: "profile", title: "My profile", path: "/profile", group: "Account" },
  {
    id: "edit-profile",
    title: "Edit profile",
    path: "/profile/edit",
    group: "Account",
  },
  {
    id: "orders",
    title: "My orders and tracking",
    path: "/orders",
    group: "Account",
  },
  {
    id: "password",
    title: "Change password",
    path: "/changepassword",
    group: "Account",
  },
  { id: "login", title: "Sign in", path: "/login", group: "Account" },
  { id: "signup", title: "Create account", path: "/signup", group: "Account" },
  { id: "otp", title: "Verify code", path: "/otp", group: "Account" },
  {
    id: "recovery",
    title: "Forgot password",
    path: "/forget-password",
    group: "Account",
  },
  ...[
    ["about", "About Tastha", "/about"],
    ["contact", "Contact us", "/contact"],
    ["faq", "Help and FAQs", "/faq"],
    ["careers", "Careers", "/careers"],
    ["privacy", "Privacy policy", "/privacy-policy"],
    ["terms", "Terms and conditions", "/terms"],
    ["shipping", "Shipping policy", "/shipping-policy"],
    ["returns", "Return policy", "/return-policy"],
  ].map(([id, title, path]) => ({ id, title, path, group: "Help" as const })),
  ...[
    ["dashboard", "Dashboard"],
    ["storefront-content", "Storefront content"],
    ["products", "Products"],
    ["brands", "Brands"],
    ["inventory", "Inventory"],
    ["categories", "Categories"],
    ["orders", "Orders"],
    ["customers", "Customers"],
    ["users", "Staff and users"],
    ["roles", "Roles"],
    ["permissions", "Permissions"],
    ["coupons", "Coupons"],
    ["ai-stylist", "AI stylist"],
    ["reports", "Reports"],
    ["sales-analytics", "Sales analytics"],
    ["broadcasts", "Broadcasts"],
    ["templates", "Templates"],
    ["support", "Support inbox"],
    ["settings", "Settings"],
    ["audit-logs", "Audit logs"],
    ["profile", "Admin profile"],
  ].map(([id, title]) => ({
    id: "admin-" + id,
    title,
    path: "/admin/" + id,
    group: "Administration" as const,
  })),
];

export const websiteOrigin = new URL(WEBSITE).origin;
export function websitePage(id: string | undefined) {
  return websitePages.find((page) => page.id === id);
}
export function trustedWebsiteUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.origin === websiteOrigin &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
export function websitePageUrl(page: WebsitePage) {
  return new URL(page.path, websiteOrigin).href;
}
export function externalWebsiteLink(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      !url.username &&
      !url.password &&
      ["https:", "mailto:", "tel:", "upi:"].includes(url.protocol)
    );
  } catch {
    return false;
  }
}
