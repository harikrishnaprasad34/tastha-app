import React from "react";
import { useLocalSearchParams } from "expo-router";
import { AddressForm } from "../screens/Account";
import { useNavigate } from "../navigation/useNavigate";
import { RequireCustomer } from "../components/SessionGate";
export default function Screen() {
  const navigate = useNavigate();
  const { id } = useLocalSearchParams<{ id?: string }>();
  return (
    <RequireCustomer>
      <AddressForm navigate={navigate} id={id} />
    </RequireCustomer>
  );
}
