import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { ApiError } from "../api/client";
import { api, session } from "../api/runtime";
import type { Session } from "../models";
import { Button, ErrorBox, Field, styles as s } from "../components/ui";
import type { Navigate } from "./Shop";
export function AuthCode({
  navigate,
  recovery = false,
}: {
  navigate: Navigate;
  recovery?: boolean;
}) {
  const [identifier, setIdentifier] = useState("");
  const [requested, setRequested] = useState("");
  const [challenge, setChallenge] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function send() {
    if (busy) return;
    setError("");
    setNotice("");
    const value = identifier.trim();
    if (
      recovery
        ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        : !/^(?:\+91)?[6-9]\d{9}$/.test(value)
    ) {
      setError(
        recovery
          ? "Enter your registered email address."
          : "Enter a valid Indian mobile number.",
      );
      return;
    }
    setBusy(true);
    try {
      const result = await api.request<{
        challenge?: string;
        message?: string;
        whatsappDelivered?: boolean;
      }>(recovery ? "/auth/forgot-password/verify-user" : "/auth/otp/send", {
        auth: "none",
        method: "POST",
        body: recovery ? { email: value } : { phone: value },
      });
      if (recovery && !result.challenge)
        throw Error("Recovery could not be started.");
      if (!recovery && result.whatsappDelivered === false) {
        setRequested("");
        setError(
          "The WhatsApp code could not be delivered. Retry later or use email and password.",
        );
        return;
      }
      setRequested(value);
      setChallenge(result.challenge || "");
      setOtp("");
      setNotice(
        result.whatsappDelivered === false
          ? "The code could not be delivered. Please retry later."
          : result.message ||
              "Check your registered WhatsApp number for the code.",
      );
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? "This number is linked to more than one account. Sign in with your registered email and password."
          : e instanceof Error
            ? e.message
            : "Code request failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function verify() {
    if (busy) return;
    setError("");
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the six-digit verification code.");
      return;
    }
    if (recovery && (password.length < 8 || password !== confirm)) {
      setError("Use at least eight characters and match both passwords.");
      return;
    }
    setBusy(true);
    const revision = session.revision();
    try {
      if (recovery) {
        await api.request("/auth/forgot-password/reset", {
          auth: "none",
          method: "POST",
          body: { email: requested, challenge, otp, newPassword: password },
        });
        if (revision !== session.revision()) return;
        await session.clear();
        setRequested("");
        setPassword("");
        setConfirm("");
        setNotice("Password updated. Sign in with your new password.");
      } else {
        const result = await api.request<Session>("/auth/otp/verify", {
          auth: "none",
          method: "POST",
          body: { phone: requested, otp },
        });
        await session.save(result, revision, true);
        navigate("Authenticated");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.title}>
        {recovery ? "Reset password" : "Sign in with WhatsApp"}
      </Text>
      <Text style={s.muted}>
        {recovery
          ? "Enter your registered email to start password recovery."
          : "We’ll send a six-digit code to your registered WhatsApp number. You can also sign in with your email and password."}
      </Text>
      <Field
        label={recovery ? "Registered email address" : "Mobile number"}
        value={identifier}
        onChangeText={(value) => {
          setIdentifier(value);
          setError("");
          setRequested("");
          setChallenge("");
          setOtp("");
          setNotice("");
        }}
        autoCapitalize="none"
        keyboardType={recovery ? "email-address" : "phone-pad"}
      />
      <Button
        title={requested ? "Send a fresh code" : "Send verification code"}
        busy={busy}
        onPress={() => {
          void send();
        }}
      />
      {notice ? (
        <Text accessibilityRole="alert" style={s.muted}>
          {notice}
        </Text>
      ) : null}
      {requested ? (
        <View style={{ gap: 16 }}>
          <Field
            label="Verification code"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
          />
          {recovery ? (
            <>
              <Field
                label="New password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
              />
              <Field
                label="Confirm new password"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
              />
            </>
          ) : null}
          <Button
            title={recovery ? "Reset password" : "Verify and sign in"}
            busy={busy}
            onPress={() => {
              void verify();
            }}
          />
        </View>
      ) : null}
      <ErrorBox message={error} />
      <Button
        title="Use password sign in"
        outline
        onPress={() => navigate("Login")}
      />
    </ScrollView>
  );
}
