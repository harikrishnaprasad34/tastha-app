import React, { useState } from "react";
import { ScrollView, Text, View, Alert } from "react-native";
import { Formik } from "formik";
import * as Yup from "yup";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { api, session } from "../api/runtime";
import { API_URL } from "../config";
import type { Session } from "../models";
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
      <Text style={s.muted}>Sign in to your existing customer account.</Text>
      <Formik
        initialValues={{ identifier: "", password: "" }}
        validationSchema={Yup.object({
          identifier: Yup.string().trim().required("Enter your email or phone"),
          password: Yup.string().required("Enter your password"),
        })}
        onSubmit={async (values) => {
          setError("");
          const revision = session.revision();
          try {
            const result = await api.request<Session>("/auth/login", {
              auth: "none",
              method: "POST",
              body: values,
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
              label="Email or phone"
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
    </ScrollView>
  );
}
export function Account({ navigate }: { navigate: Navigate }) {
  const user = useAppSelector((x) => x.auth.user);
  async function logout() {
    const token = session.get()?.accessToken;
    try {
      await session.clear();
      if (token)
        void fetch(API_URL + "/auth/logout", {
          method: "POST",
          headers: { Authorization: "Bearer " + token },
          signal: AbortSignal.timeout(10000),
        }).catch(() => {});
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
      <Button
        title="Virtual try-on availability"
        outline
        onPress={() => navigate("AI")}
      />
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
            await dispatch(saveAddress(values)).unwrap();
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
  const [pin, setPin] = useState(selected?.pinCode || ""),
    [label, setLabel] = useState(selected?.label || ""),
    [coordinates, setCoordinates] = useState<
      { lat: number; lng: number; accuracy?: number } | undefined
    >(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function detect() {
    setBusy(true);
    setError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted")
        throw Error(
          "Location permission was denied. Enter your delivery PIN manually.",
        );
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                Error("Location timed out. Enter your delivery PIN manually."),
              ),
            15000,
          ),
        ),
      ]);
      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy ?? undefined,
      };
      setCoordinates(coords);
      setPin("");
      setLabel("");
      const r = await api.request<{
        location: {
          pinCode?: string;
          pincode?: string;
          postcode?: string;
          displayAddress?: string;
          address?: string;
          city?: string;
        };
      }>("/location/reverse?lat=" + coords.lat + "&lng=" + coords.lng);
      const l = r.location;
      setPin(l.pinCode || l.pincode || l.postcode || "");
      setLabel(l.displayAddress || l.address || l.city || "");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Location is unavailable. Enter your PIN.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    setError("");
    if (!/^[1-9]\d{5}$/.test(pin)) {
      setError("Enter a valid six-digit Indian delivery PIN.");
      return;
    }
    setBusy(true);
    try {
      const next = {
        label: label.trim() || "PIN " + pin,
        pinCode: pin,
        ...coordinates,
      };
      await SecureStore.setItemAsync(
        "tastha.delivery.v1",
        JSON.stringify(next),
      );
      dispatch(actions.setLocation(next));
      navigate("Home");
    } catch {
      setError("Could not save the location. Please retry.");
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
        Device positioning can be approximate. Confirm your PIN and area before
        shopping.
      </Text>
      <Button title="Use device location" busy={busy} onPress={detect} />
      {coordinates ? (
        <Text style={s.muted}>
          Estimated device accuracy:{" "}
          {coordinates.accuracy
            ? Math.round(coordinates.accuracy) + " metres"
            : "unknown"}
          . Correct the area and PIN below if needed.
        </Text>
      ) : null}
      <Field
        label="Area / location label"
        value={label}
        onChangeText={(value) => {
          setLabel(value);
          setCoordinates(undefined);
        }}
      />
      <Field
        label="Delivery PIN code"
        value={pin}
        maxLength={6}
        keyboardType="number-pad"
        onChangeText={(value) => {
          setPin(value);
          setCoordinates(undefined);
        }}
      />
      <ErrorBox message={error} />
      <Button title="Confirm location" busy={busy} onPress={confirm} />
      <Text style={s.muted}>
        Product availability is refreshed after confirmation. Final delivery
        eligibility is verified against your full checkout address. A map-pin
        editor is not yet available in this native build.
      </Text>
    </ScrollView>
  );
}
