import { describe, expect, it, vi } from "vitest";
import {
  adminMetricText,
  hasAdminPermission,
  isStaffRole,
  loadAdminModule,
} from "../src/api/admin";
import { createSessionManager } from "../src/api/session";
import type { ApiClient } from "../src/api/client";
const staff = {
  accessToken: "a",
  refreshToken: "r",
  user: { id: "staff1", fullName: "Staff", role: "ORDER_SUPPORT" },
};
const storage = () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
});
describe("isolated native staff workspace", () => {
  it("keeps customer authentication restricted and rejects customer tokens in the staff store", async () => {
    await expect(createSessionManager(storage()).save(staff)).rejects.toThrow();
    const customer = { ...staff, user: { ...staff.user, role: "CUSTOMER" } };
    const manager = createSessionManager(storage(), isStaffRole);
    await expect(manager.save(customer)).rejects.toThrow();
    await manager.save(staff);
    expect(manager.get()).toEqual(staff);
  });
  it("isolates staff and customer sign-out", async () => {
    const customer = createSessionManager(storage());
    const admin = createSessionManager(storage(), isStaffRole);
    await customer.save({
      ...staff,
      user: { ...staff.user, role: "CUSTOMER" },
    });
    await admin.save(staff);
    await admin.clear();
    expect(customer.get()?.user.role).toBe("CUSTOMER");
    expect(admin.get()).toBeNull();
  });
  it("does not grant permissions from a role name or a similar permission prefix", () => {
    expect(hasAdminPermission([], "orders.view")).toBe(false);
    expect(hasAdminPermission(["orders.update"], "orders.view")).toBe(false);
    expect(hasAdminPermission(["orders.*"], "orders.view")).toBe(true);
    expect(hasAdminPermission(["*"], "products.view")).toBe(true);
    expect(hasAdminPermission(["orders.*"], "products.view")).toBe(false);
  });
  it("checks server permissions before fetching private records", async () => {
    const request = vi
      .fn()
      .mockResolvedValue({ role: "ADMIN", permissions: [] });
    await expect(
      loadAdminModule({ request } as unknown as ApiClient, "orders"),
    ).rejects.toThrow("permissions");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("uses website pagination and search contract, including cancellation", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        role: "ORDER_SUPPORT",
        permissions: ["orders.view"],
      })
      .mockResolvedValueOnce({
        orders: [{ _id: "o1", paymentStatus: "PENDING" }],
        pagination: { page: 2, totalPages: 3, total: 50 },
      });
    const signal = new AbortController().signal;
    const result = await loadAdminModule(
      { request } as unknown as ApiClient,
      "orders",
      2,
      " A&B ",
      signal,
    );
    expect(request).toHaveBeenLastCalledWith(
      "/admin/orders?page=2&limit=20&search=A%26B",
      { auth: "required", signal },
    );
    expect(result.page).toBe(2);
    expect(result.records[0].paymentStatus).toBe("PENDING");
  });
  it("rejects malformed staff lists instead of rendering a false empty state", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ role: "ADMIN", permissions: ["*"] })
      .mockResolvedValueOnce({
        products: [],
        pagination: { page: 1, totalPages: 1 },
      });
    await expect(
      loadAdminModule({ request } as unknown as ApiClient, "products"),
    ).rejects.toThrow("could not be verified");
  });
  it("preserves unknown metrics and distinguishes them from a verified zero", () => {
    expect(adminMetricText()).toBe("Unavailable");
    expect(
      adminMetricText({
        value: null,
        unit: "INR",
        availability: "unavailable",
      }),
    ).toBe("Unavailable");
    expect(
      adminMetricText({ value: 0, unit: "INR", availability: "available" }),
    ).toBe("₹0");
    expect(
      adminMetricText({ value: NaN, unit: "count", availability: "available" }),
    ).toBe("Unavailable");
  });
});
