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
  // The backend's geocoding fallback uses a generic "Pinpoint Location"
  // label and a fixed example PIN. Never accept it as a genuine delivery PIN.
  const placeholder = /^(?:pinpoint location|selected location)/i.test(
    trimmed(server?.displayAddress) || trimmed(server?.address),
  );
  const trustworthyServer = placeholder ? null : server;
  const serverLabel =
    trimmed(trustworthyServer?.displayAddress) ||
    trimmed(trustworthyServer?.address) ||
    trimmed(trustworthyServer?.city);
  const label =
    (street ? detailed : serverLabel || detailed) ||
    trimmed(native?.formattedAddress);
  const pinCode =
    [native?.postalCode, trustworthyServer?.pinCode, trustworthyServer?.pincode, trustworthyServer?.postcode]
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
    addressId: address._id,
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
      ...(typeof data.addressId === "string" &&
      data.addressId.length > 0 &&
      data.addressId.length <= 200
        ? { addressId: data.addressId }
        : {}),
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

/** A suggestion is offered to the customer for review, never auto-confirmed. */
export interface SearchedPlace {
  placeId?: string;
  placeName?: string;
  formattedAddress?: string;
  displayAddress?: string;
  compactLocation?: string;
  city?: string;
  pincode?: string;
  postalCode?: string;
  pinCode?: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
}
export function locationFromSearchResult(
  place: SearchedPlace,
): DeliveryLocation | null {
  if (!place || typeof place !== "object") return null;
  const label =
    trimmed(place.displayAddress) ||
    trimmed(place.formattedAddress) ||
    trimmed(place.compactLocation) ||
    trimmed(place.placeName);
  if (
    !label ||
    /^(?:pinpoint location|selected location)/i.test(label)
  ) return null;
  const pinCode =
    [place.pincode, place.postalCode, place.pinCode].find(validPinCode) || "";
  const lat = place.lat ?? place.latitude;
  const lng = place.lng ?? place.longitude;
  const validCoordinates =
    typeof lat === "number" && Number.isFinite(lat) &&
    typeof lng === "number" && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  return {
    label: label.slice(0, 180),
    pinCode,
    ...(validCoordinates ? { lat, lng } : {}),
  };
}

/** Keep a general delivery area, not account-owned street and address IDs, on sign-out. */
export function publicLocationAfterSignOut(
  current: DeliveryLocation | null,
): DeliveryLocation | null {
  if (!current || !validPinCode(current.pinCode)) return null;
  return {
    label: "Delivery area " + current.pinCode,
    pinCode: current.pinCode,
  };
}
