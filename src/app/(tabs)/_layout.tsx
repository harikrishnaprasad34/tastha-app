import {
  Tabs,
  BottomTabBar,
  type BottomTabBarProps,
} from "expo-router/js-tabs";
import { money } from "../../shared/catalog";
import React, { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector } from "../../state";
import { fetchBag, fetchWishlist } from "../../state/store";
import { colors } from "../../config";
import { styles as s } from "../../components/ui";
function StoreTabBar(props: BottomTabBarProps) {
  const bag = useAppSelector((x) => x.commerce.bag);
  const userId = useAppSelector((x) => x.auth.user?.id);
  const route = props.state.routes[props.state.index]?.name;
  const count = bag?.items.reduce((sum, line) => sum + line.quantity, 0) || 0;
  const bagRoute = props.state.routes.find((item) => item.name === "bag");
  const visible =
    userId && count > 0 && ["index", "shop", "wishlist"].includes(route);
  return (
    <View style={{ backgroundColor: colors.background }}>
      {visible && bagRoute ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={count + " items in bag. View bag"}
          onPress={() => props.navigateToTab(bagRoute.key)}
          style={{
            marginHorizontal: 12,
            marginTop: 8,
            marginBottom: 6,
            padding: 14,
            borderRadius: 14,
            backgroundColor: colors.gold,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.background, fontWeight: "700" }}>
              {count} {count === 1 ? "item" : "items"} ·{" "}
              {money(bag?.totalAmount ?? NaN)}
            </Text>
            <Text style={{ color: colors.background, fontSize: 11 }}>
              Final payable total at checkout
            </Text>
          </View>
          <Text style={{ color: colors.background, fontWeight: "700" }}>
            View bag →
          </Text>
        </Pressable>
      ) : null}
      <BottomTabBar {...props} />
    </View>
  );
}
export default function TabLayout() {
  const location = useAppSelector((x) => x.location);
  const userId = useAppSelector((x) => x.auth.user?.id);
  const bagCount = useAppSelector(
    (x) =>
      x.commerce.bag?.items.reduce((sum, line) => sum + line.quantity, 0) || 0,
  );
  const wishCount = useAppSelector((x) => x.commerce.wishlist.length);
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (userId) {
      void dispatch(fetchBag());
      void dispatch(fetchWishlist());
    }
  }, [dispatch, userId]);
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
        <Text
          style={[
            s.heading,
            { color: colors.gold, letterSpacing: 4, fontSize: 17 },
          ]}
        >
          TASTHA
        </Text>
        <Link href="/location" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change delivery location"
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text style={[s.small, { color: colors.gold }]}>DELIVER TO</Text>
            <Text numberOfLines={1} style={[s.text, { fontWeight: "600" }]}>
              {" "}
              {location?.label || "Choose your location"}{" "}
              {location?.pinCode || ""} ▾
            </Text>
          </Pressable>
        </Link>
        <Link href="/search" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search products"
            style={[s.pill, { minHeight: 44, justifyContent: "center" }]}
          >
            <Text style={s.muted}>⌕ Search products and collections</Text>
          </Pressable>
        </Link>
      </SafeAreaView>
      <Tabs
        tabBar={(props) => <StoreTabBar {...props} />}
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
            tabBarBadge: userId && wishCount ? wishCount : undefined,
            tabBarIcon: () => <Text style={s.text}>♡</Text>,
          }}
        />
        <Tabs.Screen
          name="bag"
          options={{
            title: "Bag",
            tabBarBadge: userId && bagCount ? bagCount : undefined,
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
