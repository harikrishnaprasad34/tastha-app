import { shoppingLayout } from "../shared/layout";
import React, { useCallback } from "react";
import {
  FlatList,
  Image,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useAppDispatch, useAppSelector } from "../state";
import {
  fetchCollections,
  fetchCollection,
  collectionKey,
} from "../state/collections";
import { useRevalidateOnFocus } from "../hooks/useRevalidateOnFocus";
import { ProductCard, type Navigate } from "./Shop";
import { imageUrl } from "../shared/catalog";
import { API_ORIGIN } from "../config";
import {
  Button,
  Empty,
  ErrorBox,
  Loading,
  styles as s,
} from "../components/ui";
export function Collections({ navigate }: { navigate: Navigate }) {
  const dispatch = useAppDispatch();
  const { data, loading, error } = useAppSelector((x) => x.collections.list);
  useRevalidateOnFocus(
    useCallback(() => {
      const task = dispatch(fetchCollections());
      return () => task.abort();
    }, [dispatch]),
  );
  return (
    <FlatList
      data={data || []}
      keyExtractor={(c) => c._id}
      contentContainerStyle={s.content}
      refreshing={loading}
      onRefresh={() => dispatch(fetchCollections())}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <Text style={s.small}>CURATED BY TASTHA</Text>
          <Text style={s.title}>Find your next favourite</Text>
          <Text style={s.muted}>
            Edits built around a mood, a fabric or an occasion.
          </Text>
          <ErrorBox
            message={error}
            retry={() => dispatch(fetchCollections())}
          />
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <Loading />
        ) : !error ? (
          <Empty
            title="New edits are on their way"
            detail="Check back for Tastha’s published collections."
          />
        ) : undefined
      }
      renderItem={({ item }) => {
        const image = imageUrl(item.image, API_ORIGIN);
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={"Explore " + item.title}
            onPress={() => navigate("Collection", item.slug)}
            style={[s.panel, { marginTop: 16, padding: 0, overflow: "hidden" }]}
          >
            {image ? (
              <Image
                source={{ uri: image }}
                style={{ width: "100%", aspectRatio: 2, resizeMode: "cover" }}
              />
            ) : null}
            <View style={{ padding: 16, gap: 8 }}>
              <Text style={s.heading}>{item.title}</Text>
              {item.description ? (
                <Text numberOfLines={3} style={s.muted}>
                  {item.description}
                </Text>
              ) : null}
              <Text style={s.price}>Explore edit →</Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}
export function CollectionProducts({
  slug,
  navigate,
}: {
  slug: string;
  navigate: Navigate;
}) {
  const dispatch = useAppDispatch();
  const pin = useAppSelector((x) => x.location?.pinCode || "");
  const { width, fontScale } = useWindowDimensions();
  const layout = shoppingLayout(width, fontScale);
  const detail = useAppSelector((x) => x.collections.detail);
  const key = collectionKey(slug, pin);
  const data = detail.key === key ? detail.data : null;
  const error = detail.key === key ? detail.error : null;
  const refresh = useCallback(() => {
    const task = dispatch(fetchCollection({ slug, pin }));
    return () => task.abort();
  }, [dispatch, slug, pin]);
  useRevalidateOnFocus(refresh);
  const blocked =
    data?.delivery?.configured && data.delivery.serviceable !== true;
  return (
    <FlatList
      key={key + layout.columns}
      data={data?.products || []}
      numColumns={layout.columns}
      keyExtractor={(p) => p._id}
      contentContainerStyle={[s.content, { paddingHorizontal: 10 }]}
      refreshing={detail.loading}
      onRefresh={() => dispatch(fetchCollection({ slug, pin }))}
      ListHeaderComponent={
        <View style={{ gap: 12, padding: 6 }}>
          <Text style={s.title}>{data?.collection.title || "Collection"}</Text>
          {data?.collection.description ? (
            <Text style={s.muted}>{data.collection.description}</Text>
          ) : null}
          <ErrorBox
            message={error}
            retry={() => dispatch(fetchCollection({ slug, pin }))}
          />
          {blocked ? (
            <>
              <Text style={s.muted}>
                {data?.delivery?.message ||
                  "Choose another delivery area to view this collection."}
              </Text>
              <Button
                title="Change delivery location"
                onPress={() => navigate("Location")}
              />
            </>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        detail.loading || detail.key !== key ? (
          <Loading />
        ) : !error && !blocked ? (
          <Empty
            title="No pieces available in this edit"
            detail="Try another collection or delivery area."
          />
        ) : undefined
      }
      renderItem={({ item }) => (
        <View style={{ width: `${100 / layout.columns}%` }}>
          <ProductCard product={item} navigate={navigate} />
        </View>
      )}
      ListFooterComponent={
        <Button
          title="Browse collections"
          outline
          onPress={() => navigate("Collections")}
        />
      }
    />
  );
}
