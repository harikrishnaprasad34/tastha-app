import React from "react";
import { Login } from "../screens/Account";
import { useNavigate } from "../navigation/useNavigate";
export default function Screen() {
  const navigate = useNavigate();
  return <Login navigate={navigate} />;
}
