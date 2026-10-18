import { it, expect, vi } from "vitest";
import { useRevalidateOnFocus } from "../src/hooks/useRevalidateOnFocus";
const state = vi.hoisted(() => ({
  focus: undefined as undefined | (() => () => void),
  listener: undefined as undefined | ((value: string) => void),
  remove: vi.fn(),
}));
vi.mock("react", () => ({ useCallback: (fn: unknown) => fn }));
vi.mock("expo-router", () => ({
  useFocusEffect: (callback: () => () => void) => {
    state.focus = callback;
  },
}));
vi.mock("react-native", () => ({
  AppState: {
    addEventListener: (_: string, callback: (value: string) => void) => {
      state.listener = callback;
      return { remove: state.remove };
    },
  },
}));
it("revalidates on focus and foreground with cleanup on refresh and blur", () => {
  const cancel = vi.fn(),
    load = vi.fn(() => cancel);
  useRevalidateOnFocus(load);
  expect(load).not.toHaveBeenCalled();
  const blur = state.focus!();
  expect(load).toHaveBeenCalledTimes(1);
  state.listener!("background");
  expect(load).toHaveBeenCalledTimes(1);
  state.listener!("active");
  expect(load).toHaveBeenCalledTimes(2);
  expect(cancel).toHaveBeenCalledTimes(1);
  blur();
  expect(cancel).toHaveBeenCalledTimes(2);
  expect(state.remove).toHaveBeenCalledOnce();
});
