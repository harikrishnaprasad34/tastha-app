import React from "react";
import { useLocalSearchParams } from "expo-router";
import { Catalog } from "../../screens/Shop";
import { useNavigate } from "../../navigation/useNavigate";
export default function Screen() {
  const navigate = useNavigate();
  const { category, search, sort, maxPrice } = useLocalSearchParams<{
    category?: string;
    search?: string;
    sort?: string;
    maxPrice?: string;
  }>();
  return (
    <Catalog
      navigate={navigate}
      category={category}
      search={search}
      sort={sort}
      maxPrice={maxPrice}
    />
  );
}
