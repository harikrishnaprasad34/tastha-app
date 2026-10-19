import React from "react";
import { Collections } from "../screens/Collections";
import { useNavigate } from "../navigation/useNavigate";
export default function Screen() {
  return <Collections navigate={useNavigate()} />;
}
