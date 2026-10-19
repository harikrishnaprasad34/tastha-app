import React from "react";
import { useLocalSearchParams, Stack } from "expo-router";
import { WebsiteWorkspace } from "../../screens/WebsiteWorkspace";
import { websitePage } from "../../website/pages";
import { ErrorBox } from "../../components/ui";
import { useAppSelector } from "../../state";

export default function Screen() {
  const identity = useAppSelector((state) => state.auth.user?.id || "guest");
  const { page: value } = useLocalSearchParams<{ page: string }>();
  const page = websitePage(typeof value === "string" ? value : undefined);
  if (!page) return <ErrorBox message="This Tastha page is unavailable." />;
  return (
    <>
      <Stack.Screen options={{ title: page.title }} />
      <WebsiteWorkspace key={page.id + ":" + identity} page={page} />
    </>
  );
}
