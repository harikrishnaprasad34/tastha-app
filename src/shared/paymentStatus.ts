import type { Order } from "../models";
const acceptedCodStatuses = new Set([
  "PLACED",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
]);
/** Confirmation is a server order state, never the absence of a rejection. */
export function confirmedCustomerOrder(order: Order | null) {
  if (
    !order?.orderNumber ||
    ["CANCELLED", "RETURNED", "RETURN_REQUESTED", "RETURN_APPROVED"].includes(
      order.orderStatus,
    )
  )
    return false;
  return (
    order.paymentStatus === "COMPLETED" ||
    (order.paymentMethod === "COD" &&
      acceptedCodStatuses.has(order.orderStatus))
  );
}
