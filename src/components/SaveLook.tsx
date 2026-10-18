import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { api, session } from "../api/runtime";
import type { Product } from "../models";
import { getVariantAvailability } from "../shared/productAvailability";
import { useAppSelector } from "../state";
import { Button, ErrorBox, Loading, styles as s } from "./ui";
import type { Navigate } from "../screens/Shop";
export interface LookSelection {
  productId: string;
  size: string;
  color: string;
}
export function SaveLook({
  title,
  occasion,
  productIds,
  navigate,
}: {
  title: string;
  occasion: string;
  productIds: string[];
  navigate: Navigate;
}) {
  const user = useAppSelector((x) => x.auth.user);
  const [products, setProducts] = useState<Product[]>([]);
  const [selections, setSelections] = useState<Record<string, LookSelection>>(
    {},
  );
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [retry, setRetry] = useState(0);
  const ids = JSON.stringify([...new Set(productIds)]);
  useEffect(() => {
    const controller = new AbortController();
    if (!user) return;
    const keys = JSON.parse(ids) as string[];
    Promise.all(
      keys.map((id) =>
        api.request<{ product: Product }>(
          "/products/" + encodeURIComponent(id),
          { signal: controller.signal },
        ),
      ),
    )
      .then((results) => {
        if (controller.signal.aborted) return;
        if (results.some((r, i) => r.product?._id !== keys[i]))
          throw Error("An outfit item is unavailable.");
        setProducts(results.map((r) => r.product));
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Cannot load outfit variants.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [ids, user, retry]);
  async function save() {
    if (
      !user ||
      busy ||
      !products.length ||
      products.some((p) => !selections[p._id])
    )
      return;
    setBusy(true);
    setError("");
    const revision = session.revision();
    try {
      const capability = await api.request<{
        variantSelectionVersion?: number;
      }>("/saved-looks", { auth: "required" });
      if (capability.variantSelectionVersion !== 1)
        throw Error(
          "Saving selected sizes and colours is temporarily unavailable. Please try again after the service update.",
        );
      if (revision !== session.revision())
        throw Error("Your account changed. Please retry.");
      const result = await api.request<{
        look?: {
          _id?: string;
          items?: {
            product: string | { _id: string };
            size: string;
            color: string;
          }[];
        };
      }>("/saved-looks", {
        auth: "required",
        method: "POST",
        body: {
          title,
          occasion,
          selections: products.map((p) => selections[p._id]),
        },
      });
      if (
        !result.look?._id ||
        result.look.items?.length !== products.length ||
        result.look.items.some((item, i) => {
          const wanted = selections[products[i]._id];
          return (
            (typeof item.product === "string"
              ? item.product
              : item.product._id) !== wanted.productId ||
            item.size !== wanted.size ||
            item.color !== wanted.color
          );
        })
      )
        throw Error(
          "The saved outfit could not be verified. Check Saved AI Looks before retrying.",
        );
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the outfit.");
    } finally {
      setBusy(false);
    }
  }
  if (!user)
    return (
      <Button
        title="Sign in to save outfits"
        outline
        onPress={() => navigate("Login", "/ai")}
      />
    );
  return (
    <View style={s.panel}>
      <Text style={s.heading}>Save this look</Text>
      <Text style={s.muted}>
        Choose the exact size and colour for every item.
      </Text>
      {loading ? <Loading /> : null}
      <ErrorBox
        message={error}
        retry={
          !products.length
            ? () => {
                setLoading(true);
                setError("");
                setRetry((v) => v + 1);
              }
            : undefined
        }
      />
      {products.map((product) => {
        const options = product.variants?.length
          ? product.variants
          : [{ size: "Standard", color: "Default" }];
        return (
          <View key={product._id} style={{ gap: 8 }}>
            <Text style={s.text}>{product.name}</Text>
            {options.map((variant, i) => (
              <Button
                key={variant.size + variant.color + i}
                outline
                title={
                  variant.size +
                  " · " +
                  variant.color +
                  (selections[product._id]?.size === variant.size &&
                  selections[product._id]?.color === variant.color
                    ? " ✓"
                    : "")
                }
                disabled={
                  busy ||
                  saved ||
                  getVariantAvailability(product, variant).status !==
                    "available"
                }
                onPress={() =>
                  setSelections((current) => ({
                    ...current,
                    [product._id]: {
                      productId: product._id,
                      size: variant.size,
                      color: variant.color,
                    },
                  }))
                }
              />
            ))}
          </View>
        );
      })}
      <Button
        title={saved ? "Look saved" : "Save selected look"}
        busy={busy}
        disabled={
          saved ||
          loading ||
          !products.length ||
          products.some((p) => !selections[p._id])
        }
        onPress={() => {
          void save();
        }}
      />
      {saved ? (
        <Button
          title="View Saved AI Looks"
          outline
          onPress={() => navigate("SavedLooks")}
        />
      ) : null}
    </View>
  );
}
