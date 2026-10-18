import React from "react";
import { Orders } from "../screens/Commerce";
import { useNavigate } from "../navigation/useNavigate";
import { RequireCustomer } from "../components/SessionGate";
export default function Screen() {
  const navigate = useNavigate();
  return (
    <RequireCustomer>
      <Orders navigate={navigate} />
    </RequireCustomer>
  );
}
