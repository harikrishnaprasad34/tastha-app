import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Linking,
  Platform,
  Text,
  View,
} from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import * as Crypto from "expo-crypto";
import { colors } from "../config";
import { Button, ErrorBox, Loading, styles as s } from "../components/ui";
import {
  externalWebsiteLink,
  trustedWebsiteUrl,
  websitePageUrl,
  type WebsitePage,
} from "../website/pages";
import { parseWebsiteExport, websiteExportScript } from "../website/exports";
import { websiteBootstrap } from "../website/bootstrap";
import { useAppSelector } from "../state";
import type { WebViewSource } from "react-native-webview/lib/WebViewTypes";

export function WebsiteWorkspace({ page }: { page: WebsitePage }) {
  const identity = useAppSelector((state) => state.auth.user?.id || "guest");
  const web = useRef<WebView<unknown>>(null);
  const canGoBack = useRef(false);
  const exportBusy = useRef(false);
  const active = useRef(true);
  const [nonce] = useState(() => Crypto.randomUUID());
  const [source, setSource] = useState<WebViewSource>(() =>
    websiteBootstrap(page, identity),
  );
  const documentUrl = useRef(websitePageUrl(page));
  const [error, setError] = useState("");
  const [sharing, setSharing] = useState(false);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    active.current = true;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack.current) {
        web.current?.goBack();
        return true;
      }
      return false;
    });
    return () => {
      active.current = false;
      sub.remove();
    };
  }, []);
  const retry = () => {
    setError("");
    canGoBack.current = false;
    setGeneration((n) => n + 1);
  };
  const external = (url: string) => {
    if (!externalWebsiteLink(url)) {
      Alert.alert("Link unavailable", "This link cannot be opened in Tastha.");
      return;
    }
    Alert.alert(
      "Open outside Tastha?",
      "This link opens another app or website.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open",
          onPress: () => {
            void Linking.openURL(url).catch(() =>
              Alert.alert(
                "Cannot open link",
                "No compatible app is available.",
              ),
            );
          },
        },
      ],
    );
  };
  const openWindow = (url: string) => {
    if (trustedWebsiteUrl(url)) {
      setError("");
      setSource({ uri: url });
    } else external(url);
  };
  async function onMessage(event: WebViewMessageEvent) {
    if (exportBusy.current) return;
    try {
      const item = parseWebsiteExport(
        event.nativeEvent.data,
        event.nativeEvent.url,
        nonce,
      );
      if (!item) return;
      exportBusy.current = true;
      setSharing(true);
      const [{ File, Paths }, sharing] = await Promise.all([
        import("expo-file-system"),
        import("expo-sharing"),
      ]);
      if (!active.current) return;
      if (!(await sharing.isAvailableAsync()))
        throw Error("File sharing is unavailable on this device.");
      const file = new File(
        Paths.cache,
        Crypto.randomUUID() + "-" + item.filename,
      );
      try {
        await file.write(item.base64, { encoding: "base64" });
        if (!active.current) return;
        await sharing.shareAsync(file.uri, {
          mimeType: item.mime,
          dialogTitle: item.filename,
        });
      } finally {
        if (file.exists) file.delete();
      }
    } catch (e) {
      if (active.current)
        Alert.alert(
          "Download unavailable",
          e instanceof Error ? e.message : "Try the export again.",
        );
    } finally {
      exportBusy.current = false;
      if (active.current) setSharing(false);
    }
  }
  return (
    <SafeAreaView
      edges={["bottom"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View
        style={[
          s.row,
          {
            padding: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            justifyContent: "space-between",
          },
        ]}
      >
        <Link
          replace
          href="/website"
          style={{ color: colors.gold, padding: 8 }}
          accessibilityLabel="All Tastha website pages"
        >
          All pages
        </Link>
        <Text style={[s.small, { flex: 1 }]}>
          {page.group === "Administration"
            ? "Admin workspace"
            : "Website workspace"}
        </Text>
        <Button
          title="Reload"
          outline
          onPress={() => {
            setError("");
            web.current?.reload();
          }}
        />
      </View>
      {sharing ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[s.muted, { padding: 8 }]}
        >
          Preparing your file…
        </Text>
      ) : null}
      {error ? (
        <View style={s.content}>
          <ErrorBox message={error} retry={retry} />
        </View>
      ) : null}
      <WebView<unknown>
        key={generation}
        ref={web}
        source={source}
        style={{
          flex: 1,
          backgroundColor: colors.background,
          display: error ? "none" : "flex",
        }}
        originWhitelist={["*"]}
        onShouldStartLoadWithRequest={(request) => {
          if (request.isTopFrame === false)
            return (
              request.url.startsWith("https:") ||
              request.url.startsWith(
                "blob:" + new URL(websitePageUrl(page)).origin + "/",
              ) ||
              request.url === "about:blank"
            );
          if (trustedWebsiteUrl(request.url)) return true;
          if (request.url === "about:blank") return true;
          external(request.url);
          return false;
        }}
        onOpenWindow={(event) => openWindow(event.nativeEvent.targetUrl)}
        onNavigationStateChange={(state) => {
          canGoBack.current = state.canGoBack;
          if (trustedWebsiteUrl(state.url)) documentUrl.current = state.url;
        }}
        onError={() =>
          setError("Tastha could not load. Check your connection and retry.")
        }
        onHttpError={(event) => {
          if (
            trustedWebsiteUrl(event.nativeEvent.url) &&
            event.nativeEvent.url === documentUrl.current &&
            event.nativeEvent.statusCode >= 400
          )
            setError(
              "This page is temporarily unavailable. Retry in a moment.",
            );
        }}
        onRenderProcessGone={() =>
          setError("The page stopped responding. Reload to continue.")
        }
        onContentProcessDidTerminate={() =>
          setError("The page was paused by your device. Reload to continue.")
        }
        startInLoadingState
        renderLoading={() => <Loading />}
        injectedJavaScript={websiteExportScript(nonce)}
        injectedJavaScriptForMainFrameOnly
        onMessage={(event) => {
          void onMessage(event);
        }}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled={false}
        thirdPartyCookiesEnabled={false}
        cacheEnabled={false}
        cacheMode="LOAD_NO_CACHE"
        mixedContentMode="never"
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        geolocationEnabled
        mediaCapturePermissionGrantType="prompt"
        javaScriptCanOpenWindowsAutomatically={false}
        setSupportMultipleWindows
        allowsBackForwardNavigationGestures={Platform.OS === "ios"}
        allowsLinkPreview={false}
      />
    </SafeAreaView>
  );
}
