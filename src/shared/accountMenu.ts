import type { IconName } from "../components/Icon";
export interface AccountOption {
  title: string;
  detail?: string;
  icon: IconName;
  route: string;
  id?: string;
}
export function accountSections(
  signedIn: boolean,
  deliveryLabel?: string,
): { title: string; items: AccountOption[] }[] {
  return [
    ...(signedIn
      ? [
          {
            title: "YOUR DETAILS",
            items: [
              {
                title: "Profile details",
                detail: "Name, mobile number & preferences",
                icon: "person" as const,
                route: "EditProfile",
              },
              {
                title: "Saved addresses",
                detail: "Add or manage delivery addresses",
                icon: "location" as const,
                route: "Addresses",
              },
              {
                title: "Password & security",
                detail: "Manage your account security",
                icon: "shield" as const,
                route: "Security",
              },
            ],
          },
        ]
      : []),
    {
      title: "YOUR SHOPPING",
      items: [
        {
          title: "Delivery location",
          detail: deliveryLabel || "Choose your delivery area",
          icon: "location",
          route: "Location",
        },
        ...(signedIn
          ? [
              {
                title: "Saved looks",
                detail: "Outfits you have saved",
                icon: "sparkle" as const,
                route: "SavedLooks",
              },
            ]
          : []),
        { title: "Explore collections", icon: "shirt", route: "Collections" },
        { title: "Style studio", icon: "sparkle", route: "AI" },
      ],
    },
    {
      title: "HELP & SUPPORT",
      items: [
        {
          title: "Contact us",
          detail: "Get help with your shopping",
          icon: "contact",
          route: "Contact",
        },
        { title: "Help & FAQs", icon: "help", route: "Help", id: "faq" },
        {
          title: "Shipping & delivery",
          icon: "location",
          route: "Help",
          id: "shipping",
        },
        {
          title: "Returns & exchanges",
          icon: "returns",
          route: "Help",
          id: "returns",
        },
      ],
    },
    {
      title: "ABOUT TASTHA",
      items: [
        {
          title: "Privacy policy",
          icon: "shield",
          route: "Help",
          id: "privacy",
        },
        {
          title: "Terms & conditions",
          icon: "help",
          route: "Help",
          id: "terms",
        },
      ],
    },
  ];
}
