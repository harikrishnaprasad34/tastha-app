import type { ApiClient } from "./client";
export const staffRoles = [
  "ADMIN",
  "SUPER_ADMIN",
  "STORE_MANAGER",
  "AI_STYLIST_MANAGER",
  "ORDER_MANAGER",
  "ORDER_SUPPORT",
  "VIEWER",
  "ANALYST",
];
export const isStaffRole = (role: string) => staffRoles.includes(role);
export type AdminModule = "dashboard" | "orders" | "products";
export function hasAdminPermission(permissions: string[], key: string) {
  return (
    permissions.includes("*") ||
    permissions.includes(key) ||
    permissions.includes(key.split(".")[0] + ".*")
  );
}
export type AdminMetric = {
  value: number | null;
  unit: string;
  availability: string;
  reason?: string;
  scope?: string;
  basis?: string;
};
export type AdminRecord = {
  _id: string;
  name?: string;
  orderNumber?: string;
  orderStatus?: string;
  paymentStatus?: string;
  totalAmount?: number;
  price?: number;
  status?: string;
  sku?: string;
};
export type AdminSnapshot = {
  permissions: string[];
  metrics?: Record<string, AdminMetric>;
  records: AdminRecord[];
  page: number;
  totalPages: number;
  total?: number;
  generatedAt?: string;
};
export async function loadAdminModule(
  api: ApiClient,
  module: AdminModule,
  page = 1,
  search = "",
  signal?: AbortSignal,
): Promise<AdminSnapshot> {
  const access = await api.request<{ role: string; permissions: string[] }>(
    "/admin/access",
    { auth: "required", signal },
  );
  if (
    !isStaffRole(access.role) ||
    !Array.isArray(access.permissions) ||
    !access.permissions.every((p) => typeof p === "string")
  )
    throw Error("Staff access could not be verified.");
  if (!hasAdminPermission(access.permissions, module + ".view"))
    throw Error("Your staff permissions do not allow this view.");
  const query =
    module === "dashboard"
      ? "timeframe=30d"
      : new URLSearchParams({
          page: String(Math.max(1, Math.floor(page))),
          limit: "20",
          search: search.trim().slice(0, 200),
        }).toString();
  const data = await api.request<{
    metrics?: Record<string, AdminMetric>;
    orders?: AdminRecord[];
    products?: AdminRecord[];
    pagination?: { page: number; totalPages: number; total: number };
    generatedAt?: string;
  }>("/admin/" + module + "?" + query, { auth: "required", signal });
  if (module === "dashboard") {
    if (
      !data.metrics ||
      typeof data.metrics !== "object" ||
      Array.isArray(data.metrics)
    )
      throw Error("Dashboard metrics could not be verified.");
    return {
      permissions: access.permissions,
      metrics: data.metrics,
      records: [],
      page: 1,
      totalPages: 1,
      generatedAt: data.generatedAt,
    };
  }
  const records = module === "orders" ? data.orders : data.products;
  const p = data.pagination;
  if (
    !Array.isArray(records) ||
    !records.every((r) => r && typeof r._id === "string") ||
    !p ||
    !Number.isSafeInteger(p.page) ||
    p.page < 1 ||
    !Number.isSafeInteger(p.totalPages) ||
    p.totalPages < p.page ||
    !Number.isSafeInteger(p.total) ||
    p.total < 0
  )
    throw Error("The staff list could not be verified. Please retry.");
  return {
    permissions: access.permissions,
    records,
    page: p.page,
    totalPages: p.totalPages,
    total: p.total,
  };
}
export function adminMetricText(metric?: AdminMetric) {
  if (
    !metric ||
    metric.availability !== "available" ||
    typeof metric.value !== "number" ||
    !Number.isFinite(metric.value)
  )
    return "Unavailable";
  return metric.unit === "INR"
    ? "₹" + metric.value.toLocaleString("en-IN", { maximumFractionDigits: 2 })
    : String(metric.value);
}
