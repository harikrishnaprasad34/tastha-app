import type { ApiClient } from "./client";
import type { Address, Cart, Order, Quote } from "../models";
import { checkoutFingerprint, linePayload } from "../shared/catalog";
import { isValidCheckoutQuote } from "../shared/checkoutQuote";
export interface Attempt {
  fingerprint: string;
  idempotencyKey: string;
  merchantOrderId?: string;
}
export interface AttemptStorage {
  read(): Promise<Attempt | null>;
  write(value: Attempt): Promise<void>;
  clear(): Promise<void>;
}
export interface GatewayOrder {
  razorpayOrderId: string;
  merchantOrderId: string;
  keyId: string;
  amountInPaise: number;
  currency: string;
}
export interface PaymentProof {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
export function createCheckout(
  api: ApiClient,
  storage: AttemptStorage,
  uuid: () => string,
  openGateway: (order: GatewayOrder, method: string) => Promise<PaymentProof>,
) {
  let busy = false;
  return {
    async pay(input: {
      accountId: string;
      cart: Cart;
      address: Address;
      quote: Quote;
      coupon: string;
      method: string;
      sessionIsCurrent?: () => boolean;
    }): Promise<Order> {
      if (busy) throw Error("Checkout is already processing.");
      busy = true;
      const active = () => {
        if (input.sessionIsCurrent?.() === false)
          throw Error(
            "Your shopping session changed. Check your order history before retrying.",
          );
      };
      try {
        active();
        if (!isValidCheckoutQuote(input.quote))
          throw Error("Refresh the bill before paying.");
        if (!input.cart.items.length) throw Error("Your bag is empty.");
        const fingerprint = JSON.stringify([
          input.accountId,
          input.method === "COD" ? "COD" : "ONLINE",
          checkoutFingerprint(
            input.cart,
            input.address,
            input.coupon,
            input.quote.totalAmount,
          ),
        ]);
        let attempt = await storage.read();
        active();
        if (attempt?.fingerprint !== fingerprint) {
          attempt = { fingerprint, idempotencyKey: uuid() };
          await storage.write(attempt);
        }
        active();
        const payload = {
          shippingAddress: input.address,
          items: linePayload(input.cart.items),
          itemsPayload: linePayload(input.cart.items),
          checkoutMode: "CART",
          cartId: input.cart._id,
          couponCode: input.coupon.trim() || undefined,
          expectedTotal: input.quote.totalAmount,
          idempotencyKey: attempt.idempotencyKey,
        };
        if (input.method === "COD") {
          const result = await api.request<{ order: Order }>("/orders/create", {
            method: "POST",
            auth: "required",
            timeout: 45000,
            body: { ...payload, paymentMethod: "COD" },
          });
          active();
          if (!result.order?.orderNumber)
            throw Error(
              "Order confirmation is pending. Check your orders before retrying.",
            );
          await storage.clear();
          return result.order;
        }
        if (attempt.merchantOrderId) {
          const r = await api.request<{ resolution: string; order?: Order }>(
            "/payment/razorpay/order/" +
              encodeURIComponent(attempt.merchantOrderId) +
              "/status",
            { auth: "required", timeout: 45000 },
          );
          active();
          if (r.resolution === "CONFIRMED" && r.order) {
            await storage.clear();
            return r.order;
          }
          if (["AUTHORIZED", "REVIEW"].includes(r.resolution))
            throw Error(
              "Payment needs confirmation. Check your orders before paying again.",
            );
        }
        const order = await api.request<GatewayOrder>(
          "/payment/razorpay/order",
          { method: "POST", auth: "required", body: payload, timeout: 45000 },
        );
        active();
        if (
          !/^rzp_(test|live)_/.test(order.keyId) ||
          !order.razorpayOrderId ||
          !order.merchantOrderId ||
          order.currency !== "INR" ||
          !Number.isSafeInteger(order.amountInPaise) ||
          order.amountInPaise !== Math.round(input.quote.totalAmount * 100)
        )
          throw Error(
            "Payment amount or configuration changed. Refresh your bill before paying.",
          );
        await storage.write({
          ...attempt,
          merchantOrderId: order.merchantOrderId,
        });
        active();
        const proof = await openGateway(order, input.method);
        active();
        if (
          proof.razorpay_order_id !== order.razorpayOrderId ||
          !proof.razorpay_payment_id ||
          !proof.razorpay_signature
        )
          throw Error(
            "Payment proof is incomplete. Check your orders before retrying.",
          );
        const verified = await api.request<{ order: Order }>(
          "/payment/razorpay/verify",
          { method: "POST", auth: "required", body: proof, timeout: 45000 },
        );
        active();
        if (
          !verified.order?.orderNumber ||
          verified.order.paymentStatus !== "COMPLETED"
        )
          throw Error(
            "Payment confirmation is pending. Check your orders before paying again.",
          );
        await storage.clear();
        return verified.order;
      } finally {
        busy = false;
      }
    },
  };
}
