import React, { useCallback, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { api } from "../api/runtime";
import type { Product } from "../models";
import {
  Button,
  Empty,
  ErrorBox,
  Loading,
  styles as s,
} from "../components/ui";
import { ProductCard, type Navigate } from "./Shop";
interface Look {
  _id: string;
  title: string;
  occasion?: string;
  items?: { product: Product | null }[];
}
export function SavedLooks({ navigate }: { navigate: Navigate }) {
  const [looks, setLooks] = useState<Look[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false);
  useFocusEffect(
    useCallback(() => {
      void revision;
      const controller = new AbortController();
      setLoading(true);
      setError("");
      api
        .request<{ looks: Look[] }>("/saved-looks", {
          auth: "required",
          signal: controller.signal,
        })
        .then((r) => {
          if (!Array.isArray(r.looks))
            throw Error("Saved looks are unavailable.");
          if (!controller.signal.aborted) setLooks(r.looks);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
      return () => controller.abort();
    }, [revision]),
  );
  function remove(look: Look) {
    Alert.alert("Remove saved look?", look.title, [
      { text: "Keep", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setBusy(true);
            setError("");
            try {
              await api.request(
                "/saved-looks/" + encodeURIComponent(look._id),
                { auth: "required", method: "DELETE" },
              );
              setLooks((old) => old.filter((x) => x._id !== look._id));
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not remove look.",
              );
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  }
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.title}>Saved AI Looks</Text>
      {loading ? <Loading /> : null}
      <ErrorBox message={error} retry={() => setRevision((x) => x + 1)} />
      {!loading && !error && !looks.length ? (
        <Empty
          title="Your wardrobe starts here"
          detail="Looks saved on Tastha appear here."
        />
      ) : null}
      {looks.map((look) => (
        <View key={look._id} style={s.panel}>
          <Text style={s.heading}>{look.title}</Text>
          {look.occasion ? <Text style={s.muted}>{look.occasion}</Text> : null}
          {look.items?.map((item, i) =>
            item.product ? (
              <ProductCard key={i} product={item.product} navigate={navigate} />
            ) : (
              <Text key={i} style={s.muted}>
                Product no longer available
              </Text>
            ),
          )}
          <Button
            title="Remove saved look"
            outline
            disabled={busy}
            onPress={() => remove(look)}
          />
        </View>
      ))}
    </ScrollView>
  );
}
