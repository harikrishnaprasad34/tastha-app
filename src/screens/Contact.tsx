import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Formik } from "formik";
import * as Yup from "yup";
import { api } from "../api/runtime";
import { StoreContact } from "../components/StoreContact";
import { Button, ErrorBox, Field, styles as s } from "../components/ui";
export function Contact() {
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.content}
    >
      <Text style={s.muted}>CLIENT SERVICES & CONCIERGE</Text>
      <Text style={s.title}>Get in Touch</Text>
      <Text style={s.muted}>
        Contact our team for sizing, order inquiries and feedback.
      </Text>
      <StoreContact />
      {reference ? (
        <View style={s.panel}>
          <Text style={s.heading}>Message Received</Text>
          <Text style={s.text}>
            Your message has been saved for our support team. Reference:{" "}
            {reference}.
          </Text>
        </View>
      ) : (
        <Formik
          initialValues={{ name: "", email: "", subject: "", message: "" }}
          validationSchema={Yup.object({
            name: Yup.string()
              .trim()
              .min(2)
              .max(100)
              .required("Your name is required"),
            email: Yup.string()
              .trim()
              .email("Enter a valid email")
              .max(254)
              .required("Email is required"),
            subject: Yup.string()
              .trim()
              .min(3)
              .max(160)
              .required("Subject is required"),
            message: Yup.string()
              .trim()
              .min(10, "Use at least 10 characters")
              .max(4000)
              .required("Message is required"),
          })}
          onSubmit={async (values) => {
            setError("");
            try {
              const response = await api.request<{
                success?: boolean;
                reference?: string;
              }>("/contact", {
                auth: "none",
                method: "POST",
                body: Object.fromEntries(
                  Object.entries(values).map(([key, value]) => [
                    key,
                    value.trim(),
                  ]),
                ),
              });
              if (
                !response.success ||
                typeof response.reference !== "string" ||
                !response.reference.trim()
              )
                throw Error("Your message could not be saved.");
              setReference(response.reference);
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Unable to save your message. Please retry.",
              );
            }
          }}
        >
          {(form) => (
            <View style={s.panel}>
              {(["name", "email", "subject", "message"] as const).map((key) => (
                <Field
                  key={key}
                  label={
                    {
                      name: "Your Name",
                      email: "Email Address",
                      subject: "Subject",
                      message: "Message",
                    }[key]
                  }
                  value={form.values[key]}
                  onChangeText={form.handleChange(key)}
                  onBlur={form.handleBlur(key)}
                  error={form.touched[key] ? form.errors[key] : undefined}
                  editable={!form.isSubmitting}
                  autoCapitalize={key === "email" ? "none" : "sentences"}
                  keyboardType={key === "email" ? "email-address" : "default"}
                  multiline={key === "message"}
                  maxLength={
                    { name: 100, email: 254, subject: 160, message: 4000 }[key]
                  }
                />
              ))}
              <ErrorBox message={error} />
              <Button
                title="Send Message"
                busy={form.isSubmitting}
                onPress={() => form.handleSubmit()}
              />
            </View>
          )}
        </Formik>
      )}
    </ScrollView>
  );
}
