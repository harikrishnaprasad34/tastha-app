import * as SecureStore from "expo-secure-store";
import { API_URL } from "../config";
import { createSessionManager } from "./session";
import { createApiClient } from "./client";
import { isStaffRole } from "./admin";
const KEY = "tastha.native.staff.session.v1";
export const adminSession = createSessionManager(
  {
    get: () => SecureStore.getItemAsync(KEY),
    set: (value) =>
      SecureStore.setItemAsync(KEY, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
    remove: () => SecureStore.deleteItemAsync(KEY),
  },
  isStaffRole,
);
export const adminApi = createApiClient(API_URL, adminSession);
