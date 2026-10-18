import React from "react";
import { useLocalSearchParams } from "expo-router";
import { ProductDetail } from "../../screens/Shop";
import { useNavigate } from "../../navigation/useNavigate";
import { Empty } from "../../components/ui";
export default function Screen() {
  const { id, selectedSize, selectedColor } = useLocalSearchParams<{
    id: string;
    selectedSize?: string;
    selectedColor?: string;
  }>();
  const navigate = useNavigate();
  return typeof id === "string" ? (
    <ProductDetail
      id={id}
      navigate={navigate}
      initialSize={selectedSize}
      initialColor={selectedColor}
    />
  ) : (
    <Empty title="Product unavailable" />
  );
}
