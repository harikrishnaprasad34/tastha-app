import React from "react";
import { useLocalSearchParams } from "expo-router";
import { RequireCustomer } from "../components/SessionGate";
import { OrderReview } from "../screens/OrderReview";
import { Empty } from "../components/ui";
export default function Screen() {
  const { orderId, productId } = useLocalSearchParams<{
    orderId?: string;
    productId?: string;
  }>();
  return (
    <RequireCustomer>
      {orderId && productId ? (
        <OrderReview
          key={orderId + productId}
          orderId={orderId}
          productId={productId}
        />
      ) : (
        <Empty title="Open a delivered item from My Orders to review it." />
      )}
    </RequireCustomer>
  );
}
