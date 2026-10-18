import React, { useEffect, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { api } from "../api/runtime";
import {
  Button,
  ErrorBox,
  Field,
  Loading,
  styles as s,
} from "../components/ui";
interface Review {
  product: string;
  rating: number;
  title: string;
  comment: string;
  fit: string;
  updatedAt: string;
  photos?: string[];
}
export function OrderReview({
  orderId,
  productId,
}: {
  orderId: string;
  productId: string;
}) {
  const [rating, setRating] = useState(5),
    [title, setTitle] = useState(""),
    [comment, setComment] = useState(""),
    [fit, setFit] = useState(""),
    [existing, setExisting] = useState<Review | null>(null),
    [removeExisting, setRemoveExisting] = useState(false),
    [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]),
    [loading, setLoading] = useState(true),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api
      .request<{ reviews: Review[] }>(
        "/reviews/orders/" + encodeURIComponent(orderId) + "/mine",
        { auth: "required", signal: controller.signal },
      )
      .then((r) => {
        if (!Array.isArray(r.reviews))
          throw Error("Your review could not be loaded.");
        if (controller.signal.aborted) return;
        setLoaded(true);
        const old = r.reviews.find((x) => x.product === productId) || null;
        setExisting(old);
        if (old) {
          setRating(old.rating);
          setTitle(old.title);
          setComment(old.comment);
          setFit(old.fit);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [orderId, productId, reload]);
  async function choosePhotos() {
    if (busy) return;
    setError("");
    try {
      const selected = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 3,
        quality: 0.8,
      });
      if (selected.canceled) return;
      if (
        selected.assets.some(
          (asset) =>
            (asset.fileSize ?? new File(asset.uri).size) > 5 * 1024 * 1024 ||
            asset.width * asset.height > 16000000,
        )
      )
        throw Error(
          "Choose up to three photos, each under 5 MB and 16 megapixels.",
        );
      setPhotos(selected.assets.slice(0, 3));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Photos could not be selected.",
      );
    }
  }
  async function submit() {
    if (busy || loading) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const form = new FormData();
      form.append("rating", String(rating));
      form.append("title", title.trim());
      form.append("comment", comment.trim());
      form.append("fit", fit);
      form.append("keepPhotos", String(!removeExisting));
      if (existing) form.append("expectedUpdatedAt", existing.updatedAt);
      photos.forEach((photo, index) => {
        const type =
          photo.mimeType ||
          (/\.png$/i.test(photo.uri)
            ? "image/png"
            : /\.jpe?g$/i.test(photo.uri)
              ? "image/jpeg"
              : null);
        if (!type) throw Error("Choose JPEG, PNG, WebP, AVIF or HEIC photos.");
        form.append("photos", {
          uri: photo.uri,
          name: photo.fileName || "review-" + index + ".jpg",
          type,
        } as unknown as Blob);
      });
      const result = await api.request<{ review: Review; message?: string }>(
        "/reviews/orders/" +
          encodeURIComponent(orderId) +
          "/products/" +
          encodeURIComponent(productId),
        { auth: "required", method: "PUT", form, timeout: 60000 },
      );
      if (!result.review?.updatedAt)
        throw Error("Review submission was not confirmed. Reopen your review.");
      setExisting(result.review);
      setRemoveExisting(false);
      setPhotos([]);
      setNotice(result.message || "Review submitted for approval.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Review could not be submitted.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.title}>Rate your purchase</Text>
      {loading ? <Loading /> : null}
      <ErrorBox
        message={error}
        retry={() => {
          setError("");
          setLoading(true);
          setLoaded(false);
          setReload((x) => x + 1);
        }}
      />
      <Text style={s.text}>Rating</Text>
      <View style={s.row}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Button
            key={value}
            title={value + (rating === value ? " ★" : " ☆")}
            outline
            disabled={busy || loading}
            onPress={() => setRating(value)}
          />
        ))}
      </View>
      <Field
        label="Title (optional)"
        value={title}
        onChangeText={setTitle}
        maxLength={100}
      />
      <Field
        label="Your review"
        value={comment}
        onChangeText={setComment}
        maxLength={2000}
        multiline
      />
      <Text style={s.text}>How did it fit?</Text>
      <View style={s.row}>
        {[
          ["SMALL", "Small"],
          ["TRUE_TO_SIZE", "True to size"],
          ["LARGE", "Large"],
        ].map(([value, label]) => (
          <Button
            key={value}
            title={label + (fit === value ? " ✓" : "")}
            outline
            disabled={busy}
            onPress={() => setFit(value)}
          />
        ))}
      </View>
      <Button
        title={photos.length ? "Change selected photos" : "Add up to 3 photos"}
        outline
        disabled={busy || loading}
        onPress={() => {
          void choosePhotos();
        }}
      />
      <View style={s.row}>
        {photos.map((photo) => (
          <Image
            key={photo.uri}
            source={{ uri: photo.uri }}
            style={{ width: 90, height: 90 }}
            accessibilityLabel="Selected review photo"
          />
        ))}
      </View>
      {photos.length ? (
        <Button
          title="Remove selected photos"
          outline
          disabled={busy}
          onPress={() => setPhotos([])}
        />
      ) : null}
      {existing?.photos?.length && !photos.length ? (
        <View style={{ gap: 8 }}>
          <Text style={s.muted}>
            {removeExisting
              ? "Existing photos will be removed when you submit."
              : "Your existing photos will be kept."}
          </Text>
          <Button
            title={
              removeExisting ? "Keep existing photos" : "Remove existing photos"
            }
            outline
            disabled={busy}
            onPress={() => setRemoveExisting((value) => !value)}
          />
        </View>
      ) : null}
      <Text style={s.muted}>
        Only delivered purchases can be reviewed. Reviews appear publicly after
        approval.
      </Text>
      {notice ? (
        <Text accessibilityRole="alert" style={s.text}>
          {notice}
        </Text>
      ) : null}
      <Button
        title="Submit review"
        busy={busy}
        disabled={loading || !loaded}
        onPress={() => {
          void submit();
        }}
      />
    </ScrollView>
  );
}
