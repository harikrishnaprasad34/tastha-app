import React from "react";
import { Signup } from "../screens/Signup";
import { useNavigate } from "../navigation/useNavigate";
export default function Screen() {
  return <Signup navigate={useNavigate()} />;
}
