import type { Order } from "../models";

export type OrderView = "ALL" | "ACTIVE" | "DELIVERED" | "CANCELLED";
export type OrderSort = "NEWEST" | "OLDEST";
const completed = new Set(["DELIVERED", "CANCELLED", "RETURNED"]);

export function filterCustomerOrders(
  orders: Order[],
  search: string,
  filter: OrderView,
  sort: OrderSort,
): Order[] {
  const query = search.trim().toLowerCase();
  return orders
    .filter((order) => {
      const status = String(order.orderStatus || "").toUpperCase();
      if (filter === "ACTIVE" && completed.has(status)) return false;
      if (filter === "DELIVERED" && status !== "DELIVERED") return false;
      if (filter === "CANCELLED" && status !== "CANCELLED") return false;
      if (!query) return true;
      return (
        String(order.orderNumber || "").toLowerCase().includes(query) ||
        order.items?.some((item) =>
          String(item.name || item.product?.name || "")
            .toLowerCase()
            .includes(query),
        ) === true
      );
    })
    .sort((a, b) => {
      const ta = Date.parse(a.createdAt || "") || 0;
      const tb = Date.parse(b.createdAt || "") || 0;
      return sort === "NEWEST" ? tb - ta : ta - tb;
    });
}

export function orderCanBeCancelled(order: Order) {
  const state = String(order.orderStatus || "").toUpperCase();
  // Only present cancellation on pre-dispatch states; backend still decides.
  return state === "CONFIRMED" || state === "PACKED";
}
