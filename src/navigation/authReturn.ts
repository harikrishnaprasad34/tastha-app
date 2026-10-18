/** Only app-owned destinations may survive authentication. */
export function safeReturnTo(value: unknown): string {
  if (typeof value !== "string" || /[\\\s\x00-\x1f]/.test(value))
    return "/(tabs)";
  const destination = /^\/(?:shop|bag|wishlist|account)(?:\?|$)/.test(value)
    ? "/(tabs)" + value
    : value;
  const path = destination.split("?")[0];
  return /^(?:\/\(tabs\)(?:\/(?:shop|bag|wishlist|account))?|\/(?:checkout|addresses|address-form|edit-profile|orders|saved-looks|security|payment-status|review)|\/order\/[^/?#]+(?:\/tracking)?|\/product\/[^/?#]+)$/.test(
    path,
  )
    ? destination
    : "/(tabs)";
}
export function loginPath(returnTo: unknown) {
  return "/login?returnTo=" + encodeURIComponent(safeReturnTo(returnTo));
}
