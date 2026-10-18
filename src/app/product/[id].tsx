import React from "react";
import { useLocalSearchParams } from "expo-router";
import { ProductDetail } from "../../screens/Shop";
import { useNavigate } from "../../navigation/useNavigate";
import { Empty } from "../../components/ui";
export default function Screen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigate = useNavigate();
  return typeof id === "string" ? (
    <ProductDetail id={id} navigate={navigate} />
  ) : (
    <Empty title="Product unavailable" />
  );
}
