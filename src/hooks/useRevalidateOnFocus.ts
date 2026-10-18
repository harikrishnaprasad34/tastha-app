import { useFocusEffect } from "expo-router";
import { AppState } from "react-native";
import { useCallback } from "react";
/** One request lifetime per focused foreground screen; abort before refreshing. */
export function useRevalidateOnFocus(work: () => void | (() => void)) {
  useFocusEffect(
    useCallback(() => {
      let cleanup = work();
      const listener = AppState.addEventListener("change", (state) => {
        if (state !== "active") return;
        cleanup?.();
        cleanup = work();
      });
      return () => {
        listener.remove();
        cleanup?.();
      };
    }, [work]),
  );
}
