import React from "react";
import { useLocalSearchParams } from "expo-router";
import { OrderDetail } from "../../screens/Commerce";
import { useNavigate } from "../../navigation/useNavigate";
import { RequireCustomer } from "../../components/SessionGate";
export default function Screen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigate = useNavigate();
  return (
    <RequireCustomer>
      <OrderDetail id={id || ""} navigate={navigate} />
    </RequireCustomer>
  );
}
