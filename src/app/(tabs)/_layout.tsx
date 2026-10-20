import { Icon } from "../../components/Icon";
import {
  Tabs,
  BottomTabBar,
  type BottomTabBarProps,
} from "expo-router/js-tabs";
import { money } from "../../shared/catalog";
import React, { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import { Link, useRouter, usePathname } from "expo-router";
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
            paddingHorizontal: 14,
            paddingVertical: 10,
            minHeight: 48,
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
              Bag subtotal · total at checkout
            </Text>
          </View>
          <Text style={{ color: colors.background, fontWeight: "700" }}>
            View bag
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
  const pathname = usePathname();
  const compact = /\/(?:account|bag)$/.test(pathname);
  const prompted = useRef(false);
  useEffect(() => {
    if (!prompted.current) {
      prompted.current = true;
      if (!location) router.push("/location");
    }
  }, [location, router]);
  return (
    <View style={s.screen}>
      <SafeAreaView
        edges={["top", "left", "right"]}
        style={[s.header, { paddingHorizontal: 16, paddingVertical: 6 }]}
      >
        {compact ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                color: colors.gold,
                fontSize: 14,
                letterSpacing: 3,
                fontWeight: "700",
              }}
            >
              TASTHA
            </Text>
            <Link href="/search" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Search products"
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="search" size={21} color={colors.text} />
              </Pressable>
            </Link>
          </View>
        ) : (
          <>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Icon name="location" size={21} />
              <Link href="/location" asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change delivery location"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 44,
                    justifyContent: "center",
                    gap: 3,
                  }}
                >
                  <Text
                    style={{
                      color: colors.gold,
                      fontSize: 10,
                      letterSpacing: 1,
                      fontWeight: "700",
                    }}
                  >
                    TASTHA · DELIVER TO
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[s.text, { fontWeight: "600" }]}
                  >
                    {location?.label || "Choose your location"}
                    {location?.pinCode &&
                    !location.label.includes(location.pinCode)
                      ? " " + location.pinCode
                      : ""}{" "}
                    ▾
                  </Text>
                </Pressable>
              </Link>
              <Link href="/(tabs)/account" asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open account"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: colors.panel,
                  }}
                >
                  <Icon name="person" size={21} />
                </Pressable>
              </Link>
            </View>
            <Link href="/search" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Search products"
                style={{
                  minHeight: 44,
                  backgroundColor: colors.elevated,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  gap: 10,
                }}
              >
                <Icon name="search" size={18} color={colors.muted} />
                <Text numberOfLines={1} style={[s.muted, { flex: 1 }]}>
                  Search shirts, outfits and more
                </Text>
              </Pressable>
            </Link>
          </>
        )}
      </SafeAreaView>
      <Tabs
        tabBar={(props) => <StoreTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.gold,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: { fontSize: 10, fontWeight: "500" },
          tabBarBadgeStyle: {
            backgroundColor: colors.gold,
            color: colors.background,
            fontSize: 10,
          },
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
            tabBarIcon: ({ color, size }) => (
              <Icon name="home" color={color} size={Math.min(size, 22)} />
            ),
          }}
        />
        <Tabs.Screen
          name="shop"
          options={{
            title: "Shop",
            tabBarIcon: ({ color, size }) => (
              <Icon name="shop" color={color} size={Math.min(size, 22)} />
            ),
          }}
        />
        <Tabs.Screen
          name="wishlist"
          options={{
            title: "Wishlist",
            tabBarBadge: userId && wishCount ? wishCount : undefined,
            tabBarIcon: ({ color, size }) => (
              <Icon name="heart" color={color} size={Math.min(size, 22)} />
            ),
          }}
        />
        <Tabs.Screen
          name="bag"
          options={{
            title: "Bag",
            tabBarBadge: userId && bagCount ? bagCount : undefined,
            tabBarIcon: ({ color, size }) => (
              <Icon name="bag" color={color} size={Math.min(size, 22)} />
            ),
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: "Account",
            tabBarIcon: ({ color, size }) => (
              <Icon name="person" color={color} size={Math.min(size, 22)} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
