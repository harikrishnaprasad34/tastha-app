import type { ApiClient } from "./client";
export interface DeliveryEligibility {
  configured: boolean;
  serviceable: boolean | null;
  message?: string;
  code?: string;
}
export async function readDeliveryEligibility(api: ApiClient, pinCode: string) {
  const result = await api.request<{ delivery?: DeliveryEligibility }>(
    "/location/availability?pinCode=" + encodeURIComponent(pinCode),
  );
  if (
    !result.delivery ||
    ![true, false, null].includes(result.delivery.serviceable)
  )
    throw Error("Delivery availability could not be verified. Please retry.");
  return result.delivery;
}
/** Match checkoutService.catalogDeliveryBlocked without inventing coverage.
 * Unconfigured coverage remains unknown; the server quote/order still validates
 * the address, stock and amount. Explicit coverage denials must block checkout.
 */
export async function deliveryEligibility(api: ApiClient, pinCode: string) {
  const delivery = await readDeliveryEligibility(api, pinCode);
  const unconfigured =
    delivery.configured === false &&
    delivery.serviceable === null &&
    delivery.code === "UNCONFIGURED";
  if (delivery.serviceable !== true && !unconfigured)
    throw Error(
      delivery.message ||
        "Delivery availability could not be verified. Please retry.",
    );
  return delivery;
}
