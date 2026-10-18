import React, { useEffect, useState } from "react";
import { ScrollView, Text, View, Alert, Pressable } from "react-native";
import { Formik } from "formik";
import * as Yup from "yup";
import * as Location from "expo-location";
import { saveDeliveryLocation } from "../api/deliveryLocation";
import {
  describeDetectedPlace,
  locationFromAddress,
  locationFromSearchResult,
  validPinCode,
  type SearchedPlace,
} from "../shared/deliveryLocation";
import { api, session } from "../api/runtime";
import { customerLoginPayload } from "../api/authPayload";
import { mergeProfileUser } from "../api/profile";
import { API_URL } from "../config";
import type { DeliveryLocation, Session } from "../models";
import { useAppDispatch, useAppSelector } from "../state";
import { actions, saveAddress } from "../state/store";
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
            navigate("Account");
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
      <Button title="Create a Tastha account" outline onPress={() => navigate("Signup")} />
    </ScrollView>
  );
}
export function Account({ navigate }: { navigate: Navigate }) {
  const user = useAppSelector((x) => x.auth.user);
  async function logout() {
    const prior = session.get();
    try {
      await session.clear();
      if (prior) {
        // Local sign-out must succeed even when the network is unavailable.
        // The backend revokes refresh tokens from the JSON body, not the header.
        void fetch(API_URL + "/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: prior.refreshToken,
            userId: prior.user.id,
          }),
          signal: AbortSignal.timeout(10000),
        }).catch(() => {});
      }
    } catch {
      Alert.alert(
        "Sign-out storage",
        "You are signed out on this screen. Secure storage could not be cleared; close the app and retry.",
      );
    }
  }
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.title}>
        {user ? `Hello, ${user.fullName}` : "Your Tastha account"}
      </Text>
      {!user ? (
        <Button title="Sign in" onPress={() => navigate("Login")} />
      ) : (
        <>
          <Text style={s.muted}>{user.email || user.phone}</Text>
          <Button
            title="Edit profile"
            outline
            onPress={() => navigate("EditProfile")}
          />
          <Button title="My orders" onPress={() => navigate("Orders")} />
          <Button
            title="Saved addresses"
            outline
            onPress={() => navigate("Addresses")}
          />
          <Button title="Sign out" outline onPress={logout} />
        </>
      )}
      <Button
        title="Delivery location"
        outline
        onPress={() => navigate("Location")}
      />
      <Button title="Help and FAQs" outline onPress={() => navigate("Help", "faq")} />
      <Button title="Privacy policy" outline onPress={() => navigate("Help", "privacy")} />
      <Button title="Shipping and returns" outline onPress={() => navigate("Help", "shipping")} />
      <Button
        title="Virtual try-on availability"
        outline
        onPress={() => navigate("AI")}
      />
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
        <Button title="Sign in" onPress={() => navigate("Login")} />
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
        enableReinitialize
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
              /^(?:\\+91[ -]?)?[6-9]\\d{9}$/,
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
            const merged = mergeProfileUser(original.user, result.user);
            await session.save(
              { ...original, user: merged },
              session.revision(),
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

export function AddressForm({ navigate }: { navigate: Navigate }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((x) => x.auth.user);
  const [error, setError] = useState("");
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.content}
    >
      <Text style={s.title}>Delivery address</Text>
      <Formik
        initialValues={{
          fullName: user?.fullName || "",
          phone: user?.phone || "",
          streetAddress: "",
          apartment: "",
          city: "",
          state: "",
          pinCode: "",
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
            const saved = await dispatch(saveAddress(values)).unwrap();
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
  >();
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
      await saveDeliveryLocation(next);
      dispatch(actions.setLocation(next));
      navigate("Home");
    } catch {
      setError("Could not save the delivery location. Please retry.");
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
        Find your nearby road or area for relevant products. Tastha asks for
        location permission only when you choose current location.
      </Text>
      <View style={s.panel}>
        <Text style={s.heading}>Use your current location</Text>
        <Text style={s.muted}>
          We will suggest an address for you to check, not automatically replace
          a saved delivery location.
        </Text>
        <Button
          title="Detect my current location"
          busy={busy}
          onPress={detect}
        />
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
