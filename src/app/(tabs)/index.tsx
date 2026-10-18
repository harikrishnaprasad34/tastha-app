import React from "react";
import { Home } from "../../screens/Shop";
import { useNavigate } from "../../navigation/useNavigate";
export default function Screen() {
  const navigate = useNavigate();
  return <Home navigate={navigate} />;
}
