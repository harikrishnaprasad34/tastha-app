import React from "react";
import { AuthCode } from "../screens/AuthCode";
import { useNavigate } from "../navigation/useNavigate";
export default function Screen() {
  return <AuthCode navigate={useNavigate()} recovery={true} />;
}
