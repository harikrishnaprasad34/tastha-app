import type { CatalogFilter } from "../models";
export function catalogFilterError(filter: CatalogFilter): string {
  const min = filter.minPrice?.trim() || "",
    max = filter.maxPrice.trim();
  if (
    [min, max].some(
      (value) =>
        value && (!Number.isFinite(Number(value)) || Number(value) < 0),
    )
  )
    return "Enter a valid price range.";
  if (min && max && Number(min) > Number(max))
    return "Minimum price must not exceed maximum price.";
  if ((filter.brand?.trim().length || 0) > 200)
    return "Brand must be 200 characters or fewer.";
  return "";
}
export function appendCatalogFilters(
  query: URLSearchParams,
  filter: CatalogFilter,
) {
  const error = catalogFilterError(filter);
  if (error) throw Error(error);
  if (filter.minPrice?.trim()) query.set("minPrice", filter.minPrice.trim());
  if (filter.maxPrice.trim()) query.set("maxPrice", filter.maxPrice.trim());
  if (filter.brand?.trim()) query.set("brand", filter.brand.trim());
  if (filter.offersOnly) query.set("offersOnly", "true");
}

export const catalogQueryKeys = [
  "category",
  "search",
  "sort",
  "maxPrice",
  "minPrice",
  "brand",
  "offersOnly",
] as const;
export function catalogRouteFilter(
  params: Record<string, unknown>,
): CatalogFilter {
  const text = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : "";
  return {
    search: text("search"),
    category: text("category"),
    sort: text("sort") || "newest",
    maxPrice: text("maxPrice"),
    minPrice: text("minPrice"),
    brand: text("brand"),
    offersOnly: text("offersOnly") === "true",
  };
}
export function catalogRouteParams(filter: CatalogFilter) {
  return {
    search: filter.search,
    category: filter.category,
    sort: filter.sort,
    maxPrice: filter.maxPrice,
    minPrice: filter.minPrice || "",
    brand: filter.brand || "",
    offersOnly: filter.offersOnly ? "true" : "",
  };
}
