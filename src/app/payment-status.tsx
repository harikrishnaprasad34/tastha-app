import React from "react";
import { useLocalSearchParams } from "expo-router";
import { PaymentStatus } from "../screens/PaymentStatus";
import { RequireCustomer } from "../components/SessionGate";
import { useNavigate } from "../navigation/useNavigate";
export default function Screen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const navigate = useNavigate();
  return (
    <RequireCustomer>
      <PaymentStatus id={id} navigate={navigate} />
    </RequireCustomer>
  );
}
