import React from "react";
import { Security } from "../screens/Security";
import { useNavigate } from "../navigation/useNavigate";
import { RequireCustomer } from "../components/SessionGate";
export default function Screen() {
  const navigate = useNavigate();
  return (
    <RequireCustomer>
      <Security navigate={navigate} />
    </RequireCustomer>
  );
}
