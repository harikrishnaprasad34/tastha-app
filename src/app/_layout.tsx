import React from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { store } from "../state";
import { Bootstrap } from "../components/SessionGate";
import { colors } from "../config";
import { ErrorBox } from "../components/ui";
export function ErrorBoundary({ retry }: { error: Error; retry: () => void }) {
  return <ErrorBox message="This screen could not load." retry={retry} />;
}
export default function Root() {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: colors.background }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Bootstrap>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.gold,
                contentStyle: { backgroundColor: colors.background },
                headerBackButtonDisplayMode: "minimal",
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="product/[id]"
                options={{ title: "Tastha collection" }}
              />
              <Stack.Screen name="login" options={{ title: "Sign in" }} />
              <Stack.Screen name="signup" options={{ title: "Create account" }} />
              <Stack.Screen name="search" options={{ title: "Search Tastha" }} />
              <Stack.Screen name="help/[section]" options={{ title: "Help and policies" }} />
              <Stack.Screen
                name="location"
                options={{ title: "Delivery location" }}
              />
              <Stack.Screen
                name="checkout"
                options={{ title: "Checkout", gestureEnabled: false }}
              />
              <Stack.Screen
                name="addresses"
                options={{ title: "Saved addresses" }}
              />
              <Stack.Screen
                name="address-form"
                options={{ title: "Add address" }}
              />
              <Stack.Screen name="orders" options={{ title: "My orders" }} />
              <Stack.Screen name="order/[id]" options={{ title: "Order details" }} />
              <Stack.Screen name="order/[id]/tracking" options={{ title: "Track order" }} />
              <Stack.Screen name="edit-profile" options={{ title: "Edit profile" }} />
              <Stack.Screen name="ai" options={{ title: "Virtual try-on" }} />
            </Stack>
          </Bootstrap>
        </KeyboardAvoidingView>
      </Provider>
    </SafeAreaProvider>
  );
}
