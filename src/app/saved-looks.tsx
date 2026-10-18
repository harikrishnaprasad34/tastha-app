import React from "react";
import { SavedLooks } from "../screens/SavedLooks";
import { useNavigate } from "../navigation/useNavigate";
import { RequireCustomer } from "../components/SessionGate";
export default function Screen() {
  const navigate = useNavigate();
  return (
    <RequireCustomer>
      <SavedLooks navigate={navigate} />
    </RequireCustomer>
  );
}
