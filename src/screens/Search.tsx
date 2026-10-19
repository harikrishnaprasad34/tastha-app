import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../config";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { api } from "../api/runtime";
import { useAppSelector } from "../state";
import type { Product } from "../models";
import { ProductCard, type Navigate } from "./Shop";
import {
  Button,
  Empty,
  ErrorBox,
  Field,
  Loading,
  styles as s,
} from "../components/ui";

interface Category {
  _id?: string;
  name: string;
  slug?: string;
}
interface SearchResponse {
  products?: Product[];
  categories?: Category[];
}
interface Suggestions {
  recent?: string[];
  trending?: string[];
}

export function Search({ navigate }: { navigate: Navigate }) {
  const account = useAppSelector((x) => x.auth.user?.id || "guest");
  const pin = useAppSelector((x) => x.location?.pinCode || "");
  return (
    <SearchForIdentity
      key={JSON.stringify([account, pin])}
      navigate={navigate}
      pin={pin}
    />
  );
}
function SearchForIdentity({
  navigate,
  pin,
}: {
  navigate: Navigate;
  pin: string;
}) {
  const userId = useAppSelector((x) => x.auth.user?.id);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestions>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api
      .request<Suggestions>("/search/suggestions", {
        auth: userId ? "required" : "none",
        signal: controller.signal,
      })
      .then((data) => {
        if (!controller.signal.aborted)
          setSuggestions({
            recent: Array.isArray(data.recent) ? data.recent : [],
            trending: Array.isArray(data.trending) ? data.trending : [],
          });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [userId]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .request<SearchResponse>(
          "/search?q=" +
            encodeURIComponent(term) +
            "&deliveryPinCode=" +
            encodeURIComponent(pin),
          { signal: controller.signal },
        )
        .then((data) => {
          if (controller.signal.aborted) return;
          setProducts(
            Array.isArray(data.products)
              ? data.products.filter(
                  (item) =>
                    typeof item?._id === "string" &&
                    typeof item.name === "string" &&
                    Number.isFinite(item.price),
                )
              : [],
          );
          setCategories(Array.isArray(data.categories) ? data.categories : []);
          setError("");
        })
        .catch((e) => {
          if (!controller.signal.aborted)
            setError(e instanceof Error ? e.message : "Search is unavailable.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, retry, pin]);

  function update(next: string) {
    if (next === query) return;
    setQuery(next);
    setError("");
    setProducts([]);
    setCategories([]);
    setBusy(next.trim().length >= 2);
  }
  const terms = (
    query.trim().length < 2
      ? [...(suggestions.recent || []), ...(suggestions.trending || [])]
      : []
  )
    .filter(
      (item, index, all) =>
        typeof item === "string" &&
        item.trim().length >= 2 &&
        all.findIndex((value) => value.toLowerCase() === item.toLowerCase()) ===
          index,
    )
    .slice(0, 8);
  return (
    <ScrollView
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.title}>Find your Tastha look</Text>
      <Field
        label="Search products and categories"
        placeholder="Search by product name or category"
        value={query}
        onChangeText={update}
        autoFocus
        autoCapitalize="none"
        returnKeyType="search"
        onSubmitEditing={() => {
          if (query.trim().length >= 2) navigate("SearchResults", query.trim());
        }}
      />
      {terms.length ? (
        <View style={s.panel}>
          <Text style={s.heading}>Suggested searches</Text>
          <View style={[s.row, { gap: 8 }]}>
            {terms.map((term) => (
              <Pressable
                key={term}
                accessibilityRole="button"
                style={[
                  s.pill,
                  { flexDirection: "row", gap: 8, alignItems: "center" },
                ]}
                onPress={() => update(term)}
              >
                <Ionicons
                  name="search-outline"
                  size={16}
                  color={colors.muted}
                />
                <Text style={s.text}>{term}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      {query.trim().length < 2 ? (
        <View style={[s.panel, { gap: 10 }]}>
          <Ionicons name="grid-outline" size={28} color={colors.gold} />
          <Text style={s.heading}>Discover your next favourite</Text>
          <Text style={s.muted}>
            Browse the collection or search for a product by name.
          </Text>
          <Button
            title="Explore all products"
            outline
            onPress={() => navigate("Shop")}
          />
        </View>
      ) : null}
      {busy ? <Loading /> : null}
      <ErrorBox
        message={error}
        retry={() => {
          setError("");
          setBusy(true);
          setRetry((value) => value + 1);
        }}
      />
      {categories.length ? (
        <View style={s.panel}>
          <Text style={s.heading}>Matching categories</Text>
          {categories.map((item, i) => (
            <Pressable
              key={item._id || item.slug || String(i)}
              style={s.pill}
              accessibilityRole="button"
              onPress={() => navigate("Shop", item.slug || item.name)}
            >
              <Text style={s.text}>{item.name} →</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {products.length ? (
        <>
          <Text style={s.heading}>Matching products</Text>
          <View style={[s.row, { alignItems: "stretch" }]}>
            {products.map((item) => (
              <View key={item._id} style={{ width: "46%" }}>
                <ProductCard product={item} navigate={navigate} />
              </View>
            ))}
          </View>
          <Button
            title="View all matching products"
            outline
            onPress={() => navigate("SearchResults", query.trim())}
          />
        </>
      ) : !busy && query.trim().length >= 2 && !error ? (
        <Empty
          title="No matching products"
          detail="Try another name or category."
        />
      ) : null}
    </ScrollView>
  );
}
