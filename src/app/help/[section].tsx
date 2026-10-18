import React from "react";
import { useLocalSearchParams } from "expo-router";
import { Help } from "../../screens/Help";
import { useNavigate } from "../../navigation/useNavigate";
export default function Screen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  return <Help section={section || "faq"} navigate={useNavigate()} />;
}
