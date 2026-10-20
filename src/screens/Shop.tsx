import { Icon, type IconName } from "../components/Icon";
import { shoppingLayout } from "../shared/layout";
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
      style={[s.panel, { flex: 1, minWidth: 0, margin: 4, padding: 9, gap: 8 }]}
    >
      <View style={[s.row, { justifyContent: "space-between", gap: 4 }]}>
        <Text
          numberOfLines={1}
          style={[s.small, { color: "#D4AF37", flex: 1 }]}
        >
          {product.brand || "TASTHA"}
        </Text>
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
          <Icon
            filled={isSaved}
            name="heart"
            size={20}
            color={isSaved ? "#D4AF37" : "#a9a9b0"}
          />
        </Pressable>
      </View>
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
            style={[
              s.image,
              { height: undefined, aspectRatio: 0.82, borderRadius: 9 },
            ]}
          />
        ) : (
          <View
            style={{
              aspectRatio: 0.82,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#1c1e23",
              borderRadius: 9,
            }}
          >
            <Icon name="shirt" size={32} color="#a9a9b0" />
          </View>
        )}
        <Text
          numberOfLines={2}
          style={[s.text, { minHeight: 38, fontSize: 13 }]}
        >
          {product.name}
        </Text>
        <View style={[s.row, { gap: 6 }]}>
          <Text style={[s.price, { fontSize: 15 }]}>
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
        title="+ Add"
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

