import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Formik } from "formik";
import * as Yup from "yup";
import { api, session } from "../api/runtime";
import { Button, ErrorBox, Field, styles as s } from "../components/ui";
import type { Navigate } from "./Shop";
export function Security({ navigate }: { navigate: Navigate }) {
  const [error, setError] = useState("");
  return (
    <ScrollView
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.title}>Security & Sign In</Text>
      <Text style={s.muted}>
        Change your password. You will need to sign in again on your devices.
      </Text>
      <Formik
        initialValues={{ currentPassword: "", newPassword: "", confirm: "" }}
        validationSchema={Yup.object({
          currentPassword: Yup.string().required("Enter your current password"),
          newPassword: Yup.string()
            .min(8)
            .required()
            .notOneOf(
              [Yup.ref("currentPassword")],
              "Choose a different password",
            ),
          confirm: Yup.string()
            .required()
            .oneOf([Yup.ref("newPassword")], "Passwords must match"),
        })}
        onSubmit={async (values) => {
          setError("");
          const revision = session.revision();
          try {
            await api.request("/users/password", {
              method: "PUT",
              auth: "required",
              body: {
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
              },
            });
            if (revision !== session.revision()) return;
            await session.clear();
            navigate("Login");
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Password could not be changed.",
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
            {(["currentPassword", "newPassword", "confirm"] as const).map(
              (key) => (
                <Field
                  key={key}
                  label={
                    {
                      currentPassword: "Current password",
                      newPassword: "New password",
                      confirm: "Confirm new password",
                    }[key]
                  }
                  value={values[key]}
                  onChangeText={handleChange(key)}
                  onBlur={handleBlur(key)}
                  secureTextEntry
                  error={touched[key] ? errors[key] : undefined}
                />
              ),
            )}
            <ErrorBox message={error} />
            <Button
              title="Change password"
              busy={isSubmitting}
              onPress={() => handleSubmit()}
            />
          </View>
        )}
      </Formik>
    </ScrollView>
  );
}
