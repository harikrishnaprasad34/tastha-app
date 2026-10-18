import React from "react";
import { Bag } from "../../screens/Commerce";
import { useNavigate } from "../../navigation/useNavigate";
export default function Screen() {
  const navigate = useNavigate();
  return <Bag navigate={navigate} />;
}
