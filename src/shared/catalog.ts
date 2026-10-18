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
