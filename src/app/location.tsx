import React from "react";
import { LocationPicker } from "../screens/Account";
import { useNavigate } from "../navigation/useNavigate";
export default function Screen() {
  const navigate = useNavigate();
  return <LocationPicker navigate={navigate} />;
}
