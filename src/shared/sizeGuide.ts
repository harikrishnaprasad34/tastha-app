import type { Product } from "../models";
export function productSizeGuide(product: Product, unit: "in" | "cm") {
  const chart = product.sizeChart;
  const sizes = new Set(
    (product.variants || [])
      .map((v) => v.size?.trim().toLowerCase())
      .filter(Boolean),
  );
  const factor =
    chart?.unit === "cm" && unit === "in"
      ? 1 / 2.54
      : chart?.unit === "in" && unit === "cm"
        ? 2.54
        : 1;
  const rows: Record<string, string | number>[] = [];
  for (const value of Array.isArray(chart?.measurements)
    ? chart.measurements
    : []) {
    if (!value || typeof value !== "object") continue;
    const row = value as Record<string, unknown>;
    if (
      typeof row.size !== "string" ||
      !sizes.has(row.size.trim().toLowerCase())
    )
      continue;
    const result: Record<string, string | number> = { size: row.size };
    for (const [key, measurement] of Object.entries(row)) {
      if (
        key !== "size" &&
        typeof measurement === "number" &&
        Number.isFinite(measurement) &&
        measurement > 0
      )
        result[key] = Math.round(measurement * factor * 10) / 10;
    }
    if (Object.keys(result).length > 1) rows.push(result);
  }
  return {
    rows,
    unit: chart?.unit === "in" || chart?.unit === "cm" ? unit : "",
    notes: typeof chart?.notes === "string" ? chart.notes : "",
    measurementType:
      chart?.measurementType === "BODY"
        ? "Body measurements"
        : chart?.measurementType === "GARMENT"
          ? "Garment measurements"
          : "Product measurements",
  };
}
