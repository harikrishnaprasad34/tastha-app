import React, { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { api, session } from "../api/runtime";
import { checkoutForCurrentSession } from "../api/nativeCheckout";
import type { Order } from "../models";
import {
  Button,
  Empty,
  ErrorBox,
  Loading,
  styles as s,
} from "../components/ui";
import type { Navigate } from "./Shop";
export function PaymentStatus({
  id,
  navigate,
}: {
  id?: string;
  navigate: Navigate;
}) {
  const [order, setOrder] = useState<Order | null>(null),
    [resolution, setResolution] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const revision = session.revision();
    void (async () => {
      try {
        if (id) {
          const r = await api.request<{ order: Order }>(
            "/orders/" + encodeURIComponent(id),
            { auth: "required" },
          );
          if (!r.order?.orderNumber)
            throw Error("Order confirmation is unavailable.");
          if (active) {
            setOrder(r.order);
            setResolution(
              r.order.paymentMethod === "COD"
                ? "COD_ORDER"
                : r.order.paymentStatus,
            );
          }
        } else {
          const r = await checkoutForCurrentSession().recover(
            () => revision === session.revision(),
          );
          if (active) {
            setOrder(r?.order || null);
            setResolution(r?.resolution || "NO_SAVED_ATTEMPT");
          }
        }
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "Could not verify payment status.",
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, retry]);
  const confirmed = Boolean(
    order &&
    (order.paymentStatus === "COMPLETED" ||
      (order.paymentMethod === "COD" &&
        !["CANCELLED", "RETURNED"].includes(order.orderStatus))),
  );
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.title}>
        {confirmed ? "Order confirmed" : "Payment status"}
      </Text>
      {loading ? <Loading /> : null}
      <ErrorBox message={error} />
      {order ? (
        <>
          <Text style={s.heading}>{order.orderNumber}</Text>
          <Text style={s.text}>Order: {order.orderStatus}</Text>
          <Text style={s.muted}>Payment: {order.paymentStatus}</Text>
          <Button
            title="View order"
            onPress={() =>
              navigate("OrderDetail", order._id || order.orderNumber)
            }
          />
        </>
      ) : !loading && !error ? (
        <Empty
          title={
            resolution === "NO_SAVED_ATTEMPT"
              ? "No saved payment attempt"
              : resolution.replaceAll("_", " ")
          }
        />
      ) : null}
      {!confirmed ? (
        <Text style={s.muted}>
          If payment was interrupted, check its server status before paying
          again. A closed payment window does not confirm whether money was
          deducted.
        </Text>
      ) : null}
      <Button
        title="Check status again"
        outline
        disabled={loading}
        onPress={() => {
          setLoading(true);
          setError("");
          setRetry((x) => x + 1);
        }}
      />
      <Button title="My Orders" outline onPress={() => navigate("Orders")} />
      <Button title="Return to bag" outline onPress={() => navigate("Bag")} />
    </ScrollView>
  );
}
