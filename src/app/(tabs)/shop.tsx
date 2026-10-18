import React from "react";
import { useLocalSearchParams } from "expo-router";
import { Catalog } from "../../screens/Shop";
import { useNavigate } from "../../navigation/useNavigate";
export default function Screen() {
  const navigate = useNavigate();
  const { category } = useLocalSearchParams<{ category?: string }>();
  return <Catalog navigate={navigate} category={category} />;
}
