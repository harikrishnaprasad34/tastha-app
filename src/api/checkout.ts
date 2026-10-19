import type { ApiClient } from "./client";
import type { Address, Cart, Order, Quote } from "../models";
import { checkoutFingerprint, linePayload } from "../shared/catalog";
import { isValidCheckoutQuote } from "../shared/checkoutQuote";
export interface Attempt {
  fingerprint: string;
  idempotencyKey: string;
  merchantOrderId?: string;
}
export interface RecoveryResult {
  resolution: string;
  order?: Order;
  canRetry?: boolean;
  merchantOrderId?: string;
  paymentStatus?: string;
  orderStatus?: string;
}
export function isTerminalUnpaid(
  result: RecoveryResult,
  merchantOrderId: string,
) {
  return (
    result.resolution === "FAILED" &&
    result.canRetry === false &&
    result.merchantOrderId === merchantOrderId &&
    result.order?.orderNumber === merchantOrderId &&
    result.order.paymentStatus === "FAILED"
  );
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
  async function recover(sessionIsCurrent?: () => boolean) {
    const attempt = await storage.read();
    if (sessionIsCurrent?.() === false)
      throw Error("Your shopping session changed.");
    if (!attempt?.merchantOrderId) return null;
    const result = await api.request<RecoveryResult>(
      "/payment/razorpay/order/" +
        encodeURIComponent(attempt.merchantOrderId) +
        "/status",
      { auth: "required", timeout: 45000 },
    );
    if (sessionIsCurrent?.() === false)
      throw Error("Your shopping session changed.");
    if (result.order && result.order.orderNumber !== attempt.merchantOrderId)
      throw Error(
        "Payment status refers to a different order. Your saved attempt was kept.",
      );
    if (
      (result.resolution === "CONFIRMED" &&
        result.order?.orderNumber &&
        result.order.paymentStatus === "COMPLETED") ||
      isTerminalUnpaid(result, attempt.merchantOrderId)
    )
      await storage.clear();
    return result;
  }
  return {
    recover,
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
        if (attempt?.merchantOrderId && attempt.fingerprint !== fingerprint)
          throw Error(
            "An earlier payment needs a status check. Recover that payment before starting another checkout.",
          );
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
        let retryOrderId: string | undefined;
        if (attempt.merchantOrderId) {
          const r = await api.request<{
            resolution: string;
            order?: Order;
            canRetry?: boolean;
            razorpayOrderId?: string;
          }>(
            "/payment/razorpay/order/" +
              encodeURIComponent(attempt.merchantOrderId) +
              "/status",
            { auth: "required", timeout: 45000 },
          );
          active();
          if (
            r.resolution === "CONFIRMED" &&
            r.order?.orderNumber === attempt.merchantOrderId &&
            r.order.paymentStatus === "COMPLETED"
          ) {
            await storage.clear();
            return r.order;
          }
          // Never start another gateway order while an earlier attempt may
          // settle asynchronously, even if its current status is ambiguous.
          if (
            r.canRetry === true &&
            typeof r.razorpayOrderId === "string" &&
            r.razorpayOrderId
          )
            retryOrderId = r.razorpayOrderId;
          else
            throw Error(
              "An earlier payment attempt exists. Check your order history or contact support before trying to pay again.",
            );
        }
        const order = await api.request<
          GatewayOrder & { alreadyPaid?: boolean; order?: Order }
        >("/payment/razorpay/order", {
          method: "POST",
          auth: "required",
          body: { ...payload, ...(retryOrderId ? { retryOrderId } : {}) },
          timeout: 45000,
        });
        active();
        if (order.alreadyPaid) {
          if (
            !order.order?.orderNumber ||
            order.order.paymentStatus !== "COMPLETED"
          )
            throw Error("Order confirmation is pending. Check your orders.");
          await storage.clear();
          return order.order;
        }
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
          verified.order?.orderNumber &&
          verified.order.orderNumber !== order.merchantOrderId
        )
          throw Error(
            "Payment confirmation does not match this order. Check your orders before retrying.",
          );
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
