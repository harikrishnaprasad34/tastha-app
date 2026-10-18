import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Formik } from "formik";
import * as Yup from "yup";
import { api, session } from "../api/runtime";
import { customerRegistrationPayload } from "../api/authPayload";
import type { Session } from "../models";
import type { Navigate } from "./Shop";
import { Button, ErrorBox, Field, styles as s } from "../components/ui";

const schema = Yup.object({
  fullName: Yup.string().trim().min(2).max(50).required("Enter your full name"),
  email: Yup.string()
    .trim()
    .email("Enter a valid email")
    .required("Email is required"),
  phone: Yup.string().required("Mobile number is required"),
  password: Yup.string()
    .min(8, "Use at least eight characters")
    .matches(/[A-Z]/, "Add an uppercase letter")
    .matches(/[a-z]/, "Add a lowercase letter")
    .matches(/\d/, "Add a number")
    .matches(/[^A-Za-z0-9]/, "Add a special character")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Confirm your password"),
  agree: Yup.boolean().oneOf([true], "Please review and accept the terms"),
});

export function Signup({ navigate }: { navigate: Navigate }) {
  const [error, setError] = useState("");
  return (
    <ScrollView
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.title}>Create your Tastha account</Text>
      <Text style={s.muted}>
        Explore the same collections and order history on Android and iOS.
      </Text>
      <Formik
        initialValues={{
          fullName: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
          agree: false,
        }}
        validationSchema={schema}
        onSubmit={async (values) => {
          setError("");
          const revision = session.revision();
          try {
            const result = await api.request<Session>("/auth/register", {
              method: "POST",
              auth: "none",
              body: customerRegistrationPayload(values),
            });
            await session.save(result, revision, true);
            navigate("Authenticated");
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Could not create your account.",
            );
          }
        }}
      >
        {({
          values,
          handleChange,
          handleBlur,
          setFieldValue,
          handleSubmit,
          errors,
          touched,
          isSubmitting,
        }) => (
          <View style={{ gap: 14 }}>
            <Field
              label="Full name"
              value={values.fullName}
              onChangeText={handleChange("fullName")}
              onBlur={handleBlur("fullName")}
              error={touched.fullName ? errors.fullName : undefined}
            />
            <Field
              label="Email address"
              value={values.email}
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={handleChange("email")}
              onBlur={handleBlur("email")}
              error={touched.email ? errors.email : undefined}
            />
            <Field
              label="Mobile number"
              value={values.phone}
              keyboardType="phone-pad"
              autoComplete="tel"
              onChangeText={handleChange("phone")}
              onBlur={handleBlur("phone")}
              error={touched.phone ? errors.phone : undefined}
            />
            <Field
              label="Password"
              value={values.password}
              secureTextEntry
              autoComplete="new-password"
              onChangeText={handleChange("password")}
              onBlur={handleBlur("password")}
              error={touched.password ? errors.password : undefined}
            />
            <Field
              label="Confirm password"
              value={values.confirmPassword}
              secureTextEntry
              onChangeText={handleChange("confirmPassword")}
              onBlur={handleBlur("confirmPassword")}
              error={
                touched.confirmPassword ? errors.confirmPassword : undefined
              }
            />
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: values.agree }}
              style={s.row}
              onPress={() => {
                void setFieldValue("agree", !values.agree);
              }}
            >
              <Text style={s.text}>{values.agree ? "☑" : "□"}</Text>
              <Text style={s.text}>
                I agree to the Tastha terms and privacy policy.
              </Text>
            </Pressable>
            <View style={s.row}>
              <Button
                title="View Terms"
                outline
                onPress={() => navigate("Help", "terms")}
              />
              <Button
                title="Privacy Policy"
                outline
                onPress={() => navigate("Help", "privacy")}
              />
            </View>
            {touched.agree && errors.agree ? (
              <Text style={s.error}>{errors.agree}</Text>
            ) : null}
            <ErrorBox message={error} />
            <Button
              title="Create account"
              busy={isSubmitting}
              onPress={() => handleSubmit()}
            />
          </View>
        )}
      </Formik>
      <Button
        title="Already have an account? Sign in"
        outline
        onPress={() => navigate("Login")}
      />
    </ScrollView>
  );
}
