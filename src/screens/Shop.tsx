import React, { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { api } from "../api/runtime";
import { API_ORIGIN } from "../config";
import type { Product, CatalogFilter } from "../models";
import { useAppDispatch, useAppSelector } from "../state";
import {
  fetchCatalog,
  fetchHome,
  changeBag,
  changeWishlist,
} from "../state/store";
import { productImages, imageUrl, money } from "../shared/catalog";
import { getVariantAvailability } from "../shared/productAvailability";
import {
  Button,
  Empty,
  ErrorBox,
  Field,
  Loading,
  styles as s,
} from "../components/ui";
export type Navigate = (route: string, id?: string) => void;
export function ProductCard({
  product,
  navigate,
}: {
  product: Product;
  navigate: Navigate;
}) {
  const image = productImages(product, API_ORIGIN)[0];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={"View " + product.name}
      onPress={() => navigate("Product", product._id)}
      style={[s.panel, { flex: 1, margin: 5 }]}
    >
      {image ? (
        <Image
          source={{ uri: image }}
          accessibilityLabel={product.name}
          style={[s.image, { height: 180 }]}
        />
      ) : (
        <Text style={s.muted}>Image unavailable</Text>
      )}
      <Text style={s.text}>{product.name}</Text>
      <Text style={s.price}>{money(product.price)}</Text>
    </Pressable>
  );
}
export function Home({ navigate }: { navigate: Navigate }) {
  const dispatch = useAppDispatch();
  const { home, homeLoading, homeError } = useAppSelector((x) => x.catalog);
  const pin = useAppSelector((x) => x.location?.pinCode) || "";
  useEffect(() => {
    const job = dispatch(fetchHome(pin));
    return () => job.abort();
  }, [dispatch, pin]);
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={[s.muted, { color: "#D4AF37", letterSpacing: 2 }]}>
        CRAFTED TO STAND OUT
      </Text>
      <Text style={s.title}>Luxury Fashion, Curated For Every Occasion.</Text>
      <Text style={s.muted}>
        {home?.banners?.[0]?.description ||
          "Explore Tastha’s latest fashion collections."}
      </Text>
      <View style={s.row}>
        <Button title="Explore Collection" onPress={() => navigate("Shop")} />
        <Button title="AI Outfit Finder" outline onPress={() => navigate("AI")} />
      </View>
      {homeLoading ? <Loading /> : null}
      <ErrorBox message={homeError} retry={() => dispatch(fetchHome(pin))} />
      {home?.banners?.map((b, i) => {
        const banner = imageUrl(
          b.mobileImageUrl || b.imageUrl || b.image,
          API_ORIGIN,
        );
        return (
          <View key={i} style={s.panel}>
            {banner ? (
              <Image
                source={{ uri: banner }}
                style={[s.image, { height: 180, borderRadius: 12 }]}
                resizeMode="cover"
                accessibilityLabel={b.title || "Tastha collection"}
              />
            ) : null}
            {b.title ? <Text style={s.heading}>{b.title}</Text> : null}
            {b.subtitle ? <Text style={s.muted}>{b.subtitle}</Text> : null}
            <Button
              title="Shop collection"
              outline
              onPress={() => navigate("Shop")}
            />
          </View>
        );
      })}
      {home?.categories?.length ? (
        <View style={{ gap: 12 }}>
          <Text style={s.muted}>BROWSE</Text>
          <Text style={s.heading}>Shop By Category</Text>
          <View style={[s.row, { alignItems: "stretch" }]}>
            {home.categories.map((category, i) => {
              const thumbnail = imageUrl(category.image, API_ORIGIN);
              return (
                <Pressable
                  key={category.slug || category.name + i}
                  accessibilityRole="button"
                  accessibilityLabel={"Shop " + category.name}
                  onPress={() => navigate("Shop", category.slug || category.name)}
                  style={[s.panel, { width: "46%", padding: 8, gap: 6 }]}
                >
                  {thumbnail ? (
                    <Image
                      source={{ uri: thumbnail }}
                      style={{ width: "100%", height: 105, borderRadius: 8 }}
                      resizeMode="cover"
                      accessibilityLabel={category.name}
                    />
                  ) : null}
                  <Text style={s.text}>{category.name}</Text>
                  {typeof category.productCount === "number" ? (
                    <Text style={s.muted}>{category.productCount} products</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      {home?.occasions?.length ? (
        <View style={{ gap: 12 }}>
          <Text style={s.muted}>PERSONALIZED FOR YOU</Text>
          <Text style={s.heading}>Dress Smarter With AI</Text>
          <Text style={s.muted}>Choose your occasion on Tastha.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={s.row}>
              {home.occasions.map((occasion, i) => {
                const label = occasion.title || occasion.name || "Occasion";
                const image = imageUrl(occasion.image, API_ORIGIN);
                return (
                  <Pressable
                    key={occasion._id || occasion.slug || String(i)}
                    accessibilityRole="button"
                    onPress={() => navigate("AI")}
                    style={[s.panel, { width: 155, padding: 8 }]}
                  >
                    {image ? (
                      <Image
                        source={{ uri: image }}
                        style={{ height: 115, width: "100%", borderRadius: 8 }}
                        resizeMode="cover"
                      />
                    ) : null}
                    <Text style={s.text}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      ) : null}
      {home?.sections?.map((section, i) => (
        <View key={section.id || i} style={{ gap: 12 }}>
          <Text style={s.heading}>{section.title}</Text>
          <View style={[s.row, { alignItems: "stretch" }]}>
            {section.products?.slice(0, 6).map((p) => (
              <View key={p._id} style={{ width: "46%" }}>
                <ProductCard product={p} navigate={navigate} />
              </View>
            ))}
          </View>
          <Button
            title="View Collection"
            outline
            onPress={() => navigate("Shop")}
          />
        </View>
      ))}
      {home && !home.sections?.some((x) => x.products?.length) ? (
        <Empty
          title="Explore Tastha"
          detail="Open the collection to see currently available products."
        />
      ) : null}
    </ScrollView>
  );
}
export function Catalog({
  navigate,
  category,
}: {
  navigate: Navigate;
  category?: string;
}) {
  const dispatch = useAppDispatch();
  const c = useAppSelector((x) => x.catalog);
  const pin = useAppSelector((x) => x.location?.pinCode);
  const [filter, setFilter] = useState<CatalogFilter>({
    search: "",
    category: category || "",
    sort: "newest",
    maxPrice: "",
  });
  const [query, setQuery] = useState(filter);
  useEffect(() => {
    setFilter((current) =>
      current.category === (category || "")
        ? current
        : { ...current, category: category || "" },
    );
  }, [category]);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(filter), 350);
    return () => clearTimeout(timer);
  }, [filter]);
  const key = JSON.stringify([query, pin]);
  useEffect(() => {
    const task = dispatch(fetchCatalog({ filter: query, page: 1, key }));
    return () => task.abort();
  }, [dispatch, key]);
  const load = (page: number) =>
    dispatch(fetchCatalog({ filter: query, page, key }));
  return (
    <FlatList
      data={c.items}
      keyExtractor={(p) => p._id}
      numColumns={2}
      contentContainerStyle={{ padding: 10, paddingBottom: 30 }}
      renderItem={({ item }) => (
        <ProductCard product={item} navigate={navigate} />
      )}
      ListHeaderComponent={
        <View style={s.content}>
          <Text style={s.title}>The collection</Text>
          <Field
            label="Search products"
            value={filter.search}
            onChangeText={(search) => setFilter({ ...filter, search })}
          />
          <Field
            label="Category"
            placeholder="All categories"
            value={filter.category}
            onChangeText={(category) => setFilter({ ...filter, category })}
          />
          <View style={s.row}>
            {[
              ["newest", "Newest"],
              ["price-low", "Price ↑"],
              ["price-high", "Price ↓"],
              ["popular", "Popular"],
            ].map(([value, label]) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: filter.sort === value }}
                key={value}
                style={[s.pill, filter.sort === value && s.active]}
                onPress={() => setFilter({ ...filter, sort: value })}
              >
                <Text style={s.text}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      }
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (!c.loading && !c.error && c.hasMore && c.page > 0 && c.key === key)
          load(c.page + 1);
      }}
      ListEmptyComponent={
        !c.loading && !c.error ? (
          <Empty
            title="No matching products"
            detail="Try another search or category."
          />
        ) : undefined
      }
      ListFooterComponent={
        <View>
          {c.loading ? <Loading /> : null}
          <ErrorBox message={c.error} retry={() => load(c.page + 1)} />
          {!c.hasMore && c.items.length ? (
            <Text style={[s.muted, { textAlign: "center", padding: 20 }]}>
              You’ve seen the collection.
            </Text>
          ) : null}
        </View>
      }
    />
  );
}
export function ProductDetail({
  id,
  navigate,
}: {
  id: string;
  navigate: Navigate;
}) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((x) => x.auth.user);
  const busy = useAppSelector((x) => x.commerce.busy);
  const [product, setProduct] = useState<Product | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [size, setSize] = useState(""),
    [color, setColor] = useState(""),
    [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setProduct(null);
    setError("");
    setSize("");
    setColor("");
    api
      .request<{ product: Product }>("/products/" + encodeURIComponent(id), {
        signal: controller.signal,
      })
      .then((r) => {
        if (!r.product?._id) throw Error("Product unavailable.");
        setProduct(r.product);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [id, reload]);
  if (error)
    return <ErrorBox message={error} retry={() => setReload((x) => x + 1)} />;
  if (!product) return <Loading />;
  const availability = getVariantAvailability(product, { size, color });
  const variant = product.variants?.find(
    (v) => v.size === size && v.color === color,
  );
  const imageVariant =
    variant ||
    (color
      ? product.variants?.find(
          (v) => v.color === color && (v.images?.length || v.image),
        )
      : undefined);
  const images = productImages(product, API_ORIGIN, imageVariant);
  async function add() {
    if (!user) {
      navigate("Login");
      return;
    }
    setNotice("");
    try {
      await dispatch(
        changeBag({
          kind: "add",
          productId: id,
          selectedSize: size || undefined,
          selectedColor: color || undefined,
          variantSku: variant?.sku,
        }),
      ).unwrap();
      setNotice("Added to your bag.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not add this variant.");
    }
  }
  return (
    <ScrollView contentContainerStyle={s.content}>
      {variant && images.length === 0 ? (
        <Text style={s.muted}>
          No photo is available for this selected variant.
        </Text>
      ) : null}
      {images.map((uri) => (
        <Image
          key={uri}
          source={{ uri }}
          style={s.image}
          accessibilityLabel={`${product.name}${color ? " — " + color : ""}`}
        />
      ))}
      <Text style={s.title}>{product.name}</Text>
      <Text style={s.price}>{money(variant?.price ?? product.price)}</Text>
      <Text style={s.muted}>{product.description}</Text>
      {product.variants?.length ? (
        <>
          <Text style={s.text}>Colour</Text>
          <View style={s.row}>
            {[...new Set(product.variants.map((v) => v.color))].map((v) => (
              <Pressable
                key={v}
                accessibilityRole="button"
                accessibilityState={{ selected: color === v }}
                style={[s.pill, color === v && s.active]}
                onPress={() => {
                  setColor(v);
                  if (size && !product.variants?.some(
                    (item) => item.color === v && item.size === size && item.isActive !== false,
                  )) setSize("");
                }}
              >
                <Text style={s.text}>{v}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.text}>Size</Text>
          <View style={s.row}>
            {[...new Set(product.variants.map((v) => v.size))].map((v) => (
              <Pressable
                key={v}
                accessibilityRole="button"
                accessibilityState={{ selected: size === v }}
                style={[s.pill, size === v && s.active]}
                onPress={() => {
                  setSize(v);
                  if (color && !product.variants?.some(
                    (item) => item.size === v && item.color === color && item.isActive !== false,
                  )) setColor("");
                }}
              >
                <Text style={s.text}>{v}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      <Text accessibilityLiveRegion="polite" style={s.muted}>
        {availability.status === "available"
          ? `${availability.stock} available`
          : availability.status === "selection_required"
            ? "Select a size and colour"
            : availability.status === "inventory_unknown"
              ? "Stock could not be confirmed"
              : "This selection is unavailable"}
      </Text>
      <Button
        title="Add to bag"
        busy={busy}
        disabled={availability.status !== "available"}
        onPress={add}
      />
      <Button
        title="Save to wishlist"
        outline
        disabled={busy}
        onPress={() => {
          if (!user) {
            navigate("Login");
            return;
          }
          dispatch(changeWishlist({ id, remove: false }))
            .unwrap()
            .then(() => setNotice("Saved to wishlist."))
            .catch((e) => setNotice(e.message));
        }}
      />
      <Button
        title="Share product"
        outline
        onPress={() => {
          Share.share({
            message: `${product.name} — https://tasthaofficial.vercel.app/product/${id}`,
          }).catch(() => setNotice("Sharing is unavailable."));
        }}
      />
      <Text accessibilityLiveRegion="polite" style={s.text}>
        {notice}
      </Text>
      <Text style={s.muted}>
        Delivery eligibility and current stock are rechecked at checkout.
      </Text>
    </ScrollView>
  );
}
