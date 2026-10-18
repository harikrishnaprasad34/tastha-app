type QuoteValues = {
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  totalAmount: number;
  currency: "INR";
};

export function isValidCheckoutQuote(quote: unknown): quote is QuoteValues {
  if (!quote || typeof quote !== "object") return false;
  const fields = quote as Record<string, unknown>;
  if (
    fields.currency !== "INR" ||
    !["subtotal", "discount", "shippingFee", "tax", "totalAmount"].every(
      (key) =>
        typeof fields[key] === "number" &&
        Number.isFinite(fields[key]) &&
        fields[key] >= 0 &&
        Number.isSafeInteger(Math.round(fields[key] * 100)) &&
        Math.abs(fields[key] * 100 - Math.round(fields[key] * 100)) < 1e-6,
    )
  )
    return false;
  const { subtotal, discount, shippingFee, tax, totalAmount } =
    quote as QuoteValues;
  return (
    discount <= subtotal &&
    Math.round(totalAmount * 100) ===
      Math.round((subtotal - discount + shippingFee + tax) * 100)
  );
}
