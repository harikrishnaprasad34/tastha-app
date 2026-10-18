import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { Order } from "../models";
import { api } from "../api/runtime";
import { orderTrackingStatus } from "../shared/orderTracking";
import { Button, ErrorBox, Loading, styles as s } from "../components/ui";
import type { Navigate } from "./Shop";

export function OrderTracking({ id, navigate }: { id: string; navigate: Navigate }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api.request<{ order: Order }>("/orders/" + encodeURIComponent(id), {
      auth: "required", signal: controller.signal,
    }).then((response) => {
      if (!response.order?.orderNumber)
        throw Error("Tracking is unavailable for this order.");
      if (!controller.signal.aborted) setOrder(response.order);
    }).catch((e) => {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : "Unable to get the latest status.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [id, refresh]);
  const tracking = order ? orderTrackingStatus(order) : null;
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.title}>Track your order</Text>
      <Button title="Back to order" outline onPress={() => navigate("OrderDetail", id)} />
      <Button title="Refresh status" outline disabled={loading}
        onPress={() => setRefresh((value) => value + 1)} />
      {loading ? <Loading /> : null}
      <ErrorBox message={error} retry={() => setRefresh((value) => value + 1)} />
      {order && tracking ? (
        <>
          <View style={s.panel}>
            <Text style={s.heading}>{order.orderNumber}</Text>
            <Text style={s.text}>Status: {tracking.status.replaceAll("_", " ")}</Text>
            <Text style={s.muted}>
              This progress reflects Tastha's recorded order status, not live courier GPS
              or a guaranteed delivery time.
            </Text>
          </View>
          {tracking.closed ? (
            <View style={s.panel}>
              <Text style={s.text}>
                {tracking.status === "CANCELLED"
                  ? "This order has been cancelled."
                  : "This order has been marked returned."}
              </Text>
            </View>
          ) : tracking.stages.map((step) => (
            <View key={step.code} style={[s.panel, step.current && s.active]}
              accessibilityLabel={
                step.title + (step.current ? ", current" : step.reached ? ", reached" : ", pending")
              }
            >
              <Text style={s.text}>{step.reached ? "✓" : "○"} {step.title}</Text>
              {step.current ? <Text style={s.muted}>Latest recorded stage</Text> : null}
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}
