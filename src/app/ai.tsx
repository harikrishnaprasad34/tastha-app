import React from "react";
import { StyleStudio } from "../screens/StyleStudio";
import { useNavigate } from "../navigation/useNavigate";
export default function Screen() {
  return <StyleStudio navigate={useNavigate()} />;
}
