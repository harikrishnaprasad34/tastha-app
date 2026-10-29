import { MenuRow } from "../components/MenuRow";
import { Icon, type IconName } from "../components/Icon";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import {
  ScrollView,
  Text,
  View,
  Alert,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { Formik } from "formik";
import * as Yup from "yup";
import * as Location from "expo-location";
import { DeliveryMap } from "../components/DeliveryMap";
import { readDeliveryEligibility } from "../api/deliveryEligibility";
import { saveDeliveryLocation } from "../api/deliveryLocation";
import {
  describeDetectedPlace,
  locationFromAddress,
  locationFromSearchResult,
  validPinCode,
  publicLocationAfterSignOut,
  type SearchedPlace,
} from "../shared/deliveryLocation";
import { api, session } from "../api/runtime";
import { customerLoginPayload } from "../api/authPayload";
import { mergeProfileUser } from "../api/profile";
import { API_URL, colors } from "../config";
import { Brand } from "../components/Brand";
import type { DeliveryLocation, Session } from "../models";
import { useAppDispatch, useAppSelector } from "../state";
import { actions, saveAddress, fetchAddresses } from "../state/store";
import { Button, ErrorBox, Field, styles as s } from "../components/ui";
import type { Navigate } from "./Shop";
export function Login({ navigate }: { navigate: Navigate }) {
  const [error, setError] = useState("");
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.content}
    >
      <Text style={s.title}>Welcome to Tastha</Text>
      <Text style={s.muted}>
        Sign in using the registered email for your existing Tastha account.
      </Text>
      <Formik
        initialValues={{ identifier: "", password: "" }}
        validationSchema={Yup.object({
          identifier: Yup.string()
            .trim()
            .email("Enter a valid registered email address")
            .required("Enter your email address"),
          password: Yup.string().required("Enter your password"),
        })}
        onSubmit={async (values) => {
          setError("");
          const revision = session.revision();
          try {
            const result = await api.request<Session>("/auth/login", {
              auth: "none",
              method: "POST",
              body: customerLoginPayload(values.identifier, values.password),
            });
            await session.save(result, revision, true);
            navigate("Authenticated");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Sign-in failed.");
          }
        }}
      >
        {({
          values,
          handleChange,
          handleBlur,
          handleSubmit,
          errors,
          touched,
          isSubmitting,
        }) => (
          <View style={{ gap: 16 }}>
            <Field
              label="Email address"
              value={values.identifier}
              onChangeText={handleChange("identifier")}
              onBlur={handleBlur("identifier")}
              autoCapitalize="none"
              autoComplete="username"
              error={touched.identifier ? errors.identifier : undefined}
            />
            <Field
              label="Password"
              value={values.password}
              onChangeText={handleChange("password")}
              onBlur={handleBlur("password")}
              secureTextEntry
              autoComplete="current-password"
              error={touched.password ? errors.password : undefined}
            />
            <ErrorBox message={error} />
            <Button
              title="Sign in"
              busy={isSubmitting}
              onPress={() => handleSubmit()}
            />
          </View>
        )}
      </Formik>
      <Button
        title="Sign in with WhatsApp code"
        outline
        onPress={() => navigate("Otp")}
      />
      <Button
        title="Forgot password?"
        outline
        onPress={() => navigate("Recovery")}
      />
      <Button
        title="Create a Tastha account"
        outline
        onPress={() => navigate("Signup")}
      />
    </ScrollView>
  );
}
export function Account({ navigate }: { navigate: Navigate }) {
  const { width, fontScale } = useWindowDimensions();
  const stackedActions = width < 360 || fontScale > 1.4;
  const user = useAppSelector((x) => x.auth.user);
  const delivery = useAppSelector((x) => x.location);
  const dispatch = useAppDispatch();
  const [profileError, setProfileError] = useState("");
  const userId = user?.id;
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      const controller = new AbortController();
      const revision = session.revision();
      api
        .request<{
          user: Partial<import("../models").User> & { _id?: string };
        }>("/users/profile", { auth: "required", signal: controller.signal })
        .then(async (response) => {
          const current = session.get();
          if (
            !current ||
            current.user.id !== userId ||
            controller.signal.aborted
          )
            return;
          await session.updateUser(
            (user) => mergeProfileUser(user, response.user),
            revision,
          );
          if (!controller.signal.aborted) setProfileError("");
        })
        .catch((e) => {
          if (!controller.signal.aborted) setProfileError(e.message);
        });
      return () => controller.abort();
    }, [userId]),
  );
  async function logout() {
    const prior = session.get();
    if (prior) {
      // Local sign-out must succeed even when the network is unavailable.
      // The backend revokes refresh tokens from the JSON body, not the header.
      void fetch(API_URL + "/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${prior.accessToken}`,
        },
        // Revoke this device's refresh token, not every other logged-in device.
        body: JSON.stringify({ token: prior.refreshToken }),
        signal: AbortSignal.timeout(10000),
      }).catch(() => {});
    }
    try {
      await session.clear();
      const publicArea = publicLocationAfterSignOut(delivery);
      if (publicArea && delivery?.addressId) {
        try {
          await saveDeliveryLocation(publicArea);
          dispatch(actions.setLocation(publicArea));
        } catch {
          Alert.alert(
            "Location preference",
            "Signed out, but your saved delivery area could not be updated.",
          );
        }
      }
    } catch {
      Alert.alert(
        "Sign-out storage",
        "You are signed out on this screen. Secure storage could not be cleared. Keep the app open and retry sign-out.",
        [
          {
            text: "Retry",
            onPress: () => {
              void logout();
            },
          },
          { text: "Keep open", style: "cancel" },
        ],
      );
    }
  }
  return (
    <ScrollView
      contentContainerStyle={[
        s.content,
        { maxWidth: 680, padding: width < 360 ? 12 : 16 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text accessibilityRole="header" style={s.title}>
        My account
      </Text>
      <Text style={s.muted}>
        Your orders, favourites and everyday essentials
      </Text>
      <ErrorBox message={profileError} />
      <View
        style={[
          s.panel,
          { flexDirection: "row", alignItems: "center", gap: 12 },
        ]}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.elevated,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="person" size={24} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={s.heading}>{user?.fullName || "Welcome to Tastha"}</Text>
          <Text style={s.muted}>
            {user ? user.email || user.phone : "Your style, saved in one place"}
          </Text>
        </View>
      </View>
      <View
        style={{ flexDirection: stackedActions ? "column" : "row", gap: 10 }}
      >
        {[
          {
            title: "Orders",
            detail: "Track & reorder",
            icon: "bag",
            route: "Orders",
            path: "/orders",
          },
          {
            title: "Wishlist",
            detail: "Your favourites",
            icon: "heart",
            route: "Wishlist",
            path: "/(tabs)/wishlist",
          },
          {
            title: "Support",
            detail: "We're here to help",
            icon: "contact",
            route: "Help",
            path: "/help/faq",
          },
        ].map((item) => (
          <Pressable
            key={item.title}
            accessibilityRole="button"
            accessibilityLabel={item.title + ". " + item.detail}
            onPress={() =>
              !user && item.route !== "Help"
                ? navigate("Login", item.path)
                : navigate(
                    item.route,
                    item.route === "Help" ? "faq" : undefined,
                  )
            }
            style={({ pressed }) => [
              s.panel,
              {
                flex: stackedActions ? undefined : 1,
                minWidth: 0,
                minHeight: 96,
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                opacity: pressed ? 0.65 : 1,
              },
            ]}
          >
            <Icon name={item.icon as IconName} size={22} />
            <Text style={[s.text, { fontWeight: "600", textAlign: "center" }]}>
              {item.title}
            </Text>
            <Text style={[s.small, { textAlign: "center" }]}>
              {item.detail}
            </Text>
          </Pressable>
        ))}
      </View>
      {!user ? (
        <Button
          title="Sign in / Create account"
          onPress={() => navigate("Login", "/(tabs)/account")}
        />
      ) : (
        <>
          <Text style={s.small}>YOUR ACCOUNT</Text>
          <View style={[s.panel, { padding: 0, gap: 0 }]}>
            {[
              { title: "My orders", icon: "bag", route: "Orders" },
              {
                title: "Profile details",
                icon: "person",
                route: "EditProfile",
              },
              {
                title: "Saved addresses",
                icon: "location",
                route: "Addresses",
              },
              { title: "Saved looks", icon: "sparkle", route: "SavedLooks" },
              {
                title: "Password & security",
                icon: "shield",
                route: "Security",
              },
            ].map((item, index, items) => (
              <MenuRow
                key={item.route}
                title={item.title}
                icon={item.icon as IconName}
                last={index === items.length - 1}
                onPress={() => navigate(item.route)}
              />
            ))}
          </View>
        </>
      )}
      <Text style={s.small}>SHOPPING & SUPPORT</Text>
      <View style={[s.panel, { padding: 0, gap: 0 }]}>
        {[
          {
            title: "Delivery location",
            detail: delivery?.label || "Choose your delivery area",
            icon: "location",
            route: "Location",
          },
          { title: "Explore collections", icon: "shirt", route: "Collections" },
          { title: "Style studio", icon: "sparkle", route: "AI" },
          { title: "Contact us", icon: "contact", route: "Contact" },
          { title: "Help & FAQs", icon: "help", route: "Help", id: "faq" },
          {
            title: "Shipping & returns",
            icon: "returns",
            route: "Help",
            id: "shipping",
          },
          {
            title: "Privacy policy",
            icon: "shield",
            route: "Help",
            id: "privacy",
          },
        ].map((item, index, items) => (
          <MenuRow
            key={item.title}
            title={item.title}
            detail={item.detail}
            icon={item.icon as IconName}
            last={index === items.length - 1}
            onPress={() => navigate(item.route, item.id)}
          />
        ))}
      </View>
      <View style={[s.panel, { padding: 0, gap: 0 }]}>
        <MenuRow
          title="Staff workspace"
          icon="shop"
          last={!user}
          onPress={() => navigate("Admin")}
        />
        {user ? (
          <MenuRow
            title="Sign out"
            icon="logout"
            last
            onPress={() =>
              Alert.alert(
                "Sign out of Tastha?",
                "You can sign in again to access your saved shopping details.",
                [
                  { text: "Stay signed in", style: "cancel" },
                  {
                    text: "Sign out",
                    style: "destructive",
                    onPress: () => {
                      void logout();
                    },
                  },
                ],
              )
            }
          />
        ) : null}
      </View>
      <View style={{ alignItems: "center", paddingVertical: 12, gap: 6 }}>
        <Brand />
        <Text style={s.small}>Made for your everyday style</Text>
      </View>
    </ScrollView>
  );
}
export function EditProfile({ navigate }: { navigate: Navigate }) {
  const user = useAppSelector((state) => state.auth.user);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  if (!user) {
    return (
      <View style={s.content}>
        <Text style={s.muted}>Sign in to edit your Tastha profile.</Text>
        <Button title="Sign in" onPress={() => navigate("Login", "/edit-profile")} />
      </View>
    );
  }
  return (
    <ScrollView
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.title}>Edit Profile</Text>
      <Text style={s.muted}>
        Your changes are saved to your existing Tastha customer account.
      </Text>
      <Formik
        key={user.id}
        initialValues={{
          fullName: user.fullName || "",
          phone: user.phone || "",
          stylePreference: user.stylePreference || "Smart Casual",
          sizePreference: user.sizePreference || "M",
        }}
        validationSchema={Yup.object({
          fullName: Yup.string()
            .trim()
            .min(2)
            .max(80)
            .required("Full name is required"),
          phone: Yup.string()
            .trim()
            .matches(
              /^(?:\+91[ -]?)?[6-9]\d{9}$/,
              "Enter a valid mobile number",
            )
            .required("Phone number is required"),
          stylePreference: Yup.string().required(),
          sizePreference: Yup.string()
            .oneOf(["S", "M", "L", "XL", "XXL"])
            .required(),
        })}
        onSubmit={async (values) => {
          setError("");
          setNotice("");
          const original = session.get();
          const revision = session.revision();
          if (!original || original.user.id !== user.id) {
            setError(
              "Your session changed. Sign in again to edit this profile.",
            );
            return;
          }
          try {
            const result = await api.request<{
              user?: {
                _id?: string;
                id?: string;
                fullName?: string;
                phone?: string;
                stylePreference?: string;
                sizePreference?: string;
              };
            }>("/users/profile", {
              method: "PUT",
              auth: "required",
              body: {
                fullName: values.fullName.trim(),
                phone: values.phone.trim(),
                stylePreference: values.stylePreference,
                sizePreference: values.sizePreference,
              },
            });
            if (!result.user)
              throw Error("Tastha did not confirm the profile update.");
            const savedUser = result.user;
            await session.updateUser(
              (user) => mergeProfileUser(user, savedUser),
              revision,
            );
            setNotice("Your profile has been saved.");
          } catch (reason) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Could not save your profile.",
            );
          }
        }}
      >
        {({
          values,
          touched,
          errors,
          handleChange,
          handleBlur,
          handleSubmit,
          setFieldValue,
          isSubmitting,
        }) => (
          <View style={{ gap: 16 }}>
            <Field
              label="Full name"
              value={values.fullName}
              onChangeText={handleChange("fullName")}
              onBlur={handleBlur("fullName")}
              error={touched.fullName ? errors.fullName : undefined}
            />
            <Field
              label="Registered email (read-only)"
              value={user.email || ""}
              editable={false}
            />
            <Field
              label="Mobile number"
              value={values.phone}
              keyboardType="phone-pad"
              onChangeText={handleChange("phone")}
              onBlur={handleBlur("phone")}
              error={touched.phone ? errors.phone : undefined}
            />
            <Text style={s.heading}>Style preference</Text>
            <View style={s.row}>
              {["Smart Casual", "Formal", "Streetwear", "Ethnic"].map(
                (style) => (
                  <Pressable
                    key={style}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: values.stylePreference === style,
                    }}
                    onPress={() => {
                      void setFieldValue("stylePreference", style);
                    }}
                    style={[
                      s.pill,
                      values.stylePreference === style && s.active,
                    ]}
                  >
                    <Text style={s.text}>{style}</Text>
                  </Pressable>
                ),
              )}
            </View>
            <Text style={s.heading}>Preferred size</Text>
            <View style={s.row}>
              {["S", "M", "L", "XL", "XXL"].map((size) => (
                <Pressable
                  key={size}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: values.sizePreference === size,
                  }}
                  onPress={() => {
                    void setFieldValue("sizePreference", size);
                  }}
                  style={[s.pill, values.sizePreference === size && s.active]}
                >
                  <Text style={s.text}>{size}</Text>
                </Pressable>
              ))}
            </View>
            <ErrorBox message={error} />
            {notice ? <Text style={s.muted}>{notice}</Text> : null}
            <Button
              title="Save changes"
              busy={isSubmitting}
              onPress={() => handleSubmit()}
            />
          </View>
        )}
      </Formik>
    </ScrollView>
  );
}

