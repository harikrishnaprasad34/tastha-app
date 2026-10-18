import type { ApiClient } from "./client";
export interface DeliveryEligibility {
  configured: boolean;
  serviceable: boolean | null;
  message?: string;
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
/** Saving a location is separate from authorizing a payable delivery quote. */
export async function deliveryEligibility(api: ApiClient, pinCode: string) {
  const delivery = await readDeliveryEligibility(api, pinCode);
  if (delivery.serviceable !== true)
    throw Error(
      delivery.message ||
        "Delivery availability could not be verified. Please retry.",
    );
  return delivery;
}
