import type { Order } from "../models";

/** Website-equivalent stages from real saved order status; no invented courier data. */
export const DELIVERY_STAGES = [
  { code: "CONFIRMED", title: "Order confirmed" },
  { code: "PACKED", title: "Packed" },
  { code: "SHIPPED", title: "Shipped" },
  { code: "OUT_FOR_DELIVERY", title: "Out for delivery" },
  { code: "DELIVERED", title: "Delivered" },
] as const;

export function orderTrackingStatus(order: Pick<Order, "orderStatus">) {
  const status = String(order.orderStatus || "UNKNOWN").trim().toUpperCase();
  const index = DELIVERY_STAGES.findIndex((stage) => stage.code === status);
  const closed = status === "CANCELLED" || status === "RETURNED";
  return {
    status,
    closed,
    stages: DELIVERY_STAGES.map((stage, i) => ({
      ...stage,
      reached: !closed && index >= i,
      current: !closed && index === i,
    })),
  };
}