export function AddressForm({
  navigate,
  id,
}: {
  navigate: Navigate;
  id?: string;
}) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((x) => x.auth.user);
  const saved = useAppSelector((x) =>
    x.commerce.addresses.find((a) => a._id === id),
  );
  const [error, setError] = useState("");
  const createdId = useRef<string | undefined>(undefined);
  const addressLoading = useAppSelector((x) =>
    Boolean(x.commerce.pending.addresses),
  );
  const addressError = useAppSelector((x) => x.commerce.errors.addresses);
  useEffect(() => {
    if (id && !saved) void dispatch(fetchAddresses());
  }, [dispatch, id, saved]);

  if (id && !saved)
    return (
      <View style={s.content}>
        {addressLoading ? (
          <Text style={s.muted}>Loading your address…</Text>
        ) : (
          <ErrorBox
            message={addressError || "This address is unavailable."}
            retry={() => dispatch(fetchAddresses())}
          />
        )}
        <Button
          title="Saved addresses"
          outline
          onPress={() => navigate("Addresses")}
        />
      </View>
    );
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.content}
    >
      <Text style={s.title}>{id ? "Edit address" : "Delivery address"}</Text>
      <Formik
        initialValues={{
          fullName: saved?.fullName || user?.fullName || "",
          phone: saved?.phone || user?.phone || "",
          streetAddress: saved?.streetAddress || "",
          apartment: saved?.apartment || "",
          city: saved?.city || "",
          state: saved?.state || "",
          pinCode: saved?.pinCode || "",
        }}
        validationSchema={Yup.object({
          fullName: Yup.string().trim().min(2).required(),
          phone: Yup.string()
            .matches(
              /^(?:\+91)?[6-9]\d{9}$/,
              "Enter a valid Indian mobile number",
            )
            .required(),
          streetAddress: Yup.string().trim().min(5).required(),
          city: Yup.string().trim().required(),
          state: Yup.string().trim().required(),
          pinCode: Yup.string()
            .matches(/^[1-9]\d{5}$/, "Enter a six-digit PIN")
            .required(),
        })}
        onSubmit={async (values) => {
          try {
            setError("");
            const saved = await dispatch(
              saveAddress({
                ...values,
                ...(id || createdId.current
                  ? { _id: id || createdId.current }
                  : {}),
              }),
            ).unwrap();
            createdId.current = saved._id;
            const delivery = locationFromAddress(saved);
            await saveDeliveryLocation(delivery);
            dispatch(actions.setLocation(delivery));
            navigate("Addresses");
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Address could not be saved.",
            );
          }
        }}
      >
        {({
          values,
          handleChange,
          handleBlur,
          errors,
          touched,
          handleSubmit,
          isSubmitting,
        }) => (
          <View style={{ gap: 16 }}>
            {(
              [
                "fullName",
                "phone",
                "streetAddress",
                "apartment",
                "city",
                "state",
                "pinCode",
              ] as const
            ).map((key) => (
              <Field
                key={key}
                label={
                  {
                    fullName: "Full name",
                    phone: "Mobile number",
                    streetAddress: "Street address",
                    apartment: "Apartment / landmark (optional)",
                    city: "City",
                    state: "State",
                    pinCode: "PIN code",
                  }[key]
                }
                value={values[key]}
                onChangeText={handleChange(key)}
                onBlur={handleBlur(key)}
                keyboardType={
                  key === "phone" || key === "pinCode" ? "phone-pad" : "default"
                }
                error={touched[key] ? errors[key] : undefined}
              />
            ))}
            <ErrorBox message={error} />
            <Button
              title="Save address"
              busy={isSubmitting}
              onPress={() => handleSubmit()}
            />
          </View>
        )}
      </Formik>
    </ScrollView>
  );
}
export function LocationPicker({ navigate }: { navigate: Navigate }) {
  const dispatch = useAppDispatch();
  const selected = useAppSelector((x) => x.location);
  const user = useAppSelector((x) => x.auth.user);
  const [pin, setPin] = useState(selected?.pinCode || "");
  const [label, setLabel] = useState(selected?.label || "");
  const [coordinates, setCoordinates] = useState<
    { lat: number; lng: number; accuracy?: number } | undefined
  >(
    selected?.lat !== undefined && selected.lng !== undefined
      ? { lat: selected.lat, lng: selected.lng }
      : undefined,
  );
  const lookup = useRef(0);
  const [showFields, setShowFields] = useState(Boolean(selected));
  const [accuracyNote, setAccuracyNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<DeliveryLocation[]>([]);

  useEffect(() => {
    const query = label.trim();
    if (!showFields || !searchEnabled || query.length < 3) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Dismiss stale suggestions when the user closes or clears search.
      setSuggestions([]);
      setSearching(false);
      return;
    }
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (!active) return;
      setSearching(true);
      api
        .request<{ locations?: SearchedPlace[] }>(
          "/location/search?q=" + encodeURIComponent(query),
          { timeout: 8000, signal: controller.signal },
        )
        .then((result) => {
          if (!active) return;
          setSuggestions(
            Array.isArray(result.locations)
              ? result.locations
                  .slice(0, 8)
                  .map(locationFromSearchResult)
                  .filter((value): value is DeliveryLocation => value !== null)
              : [],
          );
        })
        .catch(() => {
          if (active) setSuggestions([]);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [label, searchEnabled, showFields]);

  async function movePin(lat: number, lng: number) {
    const ticket = ++lookup.current;
    setCoordinates({ lat, lng });
    setPin("");
    setLabel("");
    setError("");
    setSearchEnabled(false);
    setBusy(true);
    try {
      const response = await api.request<{
        location: import("../shared/deliveryLocation").ServerPlace;
      }>("/location/reverse?lat=" + lat + "&lng=" + lng, { timeout: 8000 });
      if (ticket !== lookup.current) return;
      const place = describeDetectedPlace(null, response.location);
      setLabel(place.label);
      setPin(place.pinCode);
      if (!place.label || !place.pinCode)
        setError("Confirm your street and PIN for this pin.");
    } catch (e) {
      if (ticket === lookup.current)
        setError(
          e instanceof Error
            ? e.message
            : "Address lookup failed. Enter the street and PIN.",
        );
    } finally {
      if (ticket === lookup.current) setBusy(false);
    }
  }
  async function detect() {
    if (busy) return;
    setBusy(true);
    setError("");
    setAccuracyNote("");
    setSearchEnabled(false);
    setSuggestions([]);
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled)
        throw Error(
          "Turn on device Location Services, or enter your PIN manually.",
        );
      const currentPermission = await Location.getForegroundPermissionsAsync();
      const permission = currentPermission.granted
        ? currentPermission
        : currentPermission.canAskAgain
          ? await Location.requestForegroundPermissionsAsync()
          : currentPermission;
      if (!permission.granted)
        throw Error(
          "Tastha does not have location access. Allow it in phone settings, or enter your delivery PIN.",
        );

      // A fresh cached fix avoids waiting for GPS when already sufficiently precise.
      const cached = await Location.getLastKnownPositionAsync({
        maxAge: 60000,
        requiredAccuracy: 100,
      }).catch(() => null);
      let position = cached;
      if (!position) {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
          position = await Promise.race([
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
              mayShowUserSettingsDialog: true,
            }),
            new Promise<never>((_, reject) => {
              timeout = setTimeout(
                () =>
                  reject(
                    Error("Location took too long. Try again or enter a PIN."),
                  ),
                14000,
              );
            }),
          ]);
        } finally {
          if (timeout) clearTimeout(timeout);
        }
      }
      if (!position) throw Error("Current location is unavailable.");
      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy ?? undefined,
      };
      setCoordinates(coords);
      setShowFields(true);
      setPin("");
      setLabel("");
      const point = { latitude: coords.lat, longitude: coords.lng };
      const native = await Location.reverseGeocodeAsync(point)
        .then((items) => items[0] ?? null)
        .catch(() => null);
      let server = null;
      if (!native?.postalCode || !native?.street) {
        try {
          const result = await api.request<{
            location?: {
              pinCode?: string;
              pincode?: string;
              postcode?: string;
              displayAddress?: string;
              address?: string;
              city?: string;
            };
          }>(
            "/location/reverse?lat=" +
              encodeURIComponent(coords.lat) +
              "&lng=" +
              encodeURIComponent(coords.lng),
            { timeout: 7000 },
          );
          server = result.location || null;
        } catch {
          // Native geocoding or manual confirmation remains available.
        }
      }
      const resolved = describeDetectedPlace(native, server);
      setPin(resolved.pinCode);
      setLabel(resolved.label);
      const radius =
        coords.accuracy == null
          ? "Accuracy is unavailable"
          : "Estimated accuracy: " + Math.round(coords.accuracy) + " m";
      setAccuracyNote(
        radius +
          (cached ? " (recent device position)." : ".") +
          " Check your road, landmark and PIN before confirming." +
          (position.mocked ? " The device reports a simulated position." : ""),
      );
      if (!validPinCode(resolved.pinCode) || !resolved.label)
        setError(
          "We found your approximate position but not a complete street and PIN. Add or correct them below.",
        );
    } catch (e) {
      setShowFields(true);
      setError(
        e instanceof Error
          ? e.message
          : "Location is unavailable. Enter your delivery PIN.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setError("");
    if (!validPinCode(pin)) {
      setError("Enter a valid six-digit Indian delivery PIN.");
      return;
    }
    if (!label.trim()) {
      setError("Enter or confirm the delivery street or area.");
      return;
    }
    setBusy(true);
    try {
      const next = { label: label.trim(), pinCode: pin, ...coordinates };
      await readDeliveryEligibility(api, pin);
      await saveDeliveryLocation(next);
      dispatch(actions.setLocation(next));
      navigate("Home");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save the delivery location. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.content}
    >
      <Text style={s.title}>Where should we deliver?</Text>
      <Text style={s.muted}>
        Choose a delivery area to see available styles.
      </Text>
      <View style={s.panel}>
        <Text style={s.heading}>Use your current location</Text>
        <Text style={s.muted}>
          Confirm the suggested address before you continue.
        </Text>
        <Button title="Use current location" busy={busy} onPress={detect} />
      </View>
      {selected ? (
        <Text style={s.muted}>
          Current selection: {selected.label} {selected.pinCode || ""}
        </Text>
      ) : null}
      {!showFields ? (
        <Button
          title="Enter area or PIN manually"
          outline
          onPress={() => {
            setShowFields(true);
            setSearchEnabled(true);
          }}
        />
      ) : (
        <View style={s.panel}>
          <Text style={s.heading}>Confirm delivery address</Text>
          {coordinates ? (
            <DeliveryMap
              lat={coordinates.lat}
              lng={coordinates.lng}
              disabled={busy}
              onMove={(lat, lng) => {
                void movePin(lat, lng);
              }}
            />
          ) : null}
          {accuracyNote ? <Text style={s.muted}>{accuracyNote}</Text> : null}
          <Field
            label="Street, road or area"
            value={label}
            placeholder="Road number, landmark or locality"
            onChangeText={(value) => {
              setLabel(value);
              // Changing a road must not carry forward an unrelated old PIN.
              setPin("");
              setCoordinates(undefined);
              setSearchEnabled(true);
              setAccuracyNote("");
            }}
          />
          {searching ? (
            <Text style={s.muted}>Finding nearby areas…</Text>
          ) : null}
          {suggestions.length ? (
            <View style={{ gap: 8 }}>
              <Text style={s.muted}>Choose a suggested street or area</Text>
              {suggestions.map((place, index) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={"Select " + place.label}
                  key={place.label + index}
                  style={s.pill}
                  onPress={() => {
                    setLabel(place.label);
                    setPin(place.pinCode || "");
                    setCoordinates(
                      typeof place.lat === "number" &&
                        typeof place.lng === "number"
                        ? { lat: place.lat, lng: place.lng }
                        : undefined,
                    );
                    setSearchEnabled(false);
                    setSuggestions([]);
                    setError("");
                  }}
                >
                  <Text style={s.text}>{place.label}</Text>
                  {place.pinCode ? (
                    <Text style={s.muted}>PIN {place.pinCode}</Text>
                  ) : (
                    <Text style={s.muted}>Confirm your delivery PIN</Text>
                  )}
                </Pressable>
              ))}
            </View>
          ) : null}
          <Field
            label="Six-digit delivery PIN"
            value={pin}
            maxLength={6}
            keyboardType="number-pad"
            onChangeText={(value) => {
              setPin(value);
              setCoordinates(undefined);
            }}
          />
          <Button
            title="Confirm delivery location"
            busy={busy}
            onPress={confirm}
          />
        </View>
      )}
      {user ? (
        <Button
          title="Choose a saved address"
          outline
          onPress={() => navigate("Addresses")}
        />
      ) : null}
      <ErrorBox message={error} />
      <Button
        title="Browse without location"
        outline
        onPress={() => navigate("Home")}
      />
      <Text style={s.muted}>
        The product list updates for your confirmed PIN. Final delivery
        eligibility is checked using the full address at checkout.
      </Text>
    </ScrollView>
  );
}
