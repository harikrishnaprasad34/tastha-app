import { describe, expect, it } from "vitest";
import {
  readPublicSettings,
  supportLinks,
  displayStorePhone,
  storeAddress,
} from "../src/shared/storefrontSettings";
import { buildStore, fetchPublicSettings } from "../src/state/store";
import { createApiClient } from "../src/api/client";
import { createSessionManager } from "../src/api/session";
import { routeFor, storeLink } from "../src/navigation/routes";
const settings = {
  storeName: "Tastha",
  legalName: "Configured merchant",
  address: "Road 2, Hyderabad",
  city: "Hyderabad",
  state: "Telangana",
  pinCode: "500034",
  email: "help@example.test",
  phone: "917893592039",
};
describe("configured customer contacts", () => {
  it("exposes only public fields and rejects partial settings", () => {
    expect(
      readPublicSettings({ ...settings, accountNumber: "private" }),
    ).toEqual(settings);
    expect(() =>
      readPublicSettings({ email: "partial@example.test" }),
    ).toThrow();
    expect(storeAddress(settings)).toBe("Road 2, Hyderabad, Telangana, 500034");
    expect(displayStorePhone(settings.phone)).toBe("+91 78935 92039");
    expect(supportLinks(settings)).toEqual({
      email: "mailto:help@example.test",
      phone: "tel:+917893592039",
    });
    expect(
      supportLinks({
        ...settings,
        email: "javascript:bad",
        phone: "javascript:bad",
      }),
    ).toEqual({ email: "", phone: "" });
  });
  it("coalesces simultaneous loads and removes old contacts when refresh fails", async () => {
    const session = createSessionManager({
      get: async () => null,
      set: async () => {},
      remove: async () => {},
    });
    let count = 0;
    const api = createApiClient(
      "https://example.test/api/v1",
      session,
      async () => {
        count++;
        return new Response(
          JSON.stringify(
            count === 1
              ? { success: true, settings }
              : { success: true, settings: { email: "incomplete" } },
          ),
          { status: 200 },
        );
      },
    );
    const store = buildStore({ api, session });
    await Promise.all([
      store.dispatch(fetchPublicSettings()),
      store.dispatch(fetchPublicSettings()),
    ]);
    expect(count).toBe(1);
    expect(store.getState().publicSettings.data).toEqual(settings);
    await store.dispatch(fetchPublicSettings());
    expect(store.getState().publicSettings.data).toBeNull();
    expect(store.getState().publicSettings.error).toBeTruthy();
  });
  it("opens contact from native menus and configured website links", () => {
    expect(routeFor("Contact")).toBe("/contact");
    expect(storeLink("/contact")).toBe("/contact");
    expect(storeLink("//evil.example/contact")).toBe("/(tabs)/shop");
  });
});