function DiscoveryChip({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: IconName;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 22,
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        backgroundColor: "#1c1e23",
        borderWidth: 1,
        borderColor: "#303139",
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <Icon name={icon} size={16} />
      <Text style={[s.text, { fontSize: 12, fontWeight: "600" }]}>{title}</Text>
    </Pressable>
  );
}
export function Home({ navigate }: { navigate: Navigate }) {
  const dispatch = useAppDispatch();
  const { home, homeLoading, homeError } = useAppSelector((x) => x.catalog);
  const pin = useAppSelector((x) => x.location?.pinCode) || "";
  const { width, fontScale } = useWindowDimensions();
  const layout = shoppingLayout(width, fontScale);
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const job = dispatch(fetchHome(pin));
    return () => job.abort();
  }, [dispatch, pin]);
  const banners = home?.banners || [];
  const banner = banners.length ? banners[slide % banners.length] : undefined;
  const hero = imageUrl(
    banner?.mobileImage ||
      banner?.mobileImageUrl ||
      banner?.image ||
      banner?.imageUrl,
    API_ORIGIN,
  );
  return (
    <ScrollView
      contentContainerStyle={[s.content, { padding: layout.padding, gap: 20 }]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        <DiscoveryChip
          title="New in"
          icon="shirt"
          onPress={() => navigate("StoreLink", "/shop?sort=newest")}
        />
        <DiscoveryChip
          title="Offers"
          icon="tag"
          onPress={() => navigate("StoreLink", "/shop?offersOnly=true")}
        />
        <DiscoveryChip
          title="Style studio"
          icon="sparkle"
          onPress={() => navigate("AI")}
        />
        <DiscoveryChip
          title="Saved looks"
          icon="heart"
          onPress={() => navigate("SavedLooks")}
        />
      </ScrollView>
      {homeLoading ? <Loading /> : null}
      <ErrorBox message={homeError} retry={() => dispatch(fetchHome(pin))} />
      {home ? (
        <View
          style={[
            s.panel,
            { padding: 0, overflow: "hidden", backgroundColor: "#181813" },
          ]}
        >
          {hero ? (
            <Image
              source={{ uri: hero }}
              accessibilityLabel={banner?.title || "Tastha collection"}
              style={{
                width: "100%",
                aspectRatio: width >= 720 ? 2.7 : 1.9,
                resizeMode: "cover",
              }}
            />
          ) : null}
          <View style={{ padding: 16, gap: 8 }}>
            <Text
              style={{
                fontSize: 10,
                letterSpacing: 1.5,
                color: "#D4AF37",
                fontWeight: "600",
              }}
            >
              {banner?.eyebrow || "THE TASTHA EDIT"}
            </Text>
            <Text style={[s.title, { fontSize: 22, maxWidth: 600 }]}>
              {banner?.title ||
                home.config?.headline ||
                "Discover your next favourite"}
            </Text>
            {banner?.subtitle || home.config?.description ? (
              <Text style={s.muted}>
                {banner?.subtitle || home.config?.description}
              </Text>
            ) : null}
            <View style={[s.row, { justifyContent: "space-between", gap: 8 }]}>
              <Button
                title={banner?.ctaText || "Explore styles"}
                onPress={() =>
                  navigate(
                    "StoreLink",
                    banner?.ctaLink || banner?.link || "/shop",
                  )
                }
              />
              {banners.length > 1 ? (
                <View style={[s.row, { gap: 2 }]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Previous campaign"
                    onPress={() =>
                      setSlide((x) => (x - 1 + banners.length) % banners.length)
                    }
                    style={{
                      minWidth: 44,
                      minHeight: 44,
                      alignItems: "center",
                      justifyContent: "center",
                      transform: [{ rotate: "180deg" }],
                    }}
                  >
                    <Icon name="chevron" size={18} />
                  </Pressable>
                  <Text style={s.small}>
                    {(slide % banners.length) + 1}/{banners.length}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Next campaign"
                    onPress={() => setSlide((x) => x + 1)}
                    style={{
                      minWidth: 44,
                      minHeight: 44,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="chevron" size={18} />
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}
      <View style={{ gap: 12 }}>
        <Text style={s.heading}>Shop by category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 14 }}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => navigate("Shop")}
            style={{ width: 76, alignItems: "center", gap: 7 }}
          >
            <View
              style={{
                width: 68,
                height: 68,
                backgroundColor: "#292519",
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="shop" size={28} />
            </View>
            <Text style={[s.small, { textAlign: "center", color: "#f5f3ed" }]}>
              All styles
            </Text>
          </Pressable>
          {home?.categories?.map((category) => {
            const image = imageUrl(category.image, API_ORIGIN);
            return (
              <Pressable
                key={category.slug || category.name}
                accessibilityRole="button"
                onPress={() => navigate("Shop", category.name)}
                style={{ width: 76, alignItems: "center", gap: 7 }}
              >
                <View
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 18,
                    overflow: "hidden",
                    backgroundColor: "#1c1e23",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {image ? (
                    <Image
                      source={{ uri: image }}
                      style={{
                        width: "100%",
                        height: "100%",
                        resizeMode: "cover",
                      }}
                    />
                  ) : (
                    <Icon name="shirt" size={28} />
                  )}
                </View>
                <Text
                  style={[s.small, { textAlign: "center", color: "#f5f3ed" }]}
                >
                  {category.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      {home?.delivery?.message ? (
        <Text style={s.small}>{home.delivery.message}</Text>
      ) : null}
      {home?.sections
        ?.filter((section) => section.products?.length)
        .map((section, i) => (
          <View key={section.id || i} style={{ gap: 8 }}>
            <View style={[s.row, { justifyContent: "space-between", gap: 4 }]}>
              <Text style={[s.heading, { flex: 1 }]}>{section.title}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={"View all " + section.title}
                onPress={() =>
                  navigate(
                    "StoreLink",
                    section.id === "newest" ? "/shop?sort=newest" : "/shop",
                  )
                }
                style={{
                  minHeight: 44,
                  paddingHorizontal: 8,
                  flexDirection: "row",
                  gap: 4,
                  alignItems: "center",
                }}
              >
                <Text style={[s.small, { color: "#D4AF37" }]}>View all</Text>
                <Icon name="chevron" size={14} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View
                style={{ flexDirection: "row", alignItems: "stretch", gap: 4 }}
              >
                {section.products.map((product) => (
                  <View
                    key={product._id}
                    style={{ width: layout.carouselWidth }}
                  >
                    <ProductCard product={product} navigate={navigate} />
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        ))}
      {home && !home.sections?.some((section) => section.products?.length) ? (
        <Empty
          title="Explore your next favourite"
          detail={
            home.delivery?.message ||
            "Browse the catalog or choose another category."
          }
        />
      ) : null}
      {home?.config?.budgets?.length ? (
        <View style={{ gap: 12 }}>
          <Text style={s.heading}>Style within your budget</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {home.config.budgets
              .filter((x) => Number.isFinite(x) && x > 0)
              .map((budget) => (
                <DiscoveryChip
                  key={budget}
                  title={"Under " + money(budget)}
                  icon="tag"
                  onPress={() =>
                    navigate(
                      "StoreLink",
                      "/shop?maxPrice=" + budget + "&sort=price_low",
                    )
                  }
                />
              ))}
          </ScrollView>
        </View>
      ) : null}
      {home?.occasions?.length ? (
        <View style={{ gap: 12 }}>
          <Text style={s.heading}>Dress for the moment</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {home.occasions.map((occasion, i) => (
              <DiscoveryChip
                key={occasion._id || i}
                title={occasion.title || occasion.name || "Explore occasion"}
                icon="sparkle"
                onPress={() =>
                  navigate(
                    "StoreLink",
                    "/choose-occasion?occasion=" +
                      encodeURIComponent(occasion.slug || occasion.title || ""),
                  )
                }
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
      <View style={{ gap: 8, paddingVertical: 12 }}>
        <Text
          style={{
            color: "#D4AF37",
            fontSize: 18,
            letterSpacing: 4,
            fontWeight: "700",
          }}
        >
          TASTHA
        </Text>
        <Text style={s.muted}>Considered pieces. Everyday style.</Text>
        <View style={s.row}>
          <DiscoveryChip
            title="Collections"
            icon="shirt"
            onPress={() => navigate("Collections")}
          />
          <DiscoveryChip
            title="Need help?"
            icon="contact"
            onPress={() => navigate("Contact")}
          />
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
  const { width: catalogWidth, fontScale: catalogFontScale } =
    useWindowDimensions();
  const catalogLayout = shoppingLayout(catalogWidth, catalogFontScale);
  const dispatch = useAppDispatch();
  const c = useAppSelector((x) => x.catalog);
  const pin = useAppSelector((x) => x.location?.pinCode);
  const [categories, setCategories] = useState<StoreCategory[]>(
    c.home?.categories || [],
  );
  const [categoryError, setCategoryError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filter, setFilterState] = useState<CatalogFilter>({
    search: search || "",
    category: resolveCatalogCategory(category, c.home?.categories || []),
    sort: sort || "newest",
    maxPrice: maxPrice || "",
    minPrice: minPrice || "",
    brand: brand || "",
    offersOnly: Boolean(offersOnly),
  });
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
      key={"catalog-" + catalogLayout.columns}
      numColumns={catalogLayout.columns}
      contentContainerStyle={{
        padding: catalogLayout.padding - 4,
        paddingBottom: 30,
        maxWidth: 1040,
        width: "100%",
        alignSelf: "center",
      }}
      renderItem={({ item }) => (
        <View style={{ width: `${100 / catalogLayout.columns}%` }}>
          <ProductCard product={item} navigate={navigate} />
        </View>
      )}
      ListHeaderComponent={
        <View style={s.content}>
          <Text style={s.title}>Shop styles</Text>
          <Field
            label="Search products"
            value={filter.search}
            onChangeText={(search) => setFilter({ ...filter, search })}
          />
          <Text style={s.heading}>Browse by category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
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
          </ScrollView>
          <ErrorBox message={categoryError} />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: filtersOpen }}
            onPress={() => setFiltersOpen((value) => !value)}
            style={[s.pill, s.row, { justifyContent: "space-between" }]}
          >
            <Text style={s.text}>
              Filters & sort
              {filter.brand ||
              filter.minPrice ||
              filter.maxPrice ||
              filter.offersOnly ||
              filter.sort !== "newest"
                ? " · Active"
                : ""}
            </Text>
            <Icon name={filtersOpen ? "minus" : "plus"} size={18} />
          </Pressable>
          {filtersOpen ? (
            <View style={{ gap: 12 }}>
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
          {!filtersOpen && currentResults ? (
            <Text style={s.small}>
              {c.total} styles ·{" "}
              {filter.sort === "newest" ? "Newest first" : "Filtered results"}
            </Text>
          ) : null}
          {!filtersOpen ? <ErrorBox message={filterError} /> : null}
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
  const { width, fontScale } = useWindowDimensions();
  const detailLayout = shoppingLayout(width, fontScale);
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
              <View
                key={item._id}
                style={{ width: `${100 / detailLayout.columns}%` }}
              >
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
