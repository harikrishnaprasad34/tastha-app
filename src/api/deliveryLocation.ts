import * as SecureStore from "expo-secure-store";
import { session } from "./runtime";
import type { DeliveryLocation } from "../models";
import {
  restoreDeliveryForAccount,
  validPinCode,
} from "../shared/deliveryLocation";

const KEY = "tastha.delivery.v1";

export async function readDeliveryLocation(): Promise<DeliveryLocation | null> {
  return restoreDeliveryForAccount(
    await SecureStore.getItemAsync(KEY),
    session.get()?.user.id,
  );
}

export async function saveDeliveryLocation(
  location: DeliveryLocation,
): Promise<void> {
  if (!validPinCode(location.pinCode) || !location.label.trim())
    throw Error("Confirm a valid delivery area and six-digit PIN.");
  await SecureStore.setItemAsync(
    KEY,
    JSON.stringify({ ...location, accountId: session.get()?.user.id || null }),
    {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    },
  );
}
