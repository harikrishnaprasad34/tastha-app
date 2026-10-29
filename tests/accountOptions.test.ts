import React from "react";
import { createRequire } from "node:module";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Account } from "../src/screens/Account";
import TabLayout from "../src/app/(tabs)/_layout";
import { accountSections } from "../src/shared/accountMenu";
// This native project includes the React DOM runtime, but not its separate types.
const { renderToStaticMarkup } = createRequire(import.meta.url)(
  "react-dom/server",
) as {
  renderToStaticMarkup(element: React.ReactElement): string;
};

const fixture = vi.hoisted(() => ({
  buttons: [] as { accessibilityLabel?: string; onPress?: () => void }[],
  user: {
    id: "u1",
    role: "CUSTOMER",
    fullName: "Hari",
    email: "hari@example.test",
  } as { id: string; role: string; fullName: string; email: string } | null,
  width: 393,
  fontScale: 1,
  push: vi.fn(),
  alert: vi.fn(),
}));
vi.mock("react-native", () => ({
  View: ({ children }: React.PropsWithChildren) =>
    React.createElement("div", null, children),
  Text: ({ children }: React.PropsWithChildren) =>
    React.createElement("span", null, children),
  ScrollView: ({ children }: React.PropsWithChildren) =>
    React.createElement("div", null, children),
  Pressable: (
    props: React.PropsWithChildren<{
      accessibilityLabel?: string;
      onPress?: () => void;
    }>,
  ) => {
    fixture.buttons.push(props);
    return React.createElement("button", null, props.children);
  },
  Alert: { alert: fixture.alert },
  useWindowDimensions: () => ({
    width: fixture.width,
    fontScale: fixture.fontScale,
  }),
}));
vi.mock("expo-router", () => ({
  useFocusEffect: () => {},
  useRouter: () => ({ push: fixture.push }),
  usePathname: () => "/",
  Link: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactElement<{ onPress?: () => void }>;
  }) => React.cloneElement(children, { onPress: () => fixture.push(href) }),
}));
vi.mock("expo-router/js-tabs", () => {
  const Tabs = Object.assign(
    ({ children }: React.PropsWithChildren) =>
      React.createElement("div", null, children),
    { Screen: () => null },
  );
  return { Tabs, BottomTabBar: () => null };
});
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: React.PropsWithChildren) =>
    React.createElement("div", null, children),
}));
vi.mock("expo-location", () => ({}));
vi.mock("../src/components/DeliveryMap", () => ({ DeliveryMap: () => null }));
vi.mock("../src/components/Icon", () => ({ Icon: () => null }));
vi.mock("../src/components/Brand", () => ({ Brand: () => null }));
vi.mock("../src/components/ui", () => ({
  styles: {},
  Button: ({ title, onPress }: { title: string; onPress: () => void }) => {
    fixture.buttons.push({ accessibilityLabel: title, onPress });
    return React.createElement("button", null, title);
  },
  ErrorBox: () => null,
  Field: () => null,
}));
vi.mock("../src/api/runtime", () => ({ api: {}, session: {} }));
vi.mock("../src/api/deliveryLocation", () => ({
  saveDeliveryLocation: vi.fn(),
}));
vi.mock("../src/state", () => ({
  useAppDispatch: () => vi.fn(),
  useAppSelector: (select: (state: unknown) => unknown) =>
    select({
      auth: { user: fixture.user },
      location: { label: "Hyderabad", pinCode: "500001" },
      commerce: { bag: null, wishlist: [] },
      ui: { locationPrompted: true },
    }),
}));
function click(label: string) {
  const button = fixture.buttons.find(
    (item) => item.accessibilityLabel === label,
  );
  expect(button, label).toBeDefined();
  expect(button?.onPress, label).toBeTypeOf("function");
  button!.onPress!();
}
beforeEach(() => {
  fixture.buttons = [];
  fixture.user = {
    id: "u1",
    role: "CUSTOMER",
    fullName: "Hari",
    email: "hari@example.test",
  };
  fixture.width = 393;
  fixture.fontScale = 1;
  vi.clearAllMocks();
});
describe("profile icon and account options", () => {
  it("opens the account route from the storefront profile icon", () => {
    renderToStaticMarkup(React.createElement(TabLayout));
    click("Open account");
    expect(fixture.push).toHaveBeenCalledWith("/(tabs)/account");
  });
  it("opens profile editing from the identity card", () => {
    const navigate = vi.fn();
    renderToStaticMarkup(React.createElement(Account, { navigate }));
    click("Edit your profile");
    expect(navigate).toHaveBeenCalledWith("EditProfile");
  });
  it("connects every rendered signed-in menu row", () => {
    const navigate = vi.fn();
    renderToStaticMarkup(React.createElement(Account, { navigate }));
    for (const section of accountSections(true, "Hyderabad"))
      for (const item of section.items) {
        click(item.detail ? `${item.title}. ${item.detail}` : item.title);
        expect(navigate).toHaveBeenLastCalledWith(item.route, item.id);
      }
  });
  it("opens Orders, Wishlist and Support from quick actions", () => {
    const navigate = vi.fn();
    renderToStaticMarkup(React.createElement(Account, { navigate }));
    click("Orders. View & track");
    expect(navigate).toHaveBeenLastCalledWith("Orders", undefined);
    click("Wishlist. Your favourites");
    expect(navigate).toHaveBeenLastCalledWith("Wishlist", undefined);
    click("Support. We're here to help");
    expect(navigate).toHaveBeenLastCalledWith("Help", "faq");
  });
  it("requires sign-in for guest orders and wishlist while keeping support available", () => {
    fixture.user = null;
    const navigate = vi.fn();
    renderToStaticMarkup(React.createElement(Account, { navigate }));
    click("Orders. View & track");
    expect(navigate).toHaveBeenLastCalledWith("Login", "/orders");
    click("Wishlist. Your favourites");
    expect(navigate).toHaveBeenLastCalledWith("Login", "/(tabs)/wishlist");
    click("Support. We're here to help");
    expect(navigate).toHaveBeenLastCalledWith("Help", "faq");
    expect(
      fixture.buttons.some((item) => item.accessibilityLabel === "Sign out"),
    ).toBe(false);
  });
  it("asks for confirmation before signing out", () => {
    renderToStaticMarkup(React.createElement(Account, { navigate: vi.fn() }));
    click("Sign out");
    expect(fixture.alert).toHaveBeenCalledWith(
      "Sign out of Tastha?",
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ style: "cancel" }),
        expect.objectContaining({ style: "destructive" }),
      ]),
    );
  });
  it.each([
    [320, 1],
    [393, 1.8],
    [1024, 1],
  ])(
    "keeps the full options list at width %s and font scale %s",
    (width, fontScale) => {
      fixture.width = width;
      fixture.fontScale = fontScale;
      const html = renderToStaticMarkup(
        React.createElement(Account, { navigate: vi.fn() }),
      );
      for (const title of [
        "YOUR DETAILS",
        "YOUR SHOPPING",
        "HELP & SUPPORT",
        "ABOUT TASTHA",
        "Profile details",
        "Sign out",
      ])
        expect(html).toContain(title.replaceAll("&", "&amp;"));
    },
  );
});
