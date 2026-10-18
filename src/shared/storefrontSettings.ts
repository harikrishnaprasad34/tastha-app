export const publicStoreFields = [
  "storeName",
  "legalName",
  "address",
  "city",
  "state",
  "pinCode",
  "email",
  "phone",
] as const;
export type PublicStoreSettings = Record<
  (typeof publicStoreFields)[number],
  string
>;
export function readPublicSettings(value: unknown): PublicStoreSettings {
  if (
    !value ||
    typeof value !== "object" ||
    publicStoreFields.some(
      (key) => typeof (value as Record<string, unknown>)[key] !== "string",
    )
  )
    throw Error("Contact details are temporarily unavailable.");
  return Object.fromEntries(
    publicStoreFields.map((key) => [
      key,
      (value as Record<string, string>)[key].trim(),
    ]),
  ) as PublicStoreSettings;
}
export function displayStorePhone(phone: string) {
  const value = phone.trim();
  if (/^\+?91\d{10}$/.test(value)) {
    const digits = value.replace(/^\+/, "");
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (/^\d{10}$/.test(value)) return `${value.slice(0, 5)} ${value.slice(5)}`;
  return value;
}
export function storeAddress(settings: PublicStoreSettings) {
  return [
    settings.address,
    ...[settings.city, settings.state, settings.pinCode].filter(
      (value) =>
        value && !settings.address.toLowerCase().includes(value.toLowerCase()),
    ),
  ]
    .filter(Boolean)
    .join(", ");
}
export function supportLinks(settings: PublicStoreSettings) {
  const phone = settings.phone.replace(/[\s()-]/g, "");
  const digits = phone.replace(/^\+/, "");
  const normalized = /^\d{10}$/.test(digits) ? "91" + digits : digits;
  return {
    email: /^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/.test(settings.email)
      ? "mailto:" + encodeURIComponent(settings.email).replace("%40", "@")
      : "",
    phone: /^\+?\d{10,15}$/.test(phone) ? "tel:+" + normalized : "",
  };
}
