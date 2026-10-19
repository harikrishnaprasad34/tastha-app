import { hasNativePayments } from "../src/api/nativeCheckout";
import { it, expect, vi } from "vitest";
const registry = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("react-native", () => ({ TurboModuleRegistry: registry }));
vi.mock("expo-secure-store", () => ({}));
vi.mock("expo-crypto", () => ({}));
vi.mock("../src/api/runtime", () => ({ api: {}, session: {} }));
it("recognizes Razorpay registered through the native module registry", () => {
  registry.get.mockReturnValue({ open: vi.fn() });
  expect(hasNativePayments()).toBe(true);
  expect(registry.get).toHaveBeenCalledWith("RNRazorpayCheckout");
});
it("keeps online payments unavailable when the SDK is absent", () => {
  registry.get.mockReturnValue(null);
  expect(hasNativePayments()).toBe(false);
});
