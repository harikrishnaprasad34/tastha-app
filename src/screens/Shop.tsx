import Ionicons from "@expo/vector-icons/Ionicons";
import { QuickAddSheet } from "../components/QuickAddSheet";
import React, { useEffect, useState, useRef } from "react";
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
import { SizeGuide } from "../components/SizeGuide";
import { catalogFilterError } from "../shared/catalogFilters";
import { ProductReviews } from "../components/ProductReviews";
import { api } from "../api/runtime";
import { API_ORIGIN, colors } from "../config";
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
  const dispatch = useAppDispatch();
  const isSaved = useAppSelector((x) =>
    x.commerce.wishlist.some((item) => item._id === product._id),
  );
  const saving = useAppSelector((x) => x.commerce.busy);
  const accountId = useAppSelector((x) => x.auth.user?.id || "guest");
  const [quickAdd, setQuickAdd] = useState(false),
    [notice, setNotice] = useState("");
  const savings =
    Number.isFinite(product.originalPrice) &&
    product.originalPrice! > product.price
      ? product.originalPrice! - product.price
      : 0;
  return (
    <View
      style={[
        s.panel,
        {
          flex: 1,
          minWidth: 0,
          margin: 4,
          padding: 8,
          gap: 8,
          borderRadius: 16,
          overflow: "hidden",
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          (isSaved ? "Remove " : "Save ") +
          product.name +
          (isSaved ? " from wishlist" : " to wishlist")
        }
        accessibilityState={{ selected: isSaved, disabled: saving }}
        disabled={saving}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 2,
          backgroundColor: "#121316DD",
          borderRadius: 22,
          minWidth: 44,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
        }}
        onPress={() => {
          if (accountId === "guest") {
            navigate("Login", "/product/" + encodeURIComponent(product._id));
            return;
          }
          void dispatch(changeWishlist({ id: product._id, remove: isSaved }))
            .unwrap()
            .then(() =>
              setNotice(
                isSaved ? "Removed from wishlist" : "Saved to wishlist",
              ),
            )
            .catch((e) =>
              setNotice(
                e instanceof Error ? e.message : "Wishlist update failed",
              ),
            );
        }}
      >
        <Ionicons
          name={isSaved ? "heart" : "heart-outline"}
          size={20}
          color={colors.gold}
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={"View " + product.name}
        onPress={() => navigate("Product", product._id)}
        style={{ gap: 8 }}
      >
        {image ? (
          <Image
            source={{ uri: image }}
            accessibilityLabel={product.name}
            style={[s.image, { height: 180, borderRadius: 10 }]}
          />
        ) : (
          <View
            style={{
              height: 180,
              backgroundColor: colors.elevated,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
            }}
          >
            <Ionicons name="shirt-outline" size={32} color={colors.muted} />
            <Text style={s.small}>Image unavailable</Text>
          </View>
        )}
        <Text
          numberOfLines={1}
          style={{
            color: colors.muted,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.6,
          }}
        >
          {product.brand || "TASTHA"}
        </Text>
        <Text
          numberOfLines={2}
          style={[s.text, { minHeight: 40, fontSize: 14, lineHeight: 20 }]}
        >
          {product.name}
        </Text>
        <View style={[s.row, { gap: 6 }]}>
          <Text style={[s.price, { fontSize: 16 }]}>
            {money(product.price)}
          </Text>
          {savings > 0 ? (
            <Text style={[s.small, { textDecorationLine: "line-through" }]}>
              {money(product.originalPrice!)}
            </Text>
          ) : null}
        </View>
        {savings > 0 ? (
          <Text style={[s.small, { color: "#D4AF37" }]}>
            Save {money(savings)}
          </Text>
        ) : null}
      </Pressable>
      <Button
        title="Choose size"
        outline
        onPress={() => {
          setNotice("");
          setQuickAdd(true);
        }}
      />
      {notice ? (
        <Text accessibilityLiveRegion="polite" style={s.small}>
          {notice}
        </Text>
      ) : null}
      {quickAdd ? (
        <QuickAddSheet
          key={product._id + accountId}
          id={product._id}
          navigate={navigate}
          close={() => setQuickAdd(false)}
          added={() => setNotice("Added to bag")}
        />
      ) : null}
    </View>
  );
}

