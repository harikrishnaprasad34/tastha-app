import type { Product } from "../models";
import { getVariantAvailability } from "./productAvailability";
export function quickAddSelection(
  product: Product,
  size: string,
  color: string,
) {
  const availability = getVariantAvailability(product, { size, color });
  if (availability.status !== "available")
    throw Error("Choose an available size and colour.");
  return {
    kind: "add" as const,
    productId: product._id,
    selectedSize: size || undefined,
    selectedColor: color || undefined,
    variantSku: availability.variant?.sku,
  };
}
