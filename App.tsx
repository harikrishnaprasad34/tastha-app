import React, { useEffect, useState } from "react";
import { BackHandler, Pressable, Text, View } from "react-native";
import { Provider } from "react-redux";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { readDeliveryLocation } from "./src/api/deliveryLocation";
import { session } from "./src/api/runtime";
import { store, useAppDispatch, useAppSelector } from "./src/state";
import { actions } from "./src/state/store";
import { Home, Catalog, ProductDetail } from "./src/screens/Shop";
import {
  Account,
  Login,
  AddressForm,
  LocationPicker,
} from "./src/screens/Account";
import {
  Bag,
  Wishlist,
  Addresses,
  Orders,
  OrderDetail,
  Checkout,
  AIAvailability,
} from "./src/screens/Commerce";
import { colors } from "./src/config";
import { ErrorBox, Loading, styles as s } from "./src/components/ui";
class Boundary extends React.Component<
  React.PropsWithChildren,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <SafeAreaView style={s.screen}>
        <ErrorBox message="This screen could not load. Restart Tastha to retry." />
      </SafeAreaView>
    ) : (
      this.props.children
    );
  }
}
function Application() {
  const dispatch = useAppDispatch();
  const { ready, error } = useAppSelector((x) => x.auth);
  const location = useAppSelector((x) => x.location);
  const [stack, setStack] = useState<{ name: string; id?: string }[]>([
    { name: "Home" },
  ]);
  const tabs = ["Home", "Shop", "Wishlist", "Bag", "Account"];
  const current = stack[stack.length - 1];
  const navigate = (name: string, id?: string) =>
    setStack((old) =>
      tabs.includes(name) ? [{ name, id }] : [...old, { name, id }],
    );
  useEffect(() => {
    let active = true;
    (async () => {
      let failure: string | undefined;
      try {
        await session.restore();
      } catch {
        failure = "Your saved sign-in could not be opened. Retry after unlocking the device.";
      }
      try {
        const saved = await readDeliveryLocation();
        if (active) {
          if (saved) dispatch(actions.setLocation(saved));
          else setStack([{ name: "Location" }]);
        }
      } catch {
        // Delivery preferences should never prevent shopping or account restoration.
        if (active) setStack([{ name: "Location" }]);
        failure = failure || "Delivery preferences could not be restored.";
      } finally {
        if (active) dispatch(actions.ready(failure));
      }
    })();
    return () => {
      active = false;
    };
  }, [dispatch]);
  useEffect(() => {
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      if (stack.length <= 1) return false;
      setStack((old) => old.slice(0, -1));
      return true;
    });
    return () => back.remove();
  }, [stack.length]);
  if (!ready) return <Loading />;
  let screen;
  switch (current.name) {
    case "Shop":
      screen = <Catalog navigate={navigate} category={current.id} />;
      break;
    case "Product":
      screen = <ProductDetail id={current.id!} navigate={navigate} />;
      break;
    case "Bag":
      screen = <Bag navigate={navigate} />;
      break;
    case "Wishlist":
      screen = <Wishlist navigate={navigate} />;
      break;
    case "Account":
      screen = <Account navigate={navigate} />;
      break;
    case "Login":
      screen = <Login navigate={navigate} />;
      break;
    case "Addresses":
      screen = <Addresses navigate={navigate} />;
      break;
    case "AddressForm":
      screen = <AddressForm navigate={navigate} />;
      break;
    case "Orders":
      screen = <Orders navigate={navigate} />;
      break;
    case "OrderDetail":
      screen = <OrderDetail id={current.id || ""} navigate={navigate} />;
      break;
    case "Checkout":
      screen = <Checkout navigate={navigate} />;
      break;
    case "Location":
      screen = <LocationPicker navigate={navigate} />;
      break;
    case "AI":
      screen = <AIAvailability />;
      break;
    default:
      screen = <Home navigate={navigate} />;
  }
  return (
    <SafeAreaView style={s.screen}>
      <StatusBar style="light" />
      <View style={s.header}>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Text style={[s.heading, { color: colors.gold, letterSpacing: 4 }]}>
            TASTHA
          </Text>
          {stack.length > 1 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setStack((old) => old.slice(0, -1))}
              style={s.pill}
            >
              <Text style={s.text}>Back</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change delivery location"
          onPress={() => navigate("Location")}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text numberOfLines={1} style={s.muted}>
            Deliver to: {location?.label || "Choose your location"}{" "}
            {location?.pinCode || ""} ▾
          </Text>
        </Pressable>
      </View>
      {error ? <ErrorBox message={error} /> : null}
      <View style={s.grow}>{screen}</View>
      <View style={s.tabs}>
        {tabs.map((name) => (
          <Pressable
            key={name}
            accessibilityRole="tab"
            accessibilityState={{ selected: current.name === name }}
            onPress={() => navigate(name)}
            style={s.tab}
          >
            <Text
              style={[s.small, current.name === name && { color: colors.gold }]}
            >
              {name}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <Boundary>
        <Provider store={store}>
          <Application />
        </Provider>
      </Boundary>
    </SafeAreaProvider>
  );
}
