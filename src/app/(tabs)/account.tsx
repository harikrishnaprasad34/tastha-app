import React from "react";
import { Account } from "../../screens/Account";
import { useNavigate } from "../../navigation/useNavigate";
export default function Screen() {
  const navigate = useNavigate();
  return <Account navigate={navigate} />;
}
