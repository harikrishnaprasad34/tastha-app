import React, { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "../api/runtime";
import { API_ORIGIN } from "../config";
import { imageUrl, money } from "../shared/catalog";
import {
  Button,
  Empty,
  ErrorBox,
  Field,
  Loading,
  styles as s,
} from "../components/ui";
import type { Navigate } from "./Shop";
interface Look {
  title: string;
  whyThisLookWorks?: string;
  sizeStatus?: string;
  items: {
    productId: string;
    name: string;
    role: string;
    price: number;
    images?: unknown[];
    sizeAvailable?: boolean;
  }[];
}
export function StyleStudio({ navigate }: { navigate: Navigate }) {
  const { occasion: initial } = useLocalSearchParams<{ occasion?: string }>();
  const [occasions, setOccasions] = useState<
    { _id?: string; slug?: string; title: string }[]
  >([]);
  const [occasion, setOccasion] = useState(initial || ""),
    [budget, setBudget] = useState(""),
    [size, setSize] = useState("M"),
    [instruction, setInstruction] = useState("");
  const [look, setLook] = useState<Look | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api
      .request<{ occasions: typeof occasions }>("/ai-stylist/occasions", {
        signal: controller.signal,
      })
      .then((r) => {
        if (!Array.isArray(r.occasions))
          throw Error("Occasions are unavailable.");
        if (!controller.signal.aborted) {
          setOccasions(r.occasions);
          setOccasion(
            (old) =>
              r.occasions.find((x) => x.slug === old || x.title === old)
                ?.title ||
              r.occasions[0]?.title ||
              "",
          );
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);
  async function generate(refine = false) {
    if (busy || !occasion) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.request<{ look: Look }>(
        refine ? "/ai-stylist/refine-look" : "/ai-stylist/generate-look",
        {
          method: "POST",
          timeout: 60000,
          body: {
            occasion,
            size,
            ...(budget ? { budget: Number(budget) } : {}),
            ...(refine
              ? {
                  instruction,
                  currentItems: look?.items.map((x) => ({
                    productId: x.productId,
                    role: x.role,
                  })),
                }
              : {
                  styleDirection: "Casual",
                  gender: "Unisex",
                  season: "All Season",
                }),
          },
        },
      );
      if (
        !result.look ||
        !Array.isArray(result.look.items) ||
        !result.look.items.length
      )
        throw Error("No matching catalog outfit is available.");
      setLook(result.look);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Style studio is unavailable.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.title}>Style studio</Text>
      <Text style={s.muted}>
        Discover an outfit from Tastha’s current catalog. Review each product’s
        size, colour and availability before adding it to your bag.
      </Text>
      {loading ? <Loading /> : null}
      <ErrorBox
        message={error}
        retry={() => {
          setLoading(true);
          setError("");
          setReload((x) => x + 1);
        }}
      />
      <View style={s.row}>
        {occasions.map((item) => (
          <Pressable
            key={item._id || item.title}
            style={[s.pill, occasion === item.title && s.active]}
            accessibilityRole="button"
            accessibilityState={{ selected: occasion === item.title }}
            disabled={busy}
            onPress={() => {
              setOccasion(item.title);
              setLook(null);
            }}
          >
            <Text style={s.text}>{item.title}</Text>
          </Pressable>
        ))}
      </View>
      <Field
        label="Outfit budget (₹, optional)"
        value={budget}
        keyboardType="number-pad"
        onChangeText={(value) => {
          setBudget(value.replace(/[^0-9]/g, ""));
          setLook(null);
        }}
      />
      <View style={s.row}>
        {["S", "M", "L", "XL", "XXL"].map((value) => (
          <Button
            key={value}
            title={value === size ? value + " ✓" : value}
            outline
            disabled={busy}
            onPress={() => {
              setSize(value);
              setLook(null);
            }}
          />
        ))}
      </View>
      <Button
        title="Curate my outfit"
        busy={busy}
        disabled={!occasion}
        onPress={() => {
          void generate();
        }}
      />
      {look ? (
        <>
          <Text style={s.heading}>{look.title}</Text>
          <Text style={s.muted}>{look.whyThisLookWorks}</Text>
          <Text style={s.muted}>{look.sizeStatus}</Text>
          {look.items.map((item) => (
            <View key={item.productId + item.role} style={s.panel}>
              {imageUrl(item.images?.[0], API_ORIGIN) ? (
                <Image
                  source={{ uri: imageUrl(item.images?.[0], API_ORIGIN)! }}
                  style={[s.image, { height: 220 }]}
                  accessibilityLabel={item.name}
                />
              ) : null}
              <Text style={s.heading}>{item.name}</Text>
              <Text style={s.price}>{money(item.price)}</Text>
              <Text style={s.muted}>
                {item.role}
                {item.sizeAvailable === false ? " · Check available sizes" : ""}
              </Text>
              <Button
                title="Choose size and colour"
                outline
                onPress={() => navigate("Product", item.productId)}
              />
            </View>
          ))}
          <Field
            label="Refine your outfit"
            value={instruction}
            onChangeText={setInstruction}
            placeholder="For example, make it more formal"
          />
          <Button
            title="Refine outfit"
            busy={busy}
            disabled={!instruction.trim()}
            onPress={() => {
              void generate(true);
            }}
          />
        </>
      ) : !busy && !loading && !error ? (
        <Empty
          title="Start with your occasion"
          detail="Your catalog outfit will appear here."
        />
      ) : null}
    </ScrollView>
  );
}
