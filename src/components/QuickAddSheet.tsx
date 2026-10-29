import { quickAddSelection } from "../shared/quickAdd";
import React, { useEffect, useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../api/runtime";
import { API_ORIGIN, colors } from "../config";
import type { Product } from "../models";
import { productImages, money } from "../shared/catalog";
import { getVariantAvailability } from "../shared/productAvailability";
import { useAppDispatch, useAppSelector } from "../state";
import { changeBag, fetchBag } from "../state/store";
import { Button, ErrorBox, Loading, styles as s } from "./ui";
import type { Navigate } from "../screens/Shop";
export function QuickAddSheet({
  id,
  navigate,
  close,
  added,
}: {
  id: string;
  navigate: Navigate;
  close: () => void;
  added: () => void;
}) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((x) => x.auth.user);
  const globalBusy = useAppSelector((x) => x.commerce.busy);
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState<Product | null>(null),
    [size, setSize] = useState(""),
    [color, setColor] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api
      .request<{ product: Product }>("/products/" + encodeURIComponent(id), {
        signal: controller.signal,
      })
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.product?._id !== id)
          throw Error("This product is unavailable.");
        setProduct(result.product);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Cannot load this product.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, retry]);
  const availability = getVariantAvailability(product, { size, color });
  const variant = product?.variants?.find(
    (v) => v.size === size && v.color === color,
  );
  const image = product
    ? productImages(product, API_ORIGIN, variant)[0]
    : undefined;
  async function add() {
    if (
      !product ||
      availability.status !== "available" ||
      busy ||
      globalBusy ||
      uncertain
    )
      return;
    if (!user) {
      close();
      navigate(
        "Login",
        "/product/" +
          encodeURIComponent(id) +
          "?selectedSize=" +
          encodeURIComponent(size) +
          "&selectedColor=" +
          encodeURIComponent(color),
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await dispatch(
        changeBag(quickAddSelection(product, size, color)),
      ).unwrap();
      added();
      close();
    } catch (e) {
      setUncertain(true);
      void dispatch(fetchBag());
      setError(
        (e instanceof Error
          ? e.message
          : "Bag update could not be confirmed.") +
          " Check your bag before adding again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      transparent
      animationType="slide"
      visible
      onRequestClose={() => {
        if (!busy) close();
      }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "#000000aa",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close size selection"
          disabled={busy}
          onPress={close}
          style={{ flex: 1 }}
        />
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: "85%",
            width: "100%",
            maxWidth: 680,
            alignSelf: "center",
            backgroundColor: colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 1,
            borderColor: colors.border,
            paddingBottom: Math.max(16, insets.bottom),
          }}
        >
          <ScrollView
            contentContainerStyle={[s.content, { paddingBottom: 16 }]}
          >
            <Button title="Close" outline disabled={busy} onPress={close} />
            {loading ? <Loading /> : null}
            <ErrorBox
              message={error}
              retry={
                !product
                  ? () => {
                      setError("");
                      setLoading(true);
                      setRetry((v) => v + 1);
                    }
                  : undefined
              }
            />
            {product ? (
              <>
                <View style={s.row}>
                  {image ? (
                    <Image
                      source={{ uri: image }}
                      style={{ width: 80, height: 100, resizeMode: "contain" }}
                      accessibilityLabel={product.name}
                    />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text accessibilityRole="header" style={s.heading}>
                      {product.name}
                    </Text>
                    <Text style={s.price}>
                      {money(variant?.price ?? product.price)}
                    </Text>
                  </View>
                </View>
                {product.variants?.length ? (
                  <>
                    <Text style={s.text}>Choose colour</Text>
                    <View style={s.row}>
                      {[...new Set(product.variants.map((v) => v.color))].map(
                        (value) => (
                          <Pressable
                            key={value}
                            accessibilityRole="button"
                            accessibilityState={{ selected: color === value }}
                            disabled={busy}
                            style={[s.pill, color === value && s.active]}
                            onPress={() => {
                              setColor(value);
                              if (
                                !product.variants?.some(
                                  (v) => v.color === value && v.size === size,
                                )
                              )
                                setSize("");
                            }}
                          >
                            <Text style={s.text}>{value}</Text>
                          </Pressable>
                        ),
                      )}
                    </View>
                    <Text style={s.text}>Choose size</Text>
                    <View style={s.row}>
                      {[...new Set(product.variants.map((v) => v.size))].map(
                        (value) => (
                          <Pressable
                            key={value}
                            accessibilityRole="button"
                            accessibilityState={{ selected: size === value }}
                            disabled={busy}
                            style={[s.pill, size === value && s.active]}
                            onPress={() => setSize(value)}
                          >
                            <Text style={s.text}>{value}</Text>
                          </Pressable>
                        ),
                      )}
                    </View>
                  </>
                ) : null}
                <Text accessibilityLiveRegion="polite" style={s.muted}>
                  {availability.status === "available"
                    ? "Ready to add"
                    : availability.status === "selection_required"
                      ? "Choose your size and colour"
                      : "This selection is unavailable"}
                </Text>
                <Button
                  title={user ? "Add to bag" : "Sign in to add"}
                  busy={busy}
                  disabled={
                    globalBusy ||
                    uncertain ||
                    availability.status !== "available"
                  }
                  onPress={() => {
                    void add();
                  }}
                />
                <Button
                  title={
                    uncertain ? "Check my bag" : "View full product details"
                  }
                  outline
                  disabled={busy}
                  onPress={() => {
                    close();
                    navigate(
                      uncertain ? "Bag" : "Product",
                      uncertain ? undefined : id,
                    );
                  }}
                />
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
