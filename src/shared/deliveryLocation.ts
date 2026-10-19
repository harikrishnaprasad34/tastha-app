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
  building?: string;
  placeName?: string;
  houseNumber?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  district?: string;
  compactLocation?: string;
  formattedAddress?: string;
  postalCode?: string;
  pinCode?: string;
  pincode?: string;
  postcode?: string;
  displayAddress?: string;
  address?: string;
  city?: string;
}
export const validPinCode = (value: unknown): value is string =>
  typeof value === "string" && /^[1-9]\d{5}$/.test(value);

const uniqueParts = (values: (string | null | undefined)[]) => {
  const seen = new Set<string>();
  return values
    .map((value) => trimmed(value))
    .filter((value) => {
      const key = value.toLowerCase();
      if (!value || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const trimmed = (value: string | null | undefined) =>
  typeof value === "string" ? value.trim() : "";

export function describeDetectedPlace(
  native: NativePlace | null,
  server: ServerPlace | null,
): { label: string; pinCode: string } {
  // Only use names actually supplied by the geocoder. A nearby POI is not
  // proof of a building; the customer must confirm the suggested address.
  const placeholder =
    /^(?:pinpoint location|selected location|selected map pin)/i.test(
      trimmed(server?.displayAddress) ||
        trimmed(server?.formattedAddress) ||
        trimmed(server?.address),
    );
  const trustworthyServer = placeholder ? null : server;
  const street =
    uniqueParts([native?.streetNumber, native?.street]).join(" ") ||
    uniqueParts([trustworthyServer?.houseNumber, trustworthyServer?.road]).join(
      " ",
    );
  const nativeName = trimmed(native?.name);
  const building =
    trimmed(trustworthyServer?.building) ||
    (nativeName &&
    ![
      native?.street,
      native?.city,
      native?.region,
      native?.district,
      native?.subregion,
      native?.postalCode,
      native?.streetNumber,
      street,
    ].some(
      (part) => trimmed(part).toLowerCase() === nativeName.toLowerCase(),
    ) &&
    !/^[\d\s.,-]+$/.test(nativeName)
      ? nativeName
      : "");
  const detailed = uniqueParts([
    building,
    street,
    native?.district ||
      trustworthyServer?.neighbourhood ||
      trustworthyServer?.suburb ||
      native?.subregion,
    native?.city || trustworthyServer?.city || native?.region,
  ]).join(", ");
  const label =
    detailed ||
    trimmed(trustworthyServer?.displayAddress) ||
    trimmed(trustworthyServer?.formattedAddress) ||
    trimmed(trustworthyServer?.address) ||
    trimmed(native?.formattedAddress);
  const pinCode =
    [
      native?.postalCode,
      trustworthyServer?.pinCode,
      trustworthyServer?.pincode,
      trustworthyServer?.postcode,
      trustworthyServer?.postalCode,
    ].find(validPinCode) || "";
  return { label, pinCode };
}

export function locationFromAddress(address: Address): DeliveryLocation {
  const label = [address.apartment, address.streetAddress, address.city]
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

export function parseSavedLocation(
  raw: string | null,
): DeliveryLocation | null {
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
export interface SearchedPlace extends ServerPlace {
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
  const structured = uniqueParts([
    place.building || place.placeName,
    place.road,
    place.neighbourhood || place.suburb,
    place.city,
  ]).join(", ");
  const label =
    structured ||
    trimmed(place.displayAddress) ||
    trimmed(place.formattedAddress) ||
    trimmed(place.compactLocation) ||
    trimmed(place.placeName);
  if (!label || /^(?:pinpoint location|selected location)/i.test(label))
    return null;
  const pinCode =
    [place.pincode, place.postalCode, place.pinCode].find(validPinCode) || "";
  const lat = place.lat ?? place.latitude;
  const lng = place.lng ?? place.longitude;
  const validCoordinates =
    typeof lat === "number" &&
    Number.isFinite(lat) &&
    typeof lng === "number" &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180;
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

/** Account-owned address details may not be restored into another shopping session. */
export function restoreDeliveryForAccount(
  raw: string | null,
  accountId?: string,
): DeliveryLocation | null {
  const location = parseSavedLocation(raw);
  if (!location || !raw) return location;
  const owner = JSON.parse(raw).accountId;
  if (
    (owner && owner !== accountId) ||
    (location.addressId && (!owner || owner !== accountId))
  )
    return publicLocationAfterSignOut(location);
  return location;
}

/** Compact two-line header; preserve the complete address for confirmation. */
export function deliveryHeader(location: DeliveryLocation | null) {
  if (!location)
    return {
      title: "Choose delivery location",
      subtitle: "Set your area for available styles",
    };
  const parts = uniqueParts(location.label.split(","));
  return {
    title: parts[0] || "Delivery location",
    subtitle:
      uniqueParts([
        ...parts
          .slice(1, 3)
          .filter(
            (part) => !/^(?:India|Telangana|Andhra Pradesh)$/i.test(part),
          ),
        location.pinCode,
      ]).join(" · ") || "Tap to change delivery location",
  };
}
