import { NativeModules } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { api, session } from "./runtime";
import { createCheckout, type Attempt, type PaymentProof } from "./checkout";
const key = () => "tastha.checkout." + (session.get()?.user.id || "signed-out");
export const hasNativePayments = () =>
  Boolean(NativeModules.RNRazorpayCheckout);
export function checkoutForCurrentSession() {
  const accountKey = key();
  return createCheckout(
    api,
    {
      read: async () => {
        const raw = await SecureStore.getItemAsync(accountKey);
        if (!raw) return null;
        const a = JSON.parse(raw) as Attempt;
        if (
          typeof a.fingerprint !== "string" ||
          typeof a.idempotencyKey !== "string"
        )
          throw Error(
            "Saved checkout is unreadable. Check order history before retrying.",
          );
        return a;
      },
      write: (a) => SecureStore.setItemAsync(accountKey, JSON.stringify(a)),
      clear: () => SecureStore.deleteItemAsync(accountKey),
    },
    () => Crypto.randomUUID(),
    async (order, method) => {
      if (!hasNativePayments())
        throw Error(
          "Online payment needs the installed Tastha native build. Expo Go cannot open this checkout.",
        );
      const Razorpay = (await import("react-native-razorpay")).default;
      const type =
        method === "UPI" ? "upi" : method === "CARD" ? "card" : "netbanking";
      const result = await Razorpay.open({
        key: order.keyId,
        order_id: order.razorpayOrderId,
        amount: order.amountInPaise,
        currency: "INR",
        name: "Tastha",
        description: "Tastha order " + order.merchantOrderId,
        theme: { color: "#D4AF37" },
        ...(session.get()?.user.email
          ? {
              prefill: {
                email: session.get()!.user.email,
                contact: session.get()!.user.phone || "",
              },
            }
          : {}),
        config: {
          display: {
            blocks: {
              selected: {
                name: "Selected payment method",
                instruments: [{ method: type }],
              },
            },
            sequence: ["block.selected"],
            preferences: { show_default_blocks: false },
          },
        },
      });
      return result as PaymentProof;
    },
  );
}
