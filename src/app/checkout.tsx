import React from "react";
import { Checkout } from "../screens/Commerce";
import { useNavigate } from "../navigation/useNavigate";
import { RequireCustomer } from "../components/SessionGate";
export default function Screen() {
  const navigate = useNavigate();
  return (
    <RequireCustomer>
      <Checkout navigate={navigate} />
    </RequireCustomer>
  );
}
