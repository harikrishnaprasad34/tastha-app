import * as SecureStore from "expo-secure-store";
import { API_URL } from "../config";
import { createSessionManager } from "./session";
import { createApiClient } from "./client";
const KEY = "tastha.native.session.v1";
export const session = createSessionManager({
  get: () => SecureStore.getItemAsync(KEY),
  set: (value) =>
    SecureStore.setItemAsync(KEY, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
  remove: () => SecureStore.deleteItemAsync(KEY),
});
export const api = createApiClient(API_URL, session);
