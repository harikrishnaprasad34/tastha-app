import React from "react";
import { useLocalSearchParams } from "expo-router";
import { OrderTracking } from "../../../screens/OrderTracking";
import { useNavigate } from "../../../navigation/useNavigate";
import { RequireCustomer } from "../../../components/SessionGate";

export default function Screen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigate = useNavigate();
  return (
    <RequireCustomer>
      <OrderTracking id={id || ""} navigate={navigate} />
    </RequireCustomer>
  );
}
