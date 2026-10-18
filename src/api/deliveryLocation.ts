import * as SecureStore from "expo-secure-store";
import type { DeliveryLocation } from "../models";
import { parseSavedLocation, validPinCode } from "../shared/deliveryLocation";

const KEY = "tastha.delivery.v1";

export async function readDeliveryLocation(): Promise<DeliveryLocation | null> {
  return parseSavedLocation(await SecureStore.getItemAsync(KEY));
}

export async function saveDeliveryLocation(
  location: DeliveryLocation,
): Promise<void> {
  if (!validPinCode(location.pinCode) || !location.label.trim())
    throw Error("Confirm a valid delivery area and six-digit PIN.");
  await SecureStore.setItemAsync(KEY, JSON.stringify(location), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}
