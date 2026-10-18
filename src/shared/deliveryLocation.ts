import type { Address, DeliveryLocation } from "../models";

export interface NativePlace {
  name?: string | null;
  street?: string | null;
  streetNumber?: string | null;
  district?: string | null;
  subregion?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  formattedAddress?: string | null;
}
export interface ServerPlace {
  pinCode?: string;
  pincode?: string;
  postcode?: string;
  displayAddress?: string;
  address?: string;
  city?: string;
}
export const validPinCode = (value: unknown): value is string =>
  typeof value === "string" && /^[1-9]\d{5}$/.test(value);

const trimmed = (value: string | null | undefined) =>
  typeof value === "string" ? value.trim() : "";

export function describeDetectedPlace(
  native: NativePlace | null,
  server: ServerPlace | null,
): { label: string; pinCode: string } {
  const street = [trimmed(native?.streetNumber), trimmed(native?.street)]
    .filter(Boolean)
    .join(" ");
  const locality = trimmed(native?.district) || trimmed(native?.subregion);
  const city = trimmed(native?.city) || trimmed(native?.region);
  const detailed = [street || trimmed(native?.name), locality, city]
    .filter((part, index, parts) => part && parts.indexOf(part) === index)
    .join(", ");
  const serverLabel =
    trimmed(server?.displayAddress) ||
    trimmed(server?.address) ||
    trimmed(server?.city);
  const label =
    (street ? detailed : serverLabel || detailed) ||
    trimmed(native?.formattedAddress);
  const pinCode =
    [native?.postalCode, server?.pinCode, server?.pincode, server?.postcode]
      .find(validPinCode) || "";
  return { label, pinCode };
}

export function locationFromAddress(address: Address): DeliveryLocation {
  const label = [address.streetAddress, address.apartment, address.city]
    .map((part) => trimmed(part))
    .filter(Boolean)
    .join(", ");
  return {
    label,
    pinCode: address.pinCode,
    ...(typeof address.lat === "number" &&
    typeof address.lng === "number" &&
    Number.isFinite(address.lat) &&
    Number.isFinite(address.lng)
      ? { lat: address.lat, lng: address.lng }
      : {}),
  };
}

export function parseSavedLocation(raw: string | null): DeliveryLocation | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const data = value as Record<string, unknown>;
    if (
      typeof data.label !== "string" ||
      !data.label.trim() ||
      !validPinCode(data.pinCode)
    )
      return null;
    const coordinates =
      typeof data.lat === "number" &&
      typeof data.lng === "number" &&
      Number.isFinite(data.lat) &&
      Number.isFinite(data.lng) &&
      Math.abs(data.lat) <= 90 &&
      Math.abs(data.lng) <= 180
        ? { lat: data.lat, lng: data.lng }
        : {};
    return {
      label: data.label.trim().slice(0, 180),
      pinCode: data.pinCode,
      ...coordinates,
      ...(typeof data.accuracy === "number" &&
      Number.isFinite(data.accuracy) &&
      data.accuracy >= 0
        ? { accuracy: data.accuracy }
        : {}),
    };
  } catch {
    return null;
  }
}
