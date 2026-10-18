import React from "react";
import { Search } from "../screens/Search";
import { useNavigate } from "../navigation/useNavigate";
export default function Screen() {
  return <Search navigate={useNavigate()} />;
}
