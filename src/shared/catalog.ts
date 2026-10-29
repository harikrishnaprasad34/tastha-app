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
  // CMS category artwork may be embedded. Only allow bounded raster payloads;
  // SVG, HTML and arbitrary data URLs must never become image sources.
  if (value.startsWith("data:"))
    return value.length <= 4 * 1024 * 1024 &&
      /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(
        value,
      )
      ? value
      : undefined;
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
export function cartLineImage(line: CartLine, origin: string) {
  const variants = line.product.variants || [];
  const variant = variants.find((v) =>
    line.variantSku
      ? v.sku === line.variantSku
      : v.size === line.selectedSize && v.color === line.selectedColor,
  );
  // Never display another colour's thumbnail when a selected variant has no image.
  return productImages(
    line.product,
    origin,
    variant ||
      (variants.length
        ? { size: line.selectedSize || "", color: line.selectedColor || "" }
        : undefined),
  )[0];
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
