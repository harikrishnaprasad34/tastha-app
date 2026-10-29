import { describe, expect, it } from "vitest";
import { profileSchema, profileFormValues } from "../src/validation/profile";
import { accountSections } from "../src/shared/accountMenu";
import { routeFor } from "../src/navigation/routes";
const values = {
  fullName: "Hari Prasad",
  phone: "9876543210",
  stylePreference: "Formal",
  sizePreference: "XL",
};
describe("profile validation", () => {
  it.each(["9876543210", "+919876543210", "+91 9876543210"])(
    "accepts mobile number %s",
    async (phone) => {
      await expect(
        profileSchema.validate({ ...values, phone }),
      ).resolves.toBeTruthy();
    },
  );
  it.each([
    { fullName: " " },
    { fullName: "a" },
    { phone: "123" },
    { phone: "1234567890" },
    { sizePreference: "XXXL" },
    { stylePreference: "unknown" },
  ])("rejects invalid profile %j", async (change) => {
    await expect(
      profileSchema.validate({ ...values, ...change }),
    ).rejects.toThrow();
  });
  it("uses saved preferences and canonical saved values for the form", () => {
    expect(profileFormValues({ id: "u", role: "CUSTOMER", ...values })).toEqual(
      values,
    );
  });
});
describe("account menu screens", () => {
  it("connects every guest and customer option to an existing app route", () => {
    for (const signedIn of [false, true])
      for (const section of accountSections(signedIn))
        for (const item of section.items)
          expect(routeFor(item.route, item.id)).toMatch(/^\//);
  });
  it("keeps personal account screens behind sign-in", () => {
    const routes = accountSections(false).flatMap((section) =>
      section.items.map((item) => item.route),
    );
    for (const route of ["EditProfile", "Addresses", "Security", "SavedLooks"])
      expect(routes).not.toContain(route);
  });
  it("provides separate returns, shipping and legal screens", () => {
    const paths = accountSections(true).flatMap((section) =>
      section.items.map((item) => routeFor(item.route, item.id)),
    );
    expect(paths).toEqual(
      expect.arrayContaining([
        "/help/returns",
        "/help/shipping",
        "/help/privacy",
        "/help/terms",
        "/edit-profile",
        "/addresses",
        "/security",
      ]),
    );
  });
});
