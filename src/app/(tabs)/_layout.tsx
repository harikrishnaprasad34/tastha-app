import Ionicons from "@expo/vector-icons/Ionicons";
import { deliveryHeader } from "../../shared/deliveryLocation";
import {
  Tabs,
  BottomTabBar,
  type BottomTabBarProps,
} from "expo-router/js-tabs";
import { money } from "../../shared/catalog";
import React, { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
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
  const insets = useSafeAreaInsets();
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
  const address = deliveryHeader(location);
  return (
    <View style={s.screen}>
      <SafeAreaView edges={["top", "left", "right"]} style={s.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: colors.elevated,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="location" size={21} color={colors.gold} />
          </View>
          <Link href="/location" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change delivery location"
              style={{
                flex: 1,
                minHeight: 44,
                justifyContent: "center",
                gap: 2,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.text,
                    fontWeight: "700",
                    fontSize: 15,
                    flexShrink: 1,
                  }}
                >
                  {address.title}
                </Text>
                <Ionicons name="chevron-down" size={15} color={colors.gold} />
              </View>
              <Text numberOfLines={1} style={s.small}>
                {address.subtitle}
              </Text>
            </Pressable>
          </Link>
          <Text
            style={{
              color: colors.gold,
              fontWeight: "800",
              fontSize: 12,
              letterSpacing: 2,
            }}
          >
            TASTHA
          </Text>
        </View>
        <Link href="/search" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search products"
            style={{
              minHeight: 46,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingHorizontal: 12,
              borderRadius: 12,
              backgroundColor: colors.elevated,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="search-outline" size={20} color={colors.gold} />
            <Text style={[s.muted, { flex: 1 }]}>
              Search fashion, brands & more
            </Text>
            <Ionicons name="options-outline" size={19} color={colors.muted} />
          </Pressable>
        </Link>
      </SafeAreaView>
      <Tabs
        tabBar={(props) => <StoreTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
          tabBarItemStyle: { paddingVertical: 4 },
          tabBarActiveTintColor: colors.gold,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            height: 64 + insets.bottom,
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
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={22}
                color={focused ? colors.gold : colors.muted}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="shop"
          options={{
            title: "Shop",
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? "grid" : "grid-outline"}
                size={22}
                color={focused ? colors.gold : colors.muted}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="wishlist"
          options={{
            title: "Wishlist",
            tabBarBadge: userId && wishCount ? wishCount : undefined,
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? "heart" : "heart-outline"}
                size={22}
                color={focused ? colors.gold : colors.muted}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="bag"
          options={{
            title: "Bag",
            tabBarBadge: userId && bagCount ? bagCount : undefined,
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? "bag" : "bag-outline"}
                size={22}
                color={focused ? colors.gold : colors.muted}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: "Account",
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={22}
                color={focused ? colors.gold : colors.muted}
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
