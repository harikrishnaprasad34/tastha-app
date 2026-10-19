import type { Product, Variant, CartLine } from "../models";
export function mergeProducts(old: Product[], next: Product[]) {
  const map = new Map(old.map((p) => [p._id, p]));
  for (const p of next) if (p && typeof p._id === "string") map.set(p._id, p);
  return [...map.values()];
}
export function imageUrl(value: unknown, origin: string): string | undefined {
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    return imageUrl(v.url || v.secure_url || v.src, origin);
  }
  if (typeof value !== "string") return;
  // Website CMS categories can contain embedded raster images. Never allow
  // SVG/HTML data URLs or unbounded payloads through the native image surface.
  if (value.startsWith("data:")) {
    return value.length <= 4 * 1024 * 1024 &&
      /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
      ? value
      : undefined;
  }
  try {
    const url = new URL(value, origin);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return;
  }
}
export function productImages(
  product: Product,
  origin: string,
  variant?: Variant,
) {
  // Selected-variant photos take precedence; never silently choose another colour's image.
  const sources = variant?.images?.length
    ? variant.images
    : variant?.image
      ? [variant.image]
      : variant
        ? []
        : product.images?.length
          ? product.images
          : [product.image];
  return [
    ...new Set(
      sources
        .map((v) => imageUrl(v, origin))
        .filter((s): s is string => Boolean(s)),
    ),
  ];
}
export function linePayload(lines: CartLine[]) {
  return lines.map((l) => ({
    productId: l.product._id,
    quantity: l.quantity,
    selectedSize: l.selectedSize,
    selectedColor: l.selectedColor,
    variantSku: l.variantSku,
  }));
}
export const money = (value: number) =>
  Number.isFinite(value)
    ? "₹" + value.toLocaleString("en-IN", { maximumFractionDigits: 2 })
    : "Price unavailable";
export function checkoutFingerprint(
  cart: { _id: string; items: CartLine[] },
  address: unknown,
  coupon: string,
  total: number,
) {
  return JSON.stringify([
    cart._id,
    linePayload(cart.items).sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b)),
    ),
    address,
    coupon.trim(),
    total,
  ]);
}

/** Use actual related products from the product endpoint; never fabricate matches. */
export function normalizeRelatedProducts(
  currentProductId: string,
  candidates: unknown,
): Product[] {
  if (!Array.isArray(candidates)) return [];
  const seen = new Set<string>([currentProductId]);
  return candidates
    .filter((item): item is Product => {
      if (
        !item ||
        typeof item !== "object" ||
        typeof item._id !== "string" ||
        typeof item.name !== "string" ||
        !Number.isFinite(item.price) ||
        item.isDeleted === true ||
        seen.has(item._id)
      )
        return false;
      seen.add(item._id);
      return true;
    })
    .slice(0, 8);
}
