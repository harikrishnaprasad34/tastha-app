import { it, expect, vi } from "vitest";
import { Search } from "../src/screens/Search";
import { PaymentStatus } from "../src/screens/PaymentStatus";
const state = vi.hoisted(() => ({
  auth: { user: { id: "alice" } as { id: string } | null },
  location: { pinCode: "500034" },
}));
vi.mock("../src/state", () => ({
  useAppSelector: (selector: (value: typeof state) => unknown) =>
    selector(state),
}));
vi.mock("react-native", () => ({
  ScrollView: "ScrollView",
  Text: "Text",
  View: "View",
  Pressable: "Pressable",
}));
vi.mock("../src/api/runtime", () => ({ api: {}, session: {} }));
vi.mock("../src/api/nativeCheckout", () => ({
  checkoutForCurrentSession: vi.fn(),
}));
vi.mock("../src/screens/Shop", () => ({ ProductCard: "ProductCard" }));
vi.mock("../src/components/ui", () => ({
  Button: "Button",
  Empty: "Empty",
  ErrorBox: "ErrorBox",
  Field: "Field",
  Loading: "Loading",
  styles: {},
}));
it("search remounts its state when account or delivery PIN changes", () => {
  const navigate = vi.fn();
  const alice = Search({ navigate });
  state.auth.user = null;
  const guest = Search({ navigate });
  state.auth.user = { id: "bob" };
  const bob = Search({ navigate });
  state.location.pinCode = "560001";
  const relocated = Search({ navigate });
  expect(new Set([alice.key, guest.key, bob.key, relocated.key]).size).toBe(4);
});
it("payment status cannot reuse another order's local confirmation state", () => {
  const navigate = vi.fn();
  expect(PaymentStatus({ id: "order-a", navigate }).key).not.toBe(
    PaymentStatus({ id: "order-b", navigate }).key,
  );
  expect(PaymentStatus({ id: "order-a", navigate }).key).not.toBe(
    PaymentStatus({ navigate }).key,
  );
});
