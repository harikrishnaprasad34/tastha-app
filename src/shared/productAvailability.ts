import { isSizeValidForCategory } from "./productSizeConfig";
export interface ProductVariantAvailability {
  _id?: string;
  id?: string;
  size?: string;
  color?: string;
  sku?: string;
  price?: number;
  stock?: number;
  isActive?: boolean;
  active?: boolean;
  status?: string;
}

export interface ProductAvailabilityData {
  _id?: string;
  id?: string;
  category?: string;
  stock?: number;
  status?: string;
  numericStatus?: number;
  inStock?: boolean;
  isActive?: boolean;
  isPublished?: boolean;
  approved?: boolean;
  published?: boolean;
  isDraft?: boolean;
  isDeleted?: boolean;
  isArchived?: boolean;
  variants?: ProductVariantAvailability[];
}

export function getKnownProductStock(
  product:
    Pick<ProductAvailabilityData, "stock" | "variants"> | null | undefined,
): number | null {
  if (!product) return null;

  if (Array.isArray(product.variants) && product.variants.length > 0) {
    let total = 0;
    for (const variant of product.variants) {
      if (
        typeof variant.stock !== "number" ||
        !Number.isSafeInteger(variant.stock) ||
        variant.stock < 0
      )
        return null;
      total += variant.stock;
      if (!Number.isSafeInteger(total)) return null;
    }
    return total;
  }

  return typeof product.stock === "number" &&
    Number.isSafeInteger(product.stock) &&
    product.stock >= 0
    ? product.stock
    : null;
}

export type VariantAvailability =
  | { status: "available"; stock: number; variant?: ProductVariantAvailability }
  | { status: "out_of_stock"; stock: 0; variant?: ProductVariantAvailability }
  | {
      status: "inventory_unknown";
      stock: null;
      variant?: ProductVariantAvailability;
    }
  | { status: "selection_required"; stock: null }
  | {
      status: "unavailable";
      stock: null;
      variant?: ProductVariantAvailability;
    };

const normalize = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

export function isCatalogProductActive(
  product: ProductAvailabilityData | null | undefined,
): boolean {
  if (
    !product ||
    product.approved === false ||
    product.published === false ||
    product.isActive === false ||
    product.isPublished === false ||
    product.isDraft ||
    product.isDeleted ||
    product.isArchived ||
    [0, 3].includes(Number(product.numericStatus ?? 1))
  ) {
    return false;
  }

  return !/^(draft|inactive|archived|deleted)$/.test(normalize(product.status));
}

export function isCatalogProductPurchasable(
  product: ProductAvailabilityData | null | undefined,
): boolean {
  const status = normalize(product?.status).replace(/[\s_-]+/g, "_");
  return (
    isCatalogProductActive(product) &&
    Number(product?.numericStatus ?? 1) !== 2 &&
    status !== "out_of_stock"
  );
}

export function getVariantAvailability(
  product: ProductAvailabilityData | null | undefined,
  selection: { size?: string; color?: string; sku?: string } = {},
): VariantAvailability {
  if (!isCatalogProductPurchasable(product))
    return { status: "unavailable", stock: null };

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (variants.length > 0) {
    const size = normalize(selection.size);
    const color = normalize(selection.color);
    const sku = normalize(selection.sku);
    if (!sku && (!size || !color))
      return { status: "selection_required", stock: null };

    const variant = variants.find((candidate) =>
      sku
        ? normalize(candidate.sku) === sku
        : normalize(candidate.size) === size &&
          normalize(candidate.color) === color,
    );
    if (
      !variant ||
      !isSizeValidForCategory(
        product?.category || "",
        String(variant.size || ""),
      ) ||
      variant.isActive === false ||
      variant.active === false ||
      /^(inactive|archived|deleted)$/.test(normalize(variant.status))
    ) {
      return { status: "unavailable", stock: null, variant };
    }

    if (
      typeof variant.stock !== "number" ||
      !Number.isSafeInteger(variant.stock) ||
      variant.stock < 0
    ) {
      return { status: "inventory_unknown", stock: null, variant };
    }
    if (variant.stock === 0)
      return { status: "out_of_stock", stock: 0, variant };
    return { status: "available", stock: variant.stock, variant };
  }

  if (
    typeof product?.stock !== "number" ||
    !Number.isSafeInteger(product.stock) ||
    product.stock < 0
  ) {
    return { status: "inventory_unknown", stock: null };
  }
  if (product.stock === 0) return { status: "out_of_stock", stock: 0 };
  return { status: "available", stock: product.stock };
}

export function resolveCartVariant(
  product: ProductAvailabilityData | null | undefined,
  selection?: { size?: string; color?: string; sku?: string },
): VariantAvailability {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (
    variants.length === 0 ||
    selection?.sku ||
    (selection?.size && selection?.color)
  ) {
    return getVariantAvailability(product, selection);
  }

  if (!isCatalogProductPurchasable(product))
    return { status: "unavailable", stock: null };
  const requestedSize = normalize(selection?.size);
  const requestedColor = normalize(selection?.color);
  const matching = variants.filter(
    (variant) =>
      (!requestedSize || normalize(variant.size) === requestedSize) &&
      (!requestedColor || normalize(variant.color) === requestedColor),
  );
  const available = variants.filter(
    (variant) =>
      matching.includes(variant) &&
      isSizeValidForCategory(
        product?.category || "",
        String(variant.size || ""),
      ) &&
      variant.isActive !== false &&
      variant.active !== false &&
      !/^(inactive|archived|deleted)$/.test(normalize(variant.status)) &&
      typeof variant.stock === "number" &&
      Number.isSafeInteger(variant.stock) &&
      variant.stock > 0,
  );

  if (available.length === 1) {
    const variant = available[0];
    return { status: "available", stock: variant.stock!, variant };
  }
  if (available.length > 1)
    return { status: "selection_required", stock: null };
  if (
    matching.some(
      (variant) =>
        typeof variant.stock !== "number" ||
        !Number.isSafeInteger(variant.stock),
    )
  ) {
    return { status: "inventory_unknown", stock: null };
  }
  if (!matching.length) return { status: "unavailable", stock: null };
  return { status: "out_of_stock", stock: 0 };
}
