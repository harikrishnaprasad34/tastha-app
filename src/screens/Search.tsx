import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { api } from "../api/runtime";
import { useAppSelector } from "../state";
import type { Product } from "../models";
import { ProductCard, type Navigate } from "./Shop";
import { Button, Empty, ErrorBox, Field, Loading, styles as s } from "../components/ui";

interface Category { _id?: string; name: string; slug?: string }
interface SearchResponse { products?: Product[]; categories?: Category[] }
interface Suggestions { recent?: string[]; trending?: string[] }

export function Search({ navigate }: { navigate: Navigate }) {
  const userId = useAppSelector((x) => x.auth.user?.id);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestions>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api.request<Suggestions>("/search/suggestions", {
      auth: userId ? "required" : "none",
      signal: controller.signal,
    }).then((data) => {
      if (!controller.signal.aborted)
        setSuggestions({
          recent: Array.isArray(data.recent) ? data.recent : [],
          trending: Array.isArray(data.trending) ? data.trending : [],
        });
    }).catch(() => {});
    return () => controller.abort();
  }, [userId]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api.request<SearchResponse>(
        "/search?q=" + encodeURIComponent(term),
        { signal: controller.signal },
      ).then((data) => {
        if (controller.signal.aborted) return;
        setProducts(Array.isArray(data.products) ? data.products.filter(
          (item) => typeof item?._id === "string" &&
            typeof item.name === "string" &&
            Number.isFinite(item.price),
        ) : []);
        setCategories(Array.isArray(data.categories) ? data.categories : []);
        setError("");
      }).catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Search is unavailable.");
      }).finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function update(next: string) {
    setQuery(next);
    setError("");
    setBusy(next.trim().length >= 2);
    if (next.trim().length < 2) {
      setProducts([]);
      setCategories([]);
    }
  }
  const terms = (query.trim().length < 2
    ? [...(suggestions.recent || []), ...(suggestions.trending || [])]
    : []).filter((item, index, all) =>
      typeof item === "string" && item.trim().length >= 2 &&
      all.findIndex((value) => value.toLowerCase() === item.toLowerCase()) === index,
    ).slice(0, 8);
  return (
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Find your Tastha look</Text>
      <Field label="Search products and categories"
        placeholder="Shirts, sneakers, occasion…" value={query}
        onChangeText={update} autoFocus autoCapitalize="none" />
      {terms.length ? (
        <View style={s.panel}>
          <Text style={s.heading}>Suggested searches</Text>
          {terms.map((term) => (
            <Pressable key={term} accessibilityRole="button" style={s.pill}
              onPress={() => update(term)}>
              <Text style={s.text}>{term}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {busy ? <Loading /> : null}
      <ErrorBox message={error} />
      {categories.length ? (
        <View style={s.panel}>
          <Text style={s.heading}>Matching categories</Text>
          {categories.map((item, i) => (
            <Pressable key={item._id || item.slug || String(i)} style={s.pill}
              accessibilityRole="button"
              onPress={() => navigate("Shop", item.slug || item.name)}>
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
          <Button title="Browse the entire collection" outline
            onPress={() => navigate("Shop")} />
        </>
      ) : !busy && query.trim().length >= 2 && !error ? (
        <Empty title="No matching products" detail="Try another name or category." />
      ) : null}
    </ScrollView>
  );
}