type ShortcutIcon = React.ComponentProps<typeof Ionicons>["name"];
function Shortcut({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: ShortcutIcon;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: "center",
        gap: 7,
        minWidth: 60,
        paddingVertical: 6,
      }}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 16,
          backgroundColor: colors.elevated,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Ionicons name={icon} size={22} color={colors.gold} />
      </View>
      <Text
        numberOfLines={2}
        style={{
          color: colors.text,
          fontSize: 12,
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        {title}
      </Text>
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
  const banners = home?.banners || [];
  const banner = banners.length ? banners[slide % banners.length] : undefined;
  const sections =
    home?.sections?.filter((section) => section.products?.length) || [];
  const firstProduct = sections[0]?.products[0];
  const hero =
    imageUrl(
      banner?.mobileImage ||
        banner?.mobileImageUrl ||
        banner?.image ||
        banner?.imageUrl,
      API_ORIGIN,
    ) ||
    (firstProduct ? productImages(firstProduct, API_ORIGIN)[0] : undefined);
  return (
    <ScrollView
      contentContainerStyle={[s.content, { gap: 20 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: "row", gap: 6 }}>
        <Shortcut
          title="New arrivals"
          icon="sparkles-outline"
          onPress={() => navigate("StoreLink", "/shop?sort=newest")}
        />
        <Shortcut
          title="Offers"
          icon="pricetag-outline"
          onPress={() => navigate("StoreLink", "/shop?offersOnly=true")}
        />
        <Shortcut
          title="Style studio"
          icon="color-palette-outline"
          onPress={() => navigate("AI")}
        />
        <Shortcut
          title="Saved looks"
          icon="albums-outline"
          onPress={() => navigate("SavedLooks")}
        />
      </View>
      {homeLoading ? (
        <View
          style={[
            s.panel,
            { minHeight: 150, justifyContent: "center", alignItems: "center" },
          ]}
        >
          <Loading />
          <Text style={s.muted}>Finding your next favourite…</Text>
          <Text style={s.small}>Loading Tastha collections</Text>
        </View>
      ) : null}
      <ErrorBox message={homeError} retry={() => dispatch(fetchHome(pin))} />
      {home ? (
        <>
          <View style={{ gap: 12 }}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={s.heading}>Shop by category</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View all categories"
                onPress={() => navigate("Shop")}
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Text
                  style={{
                    color: colors.gold,
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  View all
                </Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 14 }}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigate("Shop")}
                  style={{ width: 72, alignItems: "center", gap: 8 }}
                >
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 20,
                      backgroundColor: colors.elevated,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name="grid-outline"
                      size={28}
                      color={colors.gold}
                    />
                  </View>
                  <Text style={[s.small, { color: colors.text }]}>
                    All styles
                  </Text>
                </Pressable>
                {home.categories?.map((category) => (
                  <Pressable
                    key={category.slug || category.name}
                    accessibilityRole="button"
                    onPress={() => navigate("Shop", category.name)}
                    style={{ width: 72, alignItems: "center", gap: 8 }}
                  >
                    {imageUrl(category.image, API_ORIGIN) ? (
                      <Image
                        source={{ uri: imageUrl(category.image, API_ORIGIN)! }}
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 20,
                          backgroundColor: colors.elevated,
                        }}
                        accessibilityLabel={category.name}
                      />
                    ) : (
                      <View
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 20,
                          backgroundColor: colors.elevated,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons
                          name="shirt-outline"
                          size={28}
                          color={colors.gold}
                        />
                      </View>
                    )}
                    <Text
                      numberOfLines={2}
                      style={[
                        s.small,
                        { color: colors.text, textAlign: "center" },
                      ]}
                    >
                      {category.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
          {home.delivery?.message ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={colors.gold}
              />
              <Text style={[s.small, { flex: 1 }]}>
                {home.delivery.message}
              </Text>
            </View>
          ) : null}
          {sections.map((section, index) => (
            <View key={section.id || index} style={{ gap: 10 }}>
              <View
                style={[
                  s.row,
                  { justifyContent: "space-between", flexWrap: "nowrap" },
                ]}
              >
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={s.heading}>{section.title}</Text>
                  <Text style={s.small}>
                    {section.id === "deals"
                      ? "Fresh finds. Real savings."
                      : "Discover more of what you love"}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={"Explore " + section.title}
                  onPress={() =>
                    navigate(
                      "StoreLink",
                      section.id === "newest" || section.id === "new"
                        ? "/shop?sort=newest"
                        : section.id === "deals"
                          ? "/shop?offersOnly=true"
                          : "/shop",
                    )
                  }
                  style={{
                    minHeight: 44,
                    minWidth: 44,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: colors.elevated,
                    borderRadius: 22,
                  }}
                >
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={colors.gold}
                  />
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "stretch",
                    gap: 4,
                  }}
                >
                  {section.products.map((product) => (
                    <View key={product._id} style={{ width: 168 }}>
                      <ProductCard product={product} navigate={navigate} />
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          ))}
          <View
            style={{
              borderRadius: 20,
              overflow: "hidden",
              backgroundColor: "#252319",
              borderWidth: 1,
              borderColor: "#443D25",
            }}
          >
            <View style={{ flexDirection: "row", minHeight: 174 }}>
              <View
                style={{
                  flex: 1,
                  padding: 18,
                  gap: 8,
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: colors.gold,
                    fontSize: 11,
                    fontWeight: "700",
                    letterSpacing: 1.5,
                  }}
                >
                  {banner?.eyebrow || "THE TASTHA EDIT"}
                </Text>
                <Text
                  numberOfLines={3}
                  style={{
                    color: colors.text,
                    fontSize: 23,
                    lineHeight: 28,
                    fontWeight: "800",
                  }}
                >
                  {banner?.title ||
                    home.config?.headline ||
                    "Your style. Your next favourite."}
                </Text>
                <Text numberOfLines={2} style={[s.small, { lineHeight: 17 }]}>
                  {banner?.subtitle ||
                    home.config?.description ||
                    "Discover the latest Tastha collections."}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    navigate(
                      "StoreLink",
                      banner?.ctaLink || banner?.link || "/shop",
                    )
                  }
                  style={{
                    flexDirection: "row",
                    gap: 6,
                    alignItems: "center",
                    minHeight: 44,
                  }}
                >
                  <Text
                    style={{
                      color: colors.gold,
                      fontSize: 12,
                      fontWeight: "700",
                      flexShrink: 1,
                    }}
                  >
                    {banner?.ctaText || "Explore collection"}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={colors.gold}
                  />
                </Pressable>
              </View>
              {hero ? (
                <Image
                  source={{ uri: hero }}
                  style={{ width: "38%", minHeight: 174 }}
                  resizeMode="cover"
                  accessibilityLabel={
                    banner?.title || firstProduct?.name || "Tastha collection"
                  }
                />
              ) : null}
            </View>
            {banners.length > 1 ? (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  paddingBottom: 8,
                  gap: 8,
                }}
              >
                {banners.map((_, index) => (
                  <Pressable
                    key={index}
                    accessibilityRole="button"
                    accessibilityLabel={"Show campaign " + (index + 1)}
                    accessibilityState={{
                      selected: index === slide % banners.length,
                    }}
                    onPress={() => setSlide(index)}
                    style={{
                      minWidth: 32,
                      minHeight: 32,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <View
                      style={{
                        width: index === slide % banners.length ? 20 : 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor:
                          index === slide % banners.length
                            ? colors.gold
                            : colors.muted,
                      }}
                    />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
          {!sections.length ? (
            <View style={s.panel}>
              <Ionicons
                name="bag-handle-outline"
                size={28}
                color={colors.gold}
              />
              <Text style={s.heading}>Explore the Tastha collection</Text>
              <Text style={s.muted}>
                {home.delivery?.message ||
                  "No featured products are available right now. Browse the catalog for current availability."}
              </Text>
              <Button
                title="Browse products"
                onPress={() => navigate("Shop")}
              />
            </View>
          ) : null}
          {home.config?.budgets?.length ? (
            <View style={{ gap: 12 }}>
              <Text style={s.heading}>Find your price, love your style</Text>
              <View style={s.row}>
                {home.config.budgets
                  .filter((x) => Number.isFinite(x) && x > 0)
                  .map((budget) => (
                    <Pressable
                      key={budget}
                      accessibilityRole="button"
                      onPress={() =>
                        navigate(
                          "StoreLink",
                          "/shop?maxPrice=" + budget + "&sort=price_low",
                        )
                      }
                      style={[s.pill, { backgroundColor: colors.elevated }]}
                    >
                      <Text
                        style={{
                          color: colors.gold,
                          fontWeight: "700",
                          fontSize: 13,
                        }}
                      >
                        Under {money(budget)}
                      </Text>
                    </Pressable>
                  ))}
              </View>
            </View>
          ) : null}
          {home.occasions?.length ? (
            <View style={s.panel}>
              <Text style={s.heading}>A look for every plan</Text>
              <View style={s.row}>
                {home.occasions.map((occasion, index) => (
                  <Pressable
                    key={occasion._id || index}
                    accessibilityRole="button"
                    onPress={() =>
                      navigate(
                        "StoreLink",
                        "/choose-occasion?occasion=" +
                          encodeURIComponent(
                            occasion.slug || occasion.title || "",
                          ),
                      )
                    }
                    style={[
                      s.pill,
                      { flexDirection: "row", gap: 7, alignItems: "center" },
                    ]}
                  >
                    <Ionicons
                      name="sparkles-outline"
                      size={16}
                      color={colors.gold}
                    />
                    <Text style={s.text}>
                      {occasion.title || occasion.name || "Explore"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : null}
      <View
        style={{
          paddingVertical: 20,
          gap: 8,
          borderTopWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text
          style={{
            color: colors.gold,
            fontSize: 20,
            fontWeight: "800",
            letterSpacing: 3,
          }}
        >
          TASTHA
        </Text>
        <Text style={s.small}>Find your style. Make it yours.</Text>
        <View style={s.row}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigate("Contact")}
            style={{
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Ionicons name="headset-outline" size={16} color={colors.muted} />
            <Text style={s.small}>Contact us</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigate("Help", "faq")}
            style={{
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Ionicons
              name="help-circle-outline"
              size={16}
              color={colors.muted}
            />
            <Text style={s.small}>Help & FAQs</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
export function Catalog({
  navigate,
  category,
  search,
  sort,
  maxPrice,
  minPrice,
  brand,
  offersOnly,
  onFiltersChange,
}: {
  navigate: Navigate;
  category?: string;
  search?: string;
  sort?: string;
  maxPrice?: string;
  minPrice?: string;
  brand?: string;
  offersOnly?: boolean;
  onFiltersChange?: (filter: CatalogFilter) => void;
}) {
  const dispatch = useAppDispatch();
  const c = useAppSelector((x) => x.catalog);
  const pin = useAppSelector((x) => x.location?.pinCode);
  const [categories, setCategories] = useState<StoreCategory[]>(
    c.home?.categories || [],
  );
  const [categoryError, setCategoryError] = useState("");
  const [filter, setFilterState] = useState<CatalogFilter>({
    search: search || "",
    category: resolveCatalogCategory(category, c.home?.categories || []),
    sort: sort || "newest",
    maxPrice: maxPrice || "",
    minPrice: minPrice || "",
    brand: brand || "",
    offersOnly: Boolean(offersOnly),
  });
  const [showFilters, setShowFilters] = useState(false);
  const changedByCustomer = useRef(false);
  const setFilter: React.Dispatch<React.SetStateAction<CatalogFilter>> = (
    value,
  ) => {
    changedByCustomer.current = true;
    setFilterState(value);
  };
  useEffect(() => {
    if (!changedByCustomer.current) return;
    changedByCustomer.current = false;
    onFiltersChange?.(filter);
  }, [filter, onFiltersChange]);
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
    setFilterState((current) =>
      current.category === resolved
        ? current
        : { ...current, category: resolved },
    );
  }, [category, categories]);
  useEffect(() => {
    setFilterState((current) =>
      current.search === (search || "")
        ? current
        : { ...current, search: search || "" },
    );
  }, [search]);
  useEffect(() => {
    setFilterState((current) => ({
      ...current,
      sort: sort || "newest",
      maxPrice: maxPrice || "",
      minPrice: minPrice || "",
      brand: brand || "",
      offersOnly: Boolean(offersOnly),
    }));
  }, [sort, maxPrice, minPrice, brand, offersOnly]);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(filter), 350);
    return () => clearTimeout(timer);
  }, [filter]);
  const filterError = catalogFilterError(filter);
  const key = JSON.stringify([query, pin]);
  const currentResults =
    c.key === key &&
    JSON.stringify(filter) === JSON.stringify(query) &&
    !filterError;
  useEffect(() => {
    if (catalogFilterError(query)) return;
    const task = dispatch(fetchCatalog({ filter: query, page: 1, key }));
    return () => task.abort();
  }, [dispatch, key, query]);
  const load = (page: number) =>
    dispatch(fetchCatalog({ filter: query, page, key }));
  return (
    <FlatList
      data={currentResults ? c.items : []}
      keyExtractor={(p) => p._id}
      numColumns={2}
      contentContainerStyle={{ padding: 10, paddingBottom: 30 }}
      renderItem={({ item }) => (
        <View style={{ width: "50%" }}>
          <ProductCard product={item} navigate={navigate} />
        </View>
      )}
      ListHeaderComponent={
        <View
          style={[
            s.content,
            { paddingHorizontal: 6, paddingTop: 8, paddingBottom: 12, gap: 10 },
          ]}
        >
          <Text style={[s.title, { fontSize: 22 }]}>The collection</Text>
          <Field
            label="Search products"
            placeholder="Find shirts, trousers & more"
            value={filter.search}
            onChangeText={(search) => setFilter({ ...filter, search })}
          />
          <Text style={s.muted}>Browse by category</Text>
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
          <Button
            title={showFilters ? "Hide filters" : "Filter & sort"}
            outline
            onPress={() => setShowFilters((value) => !value)}
          />
          {showFilters ? (
            <View style={s.panel}>
              <Field
                label="Brand"
                value={filter.brand || ""}
                maxLength={200}
                onChangeText={(brand) =>
                  setFilter((current) => ({ ...current, brand }))
                }
              />
              <Field
                label="Minimum price (₹)"
                value={filter.minPrice || ""}
                keyboardType="number-pad"
                onChangeText={(minPrice) =>
                  setFilter((current) => ({
                    ...current,
                    minPrice: minPrice.replace(/[^0-9]/g, ""),
                  }))
                }
              />
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
              <ErrorBox message={filterError} />
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: Boolean(filter.offersOnly) }}
                style={[s.pill, filter.offersOnly && s.active]}
                onPress={() =>
                  setFilter((current) => ({
                    ...current,
                    offersOnly: !current.offersOnly,
                  }))
                }
              >
                <Text style={s.text}>
                  {filter.offersOnly ? "✓ " : ""}Offers only
                </Text>
              </Pressable>
              <Button
                title="Clear all filters"
                outline
                onPress={() =>
                  setFilter({
                    search: "",
                    category: "",
                    sort: "newest",
                    maxPrice: "",
                  })
                }
              />
              {currentResults ? (
                <Text accessibilityLiveRegion="polite" style={s.muted}>
                  {c.total} matching products
                </Text>
              ) : null}
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
          ) : null}
          <ErrorBox message={!showFilters ? filterError : ""} />
          {currentResults ? (
            <Text style={s.small}>{c.total} products</Text>
          ) : null}
        </View>
      }
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (currentResults && !c.loading && !c.error && c.hasMore && c.page > 0)
          load(c.page + 1);
      }}
      ListEmptyComponent={
        currentResults && !c.loading && !c.error ? (
          <Empty
            title="No matching products"
            detail="Try another search or category."
          />
        ) : undefined
      }
      ListFooterComponent={
        <View>
          {c.loading || (!currentResults && !filterError) ? <Loading /> : null}
          <ErrorBox
            message={currentResults ? c.error : null}
            retry={() => load(c.page + 1)}
          />
          {currentResults && !c.hasMore && c.items.length ? (
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
      <SizeGuide key={product._id} product={product} />
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
