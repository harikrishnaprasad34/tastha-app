import React, { useState } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { Link } from "expo-router";
import { websitePages } from "../website/pages";
import { Field, styles as s } from "../components/ui";
import { colors } from "../config";

export function WebsitePages() {
  const [search, setSearch] = useState("");
  const groups = [
    "Shopping",
    "Style studio",
    "Account",
    "Help",
    "Administration",
  ] as const;
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.content}
    >
      <Text style={s.title}>Explore Tastha</Text>
      <Text style={s.muted}>
        Open the full website experience inside Tastha. Sign in with your
        website account when asked. Administration requires an authorized staff
        account.
      </Text>
      <Field
        label="Find a page"
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
      />
      {groups.map((group) => {
        const pages = websitePages.filter(
          (page) =>
            page.group === group &&
            (page.title + " " + group)
              .toLowerCase()
              .includes(search.trim().toLowerCase()),
        );
        return pages.length ? (
          <View key={group} style={{ gap: 10 }}>
            <Text style={[s.heading, { color: colors.gold }]}>{group}</Text>
            {pages.map((page) => (
              <Link
                replace
                key={page.id}
                href={{
                  pathname: "/website/[page]",
                  params: { page: page.id },
                }}
                asChild
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    page.title +
                    (group === "Administration" ? ", administration" : "")
                  }
                  style={[
                    s.panel,
                    {
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      minHeight: 54,
                    },
                  ]}
                >
                  <Text style={[s.text, { flex: 1 }]}>{page.title}</Text>
                  <Text style={{ color: colors.gold }}>→</Text>
                </Pressable>
              </Link>
            ))}
          </View>
        ) : null;
      })}
      {!websitePages.some((page) =>
        (page.title + " " + page.group)
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      ) ? (
        <Text style={s.muted}>No matching pages. Try another name.</Text>
      ) : null}
    </ScrollView>
  );
}
