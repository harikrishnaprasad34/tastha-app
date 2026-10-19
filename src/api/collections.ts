import type { ApiClient } from "./client";
import type { Product } from "../models";
import type { DeliveryEligibility } from "./deliveryEligibility";
export interface StoreCollection {
  _id: string;
  slug: string;
  title: string;
  description?: string;
  image?: string;
  isActive?: boolean;
}
export interface CollectionDetail {
  collection: StoreCollection;
  products: Product[];
  delivery?: DeliveryEligibility;
}
function validCollection(value: unknown): value is StoreCollection {
  if (!value || typeof value !== "object") return false;
  const c = value as StoreCollection;
  return (
    typeof c._id === "string" &&
    !!c._id &&
    typeof c.slug === "string" &&
    !!c.slug &&
    typeof c.title === "string" &&
    !!c.title.trim() &&
    c.isActive !== false
  );
}
export async function loadCollections(api: ApiClient, signal?: AbortSignal) {
  const response = await api.request<{ collections: unknown }>("/collections", {
    signal,
  });
  if (
    !Array.isArray(response.collections) ||
    !response.collections.every(validCollection)
  )
    throw Error("Collections could not be loaded. Please retry.");
  return response.collections;
}
export async function loadCollection(
  api: ApiClient,
  slug: string,
  pin: string,
  signal?: AbortSignal,
): Promise<CollectionDetail> {
  if (!slug.trim()) throw Error("Choose a collection.");
  const q = new URLSearchParams({ limit: "40", deliveryPinCode: pin });
  const r = await api.request<CollectionDetail>(
    "/collections/" + encodeURIComponent(slug) + "?" + q,
    { signal },
  );
  if (
    !validCollection(r.collection) ||
    r.collection.slug !== slug ||
    !Array.isArray(r.products)
  )
    throw Error("This collection could not be verified. Please retry.");
  if (r.delivery && r.delivery.configured && r.delivery.serviceable !== true)
    return { ...r, products: [] };
  const seen = new Set<string>();
  const products = r.products.filter((p) => {
    if (
      !p ||
      typeof p._id !== "string" ||
      typeof p.name !== "string" ||
      !Number.isFinite(p.price) ||
      p.price < 0 ||
      p.isDeleted ||
      seen.has(p._id)
    )
      return false;
    seen.add(p._id);
    return true;
  });
  return { ...r, products };
}
