import React from "react";
import { useLocalSearchParams } from "expo-router";
import { CollectionProducts } from "../../screens/Collections";
import { useNavigate } from "../../navigation/useNavigate";
import { Empty } from "../../components/ui";
export default function Screen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const navigate = useNavigate();
  return typeof slug === "string" ? (
    <CollectionProducts slug={slug} navigate={navigate} />
  ) : (
    <Empty title="Collection unavailable" />
  );
}
