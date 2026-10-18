import React, { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import { api } from "../api/runtime";
import { API_ORIGIN } from "../config";
import { imageUrl } from "../shared/catalog";
import { Button, Empty, ErrorBox, Loading, styles as s } from "./ui";
interface Review {
  _id: string;
  rating: number;
  title?: string;
  comment?: string;
  userName: string;
  isVerifiedPurchase: boolean;
  photos?: string[];
}
export function ProductReviews({ id }: { id: string }) {
  const [reviews, setReviews] = useState<Review[]>([]),
    [page, setPage] = useState(1),
    [pages, setPages] = useState(1),
    [total, setTotal] = useState(0),
    [sort, setSort] = useState("recent"),
    [photos, setPhotos] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api
      .request<{
        reviews: Review[];
        pagination: { total: number; totalPages: number };
      }>(
        "/reviews/products/" +
          encodeURIComponent(id) +
          "?page=" +
          page +
          "&sort=" +
          sort +
          "&photos=" +
          photos,
        { signal: controller.signal },
      )
      .then((r) => {
        if (!Array.isArray(r.reviews) || !r.pagination)
          throw Error("Reviews are unavailable.");
        if (!controller.signal.aborted) {
          setReviews(r.reviews);
          setPages(r.pagination.totalPages);
          setTotal(r.pagination.total);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, page, sort, photos, retry]);
  function reset() {
    setLoading(true);
    setError("");
    setReviews([]);
  }
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.heading}>Customer reviews</Text>
      <View style={s.row}>
        {[
          ["recent", "Recent"],
          ["highest", "Highest rated"],
          ["lowest", "Lowest rated"],
        ].map(([value, label]) => (
          <Button
            key={value}
            title={label}
            outline
            disabled={loading || value === sort}
            onPress={() => {
              reset();
              setPage(1);
              setSort(value);
            }}
          />
        ))}
      </View>
      <Button
        title={photos ? "Show all reviews" : "Reviews with photos"}
        outline
        onPress={() => {
          reset();
          setPage(1);
          setPhotos((x) => !x);
        }}
      />
      {loading ? <Loading /> : null}
      <ErrorBox
        message={error}
        retry={() => {
          reset();
          setRetry((x) => x + 1);
        }}
      />
      {!loading && !error && !reviews.length ? (
        <Empty title="No reviews yet" />
      ) : null}
      {reviews.map((review) => (
        <View key={review._id} style={s.panel}>
          <Text style={s.text}>
            {review.rating} / 5 · {review.userName}
          </Text>
          {review.isVerifiedPurchase ? (
            <Text style={s.muted}>Verified purchase</Text>
          ) : null}
          {review.title ? <Text style={s.heading}>{review.title}</Text> : null}
          <Text style={s.muted}>{review.comment}</Text>
          <View style={s.row}>
            {review.photos?.map((photo) => (
              <Image
                key={photo}
                source={{ uri: imageUrl(photo, API_ORIGIN)! }}
                style={{ width: 90, height: 90 }}
                accessibilityLabel="Customer review photo"
              />
            ))}
          </View>
        </View>
      ))}
      {!loading && !error && total > 10 ? (
        <View style={s.row}>
          <Button
            title="Previous reviews"
            outline
            disabled={page <= 1}
            onPress={() => {
              reset();
              setPage((x) => x - 1);
            }}
          />
          <Text style={s.muted}>
            {page} / {pages}
          </Text>
          <Button
            title="Next reviews"
            outline
            disabled={page >= pages}
            onPress={() => {
              reset();
              setPage((x) => x + 1);
            }}
          />
        </View>
      ) : null}
    </View>
  );
}
