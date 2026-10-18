import React, { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  useWindowDimensions,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { ProductReviews } from "../components/ProductReviews";
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
import {
  productImages,
  imageUrl,
  money,
  normalizeRelatedProducts,
} from "../shared/catalog";
import { getVariantAvailability } from "../shared/productAvailability";
import {
  resolveCatalogCategory,
  type StoreCategory,
} from "../shared/catalogPage";
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
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const job = dispatch(fetchHome(pin));
    return () => job.abort();
  }, [dispatch, pin]);
  const banners = home?.banners || [],
    banner = banners.length ? banners[slide % banners.length] : undefined;
  const hero = imageUrl(
    banner?.mobileImage ||
      banner?.mobileImageUrl ||
      banner?.image ||
      banner?.imageUrl,
    API_ORIGIN,
  );
  return (
    <ScrollView contentContainerStyle={s.content}>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <Text style={[s.muted, { color: "#D4AF37", letterSpacing: 2 }]}>
          THE TASTHA EXPERIENCE
        </Text>
        <Button title="Style studio" outline onPress={() => navigate("AI")} />
      </View>
      <Text style={s.muted}>Less searching. More finding your style.</Text>
      {homeLoading ? <Loading /> : null}
      <ErrorBox message={homeError} retry={() => dispatch(fetchHome(pin))} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={s.row}>
          <Button title="All styles" outline onPress={() => navigate("Shop")} />
          {home?.categories?.map((category) => (
            <Pressable
              key={category.slug || category.name}
              style={[s.pill, { width: 110 }]}
              accessibilityRole="button"
              onPress={() => navigate("Shop", category.name)}
            >
              {imageUrl(category.image, API_ORIGIN) ? (
                <Image
                  source={{ uri: imageUrl(category.image, API_ORIGIN)! }}
                  style={{ width: 82, height: 72, borderRadius: 8 }}
                  accessibilityLabel={category.name}
                />
              ) : null}
              <Text style={s.text}>{category.name}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      {home ? (
        <View style={s.panel}>
          {hero ? (
            <Image
              source={{ uri: hero }}
              style={[s.image, { height: 280 }]}
              resizeMode="cover"
              accessibilityLabel={banner?.title || "Tastha collection"}
            />
          ) : null}
          <Text style={[s.muted, { color: "#D4AF37" }]}>
            {banner?.eyebrow || "A WARDROBE, WITH INTENTION"}
          </Text>
          <Text style={s.title}>
            {banner?.title ||
              home.config?.headline ||
              "Discover your next favourite"}
          </Text>
          <Text style={s.muted}>
            {banner?.subtitle || home.config?.description}
          </Text>
          <Button
            title={banner?.ctaText || "Discover the collection"}
            onPress={() =>
              navigate("StoreLink", banner?.ctaLink || banner?.link || "/shop")
            }
          />
          {banners.length > 1 ? (
            <View style={s.row}>
              <Button
                title="Previous campaign"
                outline
                onPress={() =>
                  setSlide((x) => (x - 1 + banners.length) % banners.length)
                }
              />
              <Text style={s.muted}>
                {(slide % banners.length) + 1} / {banners.length}
              </Text>
              <Button
                title="Next campaign"
                outline
                onPress={() => setSlide((x) => (x + 1) % banners.length)}
              />
            </View>
          ) : null}
        </View>
      ) : null}
      {home?.config?.budgets?.length ? (
        <View style={s.panel}>
          <Text style={s.heading}>Great style has a range.</Text>
          <View style={s.row}>
            {home.config.budgets
              .filter((x) => Number.isFinite(x) && x > 0)
              .map((budget) => (
                <Button
                  key={budget}
                  title={"Under " + money(budget)}
                  outline
                  onPress={() =>
                    navigate(
                      "StoreLink",
                      "/shop?maxPrice=" + budget + "&sort=price_low",
                    )
                  }
                />
              ))}
          </View>
        </View>
      ) : null}
      {home?.delivery?.message ? (
        <Text style={s.muted}>{home.delivery.message}</Text>
      ) : null}
      {home?.sections
        ?.filter((section) => section.products?.length)
        .map((section, i) => (
          <View key={section.id || i} style={{ gap: 12 }}>
            <Text style={s.heading}>{section.title}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={[s.row, { alignItems: "stretch" }]}>
                {section.products.map((product) => (
                  <View key={product._id} style={{ width: 190 }}>
                    <ProductCard product={product} navigate={navigate} />
                  </View>
                ))}
              </View>
            </ScrollView>
            <Button
              title={"Explore " + section.title}
              outline
              onPress={() =>
                navigate(
                  "StoreLink",
                  section.id === "newest" ? "/shop?sort=newest" : "/shop",
                )
              }
            />
          </View>
        ))}
      {home && !home.sections?.some((section) => section.products?.length) ? (
        <Empty
          title="Your next favourite is on its way"
          detail={
            home.delivery?.message ||
            "Explore the catalog or choose another category."
          }
        />
      ) : null}
      {home?.occasions?.length ? (
        <View style={s.panel}>
          <Text style={s.heading}>Where are you heading?</Text>
          <Text style={s.muted}>
            Start with the moment. Discover your outfit.
          </Text>
          {home.occasions.map((occasion, i) => (
            <Button
              key={occasion._id || i}
              title={occasion.title || occasion.name || "Explore occasion"}
              outline
              onPress={() =>
                navigate(
                  "StoreLink",
                  "/choose-occasion?occasion=" +
                    encodeURIComponent(occasion.slug || occasion.title || ""),
                )
              }
            />
          ))}
        </View>
      ) : null}
      <Text style={s.title}>One good piece. Endless possibilities.</Text>
      <Button title="See every style" onPress={() => navigate("Shop")} />
    </ScrollView>
  );
}
export function Catalog({
  navigate,
  category,
  search,
  sort,
  maxPrice,
}: {
  navigate: Navigate;
  category?: string;
  search?: string;
  sort?: string;
  maxPrice?: string;
}) {
  const dispatch = useAppDispatch();
  const c = useAppSelector((x) => x.catalog);
  const pin = useAppSelector((x) => x.location?.pinCode);
  const [categories, setCategories] = useState<StoreCategory[]>(
    c.home?.categories || [],
  );
  const [categoryError, setCategoryError] = useState("");
  const [filter, setFilter] = useState<CatalogFilter>({
    search: search || "",
    category: resolveCatalogCategory(category, c.home?.categories || []),
    sort: sort || "newest",
    maxPrice: maxPrice || "",
  });
  const [query, setQuery] = useState(filter);
  useEffect(() => {
    const controller = new AbortController();
    api
      .request<{ categories?: StoreCategory[] }>(
        "/home/categories?deliveryPinCode=" + encodeURIComponent(pin || ""),
        { signal: controller.signal },
      )
      .then((result) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(result.categories))
          throw Error("Categories are unavailable.");
        setCategories(
          result.categories.filter(
            (item) => item && typeof item.name === "string" && item.name.trim(),
          ),
        );
        setCategoryError("");
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setCategoryError(
            reason instanceof Error
              ? reason.message
              : "Categories unavailable.",
          );
      });
    return () => controller.abort();
  }, [pin]);
  useEffect(() => {
    const resolved = resolveCatalogCategory(category, categories);
    setFilter((current) =>
      current.category === resolved
        ? current
        : { ...current, category: resolved },
    );
  }, [category, categories]);
  useEffect(() => {
    setFilter((current) =>
      current.search === (search || "")
        ? current
        : { ...current, search: search || "" },
    );
  }, [search]);
  useEffect(() => {
    setFilter((current) => ({
      ...current,
      sort: sort || "newest",
      maxPrice: maxPrice || "",
    }));
  }, [sort, maxPrice]);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(filter), 350);
    return () => clearTimeout(timer);
  }, [filter]);
  const key = JSON.stringify([query, pin]);
  useEffect(() => {
    const task = dispatch(fetchCatalog({ filter: query, page: 1, key }));
    return () => task.abort();
  }, [dispatch, key, query]);
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
          <Text style={s.heading}>Browse by category</Text>
          <View style={s.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: !filter.category }}
              style={[s.pill, !filter.category && s.active]}
              onPress={() =>
                setFilter((current) => ({ ...current, category: "" }))
              }
            >
              <Text style={s.text}>All</Text>
            </Pressable>
            {categories.map((option) => (
              <Pressable
                key={option.slug || option.name}
                accessibilityRole="button"
                accessibilityState={{
                  selected: option.name === filter.category,
                }}
                style={[s.pill, option.name === filter.category && s.active]}
                onPress={() =>
                  setFilter((current) => ({
                    ...current,
                    category: option.name,
                  }))
                }
              >
                <Text style={s.text}>{option.name}</Text>
              </Pressable>
            ))}
          </View>
          <ErrorBox message={categoryError} />
          <Field
            label="Maximum price (₹)"
            value={filter.maxPrice}
            keyboardType="number-pad"
            onChangeText={(maxPrice) =>
              setFilter((current) => ({
                ...current,
                maxPrice: maxPrice.replace(/[^0-9]/g, ""),
              }))
            }
          />
          <Text style={s.heading}>Sort products</Text>
          <View style={s.row}>
            {[
              ["newest", "Newest"],
              ["price_low", "Price ↑"],
              ["price_high", "Price ↓"],
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
  initialSize,
  initialColor,
}: {
  id: string;
  navigate: Navigate;
  initialSize?: string;
  initialColor?: string;
}) {
  const { width } = useWindowDimensions();
  const dispatch = useAppDispatch();
  const user = useAppSelector((x) => x.auth.user);
  const busy = useAppSelector((x) => x.commerce.busy);
  const [product, setProduct] = useState<Product | null>(null),
    [related, setRelated] = useState<Product[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [size, setSize] = useState(""),
    [color, setColor] = useState(""),
    [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setProduct(null);
    setRelated([]);
    setError("");
    setSize(initialSize || "");
    setColor(initialColor || "");
    api
      .request<{ product: Product; relatedProducts?: Product[] }>(
        "/products/" + encodeURIComponent(id),
        {
          signal: controller.signal,
        },
      )
      .then((r) => {
        if (controller.signal.aborted) return;
        if (!r.product?._id) throw Error("Product unavailable.");
        setProduct(r.product);
        setRelated(normalizeRelatedProducts(r.product._id, r.relatedProducts));
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [id, reload, initialSize, initialColor]);
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
      {images.length ? (
        <>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            accessibilityLabel={"Images of " + product.name}
          >
            {images.map((uri, index) => (
              <Image
                key={uri}
                source={{ uri }}
                style={[
                  s.image,
                  {
                    width: Math.max(220, Math.min(width - 40, 520)),
                    height: 300,
                    borderRadius: 12,
                  },
                ]}
                resizeMode="contain"
                accessibilityLabel={
                  product.name +
                  (color ? " in " + color : "") +
                  ", image " +
                  (index + 1) +
                  " of " +
                  images.length
                }
              />
            ))}
          </ScrollView>
          {images.length > 1 ? (
            <Text style={s.muted}>
              Swipe to view all {images.length} product images
            </Text>
          ) : null}
        </>
      ) : (
        <Text style={s.muted}>Product images are unavailable.</Text>
      )}
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
                  if (
                    size &&
                    !product.variants?.some(
                      (item) =>
                        item.color === v &&
                        item.size === size &&
                        item.isActive !== false,
                    )
                  )
                    setSize("");
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
                  if (
                    color &&
                    !product.variants?.some(
                      (item) =>
                        item.size === v &&
                        item.color === color &&
                        item.isActive !== false,
                    )
                  )
                    setColor("");
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
      {related.length ? (
        <View style={{ gap: 12 }}>
          <Text style={s.heading}>You may also like</Text>
          <Text style={s.muted}>Related products from the Tastha catalog</Text>
          <View style={[s.row, { alignItems: "stretch" }]}>
            {related.map((item) => (
              <View key={item._id} style={{ width: "46%" }}>
                <ProductCard product={item} navigate={navigate} />
              </View>
            ))}
          </View>
        </View>
      ) : null}
      <ProductReviews key={id} id={id} />
    </ScrollView>
  );
}
