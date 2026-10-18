import { ApiError } from "./client";
import type { ApiClient } from "./client";
import type { Discovery, Product } from "../models";

interface BannersResponse {
  banners?: Discovery["banners"];
}
interface CategoriesResponse {
  categories?: Discovery["categories"];
}
interface ProductsResponse {
  products?: Product[];
}
interface OccasionsResponse {
  occasions?: Discovery["occasions"];
}

/**
 * The website has separate public endpoints for its CMS-backed homepage.
 * The mobile app must use those same endpoints, not /home/discovery (404).
 * Independent sections can load despite one optional endpoint failing.
 */
export async function loadStorefrontHome(
  api: ApiClient,
  pinCode: string,
  signal?: AbortSignal,
): Promise<Discovery> {
  const pin = encodeURIComponent(pinCode);
  try {
    const home = await api.request<Discovery>(
      "/home/discovery?deliveryPinCode=" + pin,
      { signal },
    );
    if (
      !Array.isArray(home.sections) ||
      !Array.isArray(home.categories) ||
      !Array.isArray(home.banners)
    )
      throw Error("The storefront response is incomplete. Please retry.");
    return home;
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error;
  }
  const requests = [
    api.request<BannersResponse>("/home/banners?deliveryPinCode=" + pin, {
      signal,
    }),
    api.request<CategoriesResponse>("/home/categories?deliveryPinCode=" + pin, {
      signal,
    }),
    api.request<ProductsResponse>(
      "/home/trending?limit=6&deliveryPinCode=" + pin,
      { signal },
    ),
    api.request<ProductsResponse>(
      "/home/new-arrivals?limit=6&deliveryPinCode=" + pin,
      { signal },
    ),
    api.request<OccasionsResponse>("/home/occasions?deliveryPinCode=" + pin, {
      signal,
    }),
  ] as const;
  const results = await Promise.allSettled(requests);
  if (signal?.aborted) throw Error("Homepage request cancelled.");
  if (results.every((r) => r.status === "rejected"))
    throw Error("Cannot load Tastha collections. Please retry.");
  const value = <T>(i: number): T | null => {
    const result = results[i];
    return result.status === "fulfilled" ? (result.value as T) : null;
  };
  const banners = value<BannersResponse>(0)?.banners;
  const categories = value<CategoriesResponse>(1)?.categories;
  const trending = value<ProductsResponse>(2)?.products;
  const arrivals = value<ProductsResponse>(3)?.products;
  const occasions = value<OccasionsResponse>(4)?.occasions;
  return {
    success: true,
    banners: Array.isArray(banners) ? banners : [],
    categories: Array.isArray(categories) ? categories : [],
    occasions: Array.isArray(occasions) ? occasions : [],
    sections: [
      ...(Array.isArray(trending) && trending.length
        ? [{ id: "trending", title: "Trending Now", products: trending }]
        : []),
      ...(Array.isArray(arrivals) && arrivals.length
        ? [{ id: "new", title: "New Arrivals", products: arrivals }]
        : []),
    ],
  };
}
