import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Button, styles as s } from "../components/ui";
import type { Navigate } from "./Shop";

type Section = "faq" | "terms" | "privacy" | "shipping" | "returns";
const CONTENT: Record<Section, {
  title: string; summary: string; sections: { title: string; content: string }[];
}> = {
  faq: {
    title: "Frequently asked questions",
    summary: "Answers based on Tastha's website information. Availability can vary.",
    sections: [
      {
        title: "How do AI outfit recommendations work?",
        content: "The website uses occasion, preferences, sizes and live catalog items to suggest complete outfits. Native try-on and recommendations are still being integrated.",
      },
      {
        title: "Where can I follow my order?",
        content: "Open My Orders, choose an order, and select Track Order to see the latest status provided by Tastha.",
      },
      {
        title: "Can I change my delivery address?",
        content: "Go to Saved Addresses to choose a location, make an address default, or remove one you no longer use.",
      },
      {
        title: "How do returns work?",
        content: "The website's policy describes a seven-day window for eligible unused garments with original tags. Check the return policy and contact customer support to confirm eligibility.",
      },
    ],
  },
  terms: {
    title: "Terms and conditions",
    summary: "Overview of the terms currently described on the Tastha website.",
    sections: [
      {
        title: "Platform and brand",
        content: "The website explains that Tastha brand assets, product photography, designs, and digital experiences are protected intellectual property.",
      },
      {
        title: "Customer accounts",
        content: "Customers are expected to protect account credentials and one-time security codes. Purchases are subject to the terms and conditions provided by Tastha.",
      },
    ],
  },
  privacy: {
    title: "Privacy policy",
    summary: "Overview of the privacy information described on the Tastha website.",
    sections: [
      {
        title: "Information collected",
        content: "Information used for shopping includes your name, contact details, delivery address, and optional style or size preferences.",
      },
      {
        title: "Information used for",
        content: "The website describes using this data for order fulfillment, relevant styling experiences, support, and authentication.",
      },
    ],
  },
  shipping: {
    title: "Shipping and delivery",
    summary: "Policy overview from the Tastha website; actual charges and eligibility are confirmed at checkout.",
    sections: [
      {
        title: "Delivery charges",
        content: "The published website policy lists free express delivery above ₹999 and standard shipping of ₹99 below that threshold. Confirm current charges from the final server-issued order quote.",
      },
      {
        title: "Order tracking",
        content: "Check the recorded shipment progress under My Orders. A live courier position or exact arrival time is not available from the current native tracking API.",
      },
    ],
  },
  returns: {
    title: "Returns and exchanges",
    summary: "Policy overview from the Tastha website. Eligibility must be confirmed by support.",
    sections: [
      {
        title: "Return conditions",
        content: "The website describes a seven-day return or exchange window for eligible garments that have not been worn or washed, with their original tags and packaging.",
      },
    ],
  },
};

export function Help({ section, navigate }: { section: string; navigate: Navigate }) {
  const key = section in CONTENT ? section as Section : "faq";
  const page = CONTENT[key];
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.title}>{page.title}</Text>
      <Text style={s.muted}>{page.summary}</Text>
      {page.sections.map((entry) => (
        <View key={entry.title} style={s.panel}>
          <Text style={s.heading}>{entry.title}</Text>
          <Text style={s.muted}>{entry.content}</Text>
        </View>
      ))}
      <Text style={s.muted}>
        These short overviews are not substitutes for complete published policies.
      </Text>
      <Button title="Contact Us" outline onPress={() => navigate("Contact")} />
      <Button title="Frequently asked questions" outline
        onPress={() => navigate("Help", "faq")} />
      <Button title="Terms and conditions" outline
        onPress={() => navigate("Help", "terms")} />
      <Button title="Privacy policy" outline
        onPress={() => navigate("Help", "privacy")} />
      <Button title="Shipping policy" outline
        onPress={() => navigate("Help", "shipping")} />
      <Button title="Return policy" outline
        onPress={() => navigate("Help", "returns")} />
    </ScrollView>
  );
}
