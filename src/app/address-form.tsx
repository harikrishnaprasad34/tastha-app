import React from "react";
import { AddressForm } from "../screens/Account";
import { useNavigate } from "../navigation/useNavigate";
import { RequireCustomer } from "../components/SessionGate";
export default function Screen() {
  const navigate = useNavigate();
  return (
    <RequireCustomer>
      <AddressForm navigate={navigate} />
    </RequireCustomer>
  );
}
