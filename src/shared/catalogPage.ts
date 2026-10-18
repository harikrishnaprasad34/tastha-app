import type { Page } from "../models";

/**
 * Normalize the website's /products response (page/limit/total/totalPages).
 * Newer servers can alternatively return hasNextPage.
 */
export function normalizeProductPage(
  payload: Page,
  expectedPage: number,
): Page {
  if (
    !Array.isArray(payload?.products) ||
    !Number.isInteger(payload.pagination?.page) ||
    payload.pagination.page !== expectedPage ||
    !Number.isFinite(payload.pagination?.total) ||
    payload.pagination.total < 0
  ) {
    throw Error("Product paging is temporarily unavailable. Retry.");
  }
  const { pagination } = payload;
  const totalPages =
    Number.isInteger(pagination.totalPages) && (pagination.totalPages ?? -1) >= 0
      ? pagination.totalPages!
      : Number.isInteger(pagination.limit) && (pagination.limit ?? 0) > 0
        ? Math.ceil(pagination.total / pagination.limit!)
        : undefined;
  const hasNextPage =
    typeof pagination.hasNextPage === "boolean"
      ? pagination.hasNextPage
      : totalPages !== undefined
        ? expectedPage < totalPages
        : undefined;
  if (hasNextPage === undefined)
    throw Error("Product paging is temporarily unavailable. Retry.");
  return {
    ...payload,
    pagination: { ...pagination, hasNextPage },
  };
}
