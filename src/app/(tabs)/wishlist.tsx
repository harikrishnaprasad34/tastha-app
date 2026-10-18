import React from "react";
import { Wishlist } from "../../screens/Commerce";
import { useNavigate } from "../../navigation/useNavigate";
export default function Screen() {
  const navigate = useNavigate();
  return <Wishlist navigate={navigate} />;
}
