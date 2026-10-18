import React, { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import { Tabs, Link, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSelector } from "../../state";
import { colors } from "../../config";
import { styles as s } from "../../components/ui";
export default function TabLayout() {
  const location = useAppSelector((x) => x.location);
  const router = useRouter();
  const prompted = useRef(false);
  useEffect(() => {
    if (!prompted.current) {
      prompted.current = true;
      if (!location) router.push("/location");
    }
  }, [location, router]);
  return (
    <View style={s.screen}>
      <SafeAreaView edges={["top", "left", "right"]} style={s.header}>
        <Text style={[s.heading, { color: colors.gold, letterSpacing: 4 }]}>
          TASTHA
        </Text>
        <Link href="/location" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change delivery location"
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text numberOfLines={1} style={s.muted}>
              Deliver to: {location?.label || "Choose your location"}{" "}
              {location?.pinCode || ""} ▾
            </Text>
          </Pressable>
        </Link>
      </SafeAreaView>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.gold,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
          sceneStyle: { backgroundColor: colors.background },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: () => <Text style={s.text}>⌂</Text>,
          }}
        />
        <Tabs.Screen
          name="shop"
          options={{
            title: "Shop",
            tabBarIcon: () => <Text style={s.text}>◇</Text>,
          }}
        />
        <Tabs.Screen
          name="wishlist"
          options={{
            title: "Wishlist",
            tabBarIcon: () => <Text style={s.text}>♡</Text>,
          }}
        />
        <Tabs.Screen
          name="bag"
          options={{
            title: "Bag",
            tabBarIcon: () => <Text style={s.text}>▢</Text>,
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: "Account",
            tabBarIcon: () => <Text style={s.text}>○</Text>,
          }}
        />
      </Tabs>
    </View>
  );
}
