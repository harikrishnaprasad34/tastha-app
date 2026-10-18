export type SizeSystemType =
  "ALPHA_TOPS" | "WAIST_BOTTOMS" | "FOOTWEAR" | "ACCESSORIES";

export interface SizeChartColumn {
  key: string;
  label: string;
  unit?: "in" | "cm" | "";
}

export interface SizeChartRow {
  size: string;
  [key: string]: string | number;
}

export interface CategorySizeConfig {
  categoryName: string;
  sizeType: SizeSystemType;
  label: string;
  description: string;
  supportedSizes: string[];
  columns: SizeChartColumn[];
  defaultChart: SizeChartRow[];
}

export const ALPHA_TOP_SIZES = ["S", "M", "L", "XL", "XXL"] as const;
export const WAIST_BOTTOM_SIZES = [
  "28",
  "30",
  "32",
  "34",
  "36",
  "38",
  "40",
  "42",
] as const;
export const FOOTWEAR_SIZES = [
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
] as const;
export const ACCESSORY_SIZES = ["One Size"] as const;

export const CATEGORY_SIZE_CONFIGS: Record<SizeSystemType, CategorySizeConfig> =
  {
    ALPHA_TOPS: {
      categoryName: "Apparel Tops & Outerwear",
      sizeType: "ALPHA_TOPS",
      label: "Standard Alpha Sizing (S – XXL)",
      description:
        "Upper-body apparel chest, shoulder, length, and sleeve measurements.",
      supportedSizes: [...ALPHA_TOP_SIZES],
      columns: [
        { key: "size", label: "Size" },
        { key: "chest", label: "Chest (in)", unit: "in" },
        { key: "shoulder", label: "Shoulder (in)", unit: "in" },
        { key: "length", label: "Length (in)", unit: "in" },
        { key: "sleeve", label: "Sleeve (in)", unit: "in" },
      ],
      defaultChart: [
        { size: "S", chest: 38, shoulder: 17.0, length: 28.5, sleeve: 25.0 },
        { size: "M", chest: 40, shoulder: 17.5, length: 29.5, sleeve: 25.5 },
        { size: "L", chest: 42, shoulder: 18.25, length: 30.5, sleeve: 26.0 },
        { size: "XL", chest: 44, shoulder: 19.0, length: 31.5, sleeve: 26.5 },
        { size: "XXL", chest: 46, shoulder: 19.75, length: 32.5, sleeve: 27.0 },
      ],
    },

    WAIST_BOTTOMS: {
      categoryName: "Bottoms & Trousers",
      sizeType: "WAIST_BOTTOMS",
      label: "Waist Sizing (28 – 42 in)",
      description:
        "Waist circumference, hip, inseam, and total length measurements.",
      supportedSizes: [...WAIST_BOTTOM_SIZES],
      columns: [
        { key: "size", label: "Waist Size" },
        { key: "waist", label: "Waist (in)", unit: "in" },
        { key: "hip", label: "Hip (in)", unit: "in" },
        { key: "inseam", label: "Inseam (in)", unit: "in" },
        { key: "length", label: "Length (in)", unit: "in" },
      ],
      defaultChart: [
        { size: "28", waist: 28, hip: 35.0, inseam: 31.0, length: 40.0 },
        { size: "30", waist: 30, hip: 37.0, inseam: 31.5, length: 40.5 },
        { size: "32", waist: 32, hip: 39.0, inseam: 32.0, length: 41.0 },
        { size: "34", waist: 34, hip: 41.0, inseam: 32.0, length: 41.5 },
        { size: "36", waist: 36, hip: 43.0, inseam: 32.5, length: 42.0 },
        { size: "38", waist: 38, hip: 45.0, inseam: 32.5, length: 42.5 },
        { size: "40", waist: 40, hip: 47.0, inseam: 33.0, length: 43.0 },
        { size: "42", waist: 42, hip: 49.0, inseam: 33.0, length: 43.5 },
      ],
    },

    FOOTWEAR: {
      categoryName: "Footwear",
      sizeType: "FOOTWEAR",
      label: "UK / India Footwear (Sizes 5 – 12)",
      description:
        "Standard India/UK footwear scale with foot length in cm and EU conversion.",
      supportedSizes: [...FOOTWEAR_SIZES],
      columns: [
        { key: "size", label: "UK / India Size" },
        { key: "footLength", label: "Foot Length (cm)", unit: "cm" },
        { key: "euSize", label: "EU Size" },
        { key: "usSize", label: "US Size" },
      ],
      defaultChart: [
        { size: "5", footLength: 24.0, euSize: "38", usSize: "6" },
        { size: "6", footLength: 24.8, euSize: "39.5", usSize: "7" },
        { size: "7", footLength: 25.6, euSize: "40.5", usSize: "8" },
        { size: "8", footLength: 26.5, euSize: "42", usSize: "9" },
        { size: "9", footLength: 27.3, euSize: "43", usSize: "10" },
        { size: "10", footLength: 28.2, euSize: "44.5", usSize: "11" },
        { size: "11", footLength: 29.0, euSize: "46", usSize: "12" },
        { size: "12", footLength: 29.8, euSize: "47", usSize: "13" },
      ],
    },

    ACCESSORIES: {
      categoryName: "Accessories",
      sizeType: "ACCESSORIES",
      label: "Standard / One Size",
      description: "Free size accessory dimensions.",
      supportedSizes: [...ACCESSORY_SIZES],
      columns: [
        { key: "size", label: "Size" },
        { key: "description", label: "Fit Details" },
      ],
      defaultChart: [
        {
          size: "One Size",
          description: "Universal fit engineered for all sizes",
        },
      ],
    },
  };

/**
 * Resolves the appropriate SizeSystemType based on category string
 */
export const resolveSizeTypeForCategory = (
  category: string = "",
): SizeSystemType => {
  const norm = (category || "").trim().toLowerCase();

  // Footwear detection (takes precedence before shirt/clothing)
  if (
    norm.includes("shoe") ||
    norm.includes("footwear") ||
    norm.includes("sneaker") ||
    norm.includes("boot") ||
    norm.includes("loafer") ||
    norm.includes("sandal") ||
    (norm.includes("oxford") && !norm.includes("shirt"))
  ) {
    return "FOOTWEAR";
  }

  // Bottoms detection (Jeans, Trousers, Shorts, Pants, Chinos, Joggers)
  if (
    norm.includes("jean") ||
    norm.includes("trouser") ||
    norm.includes("short") ||
    norm.includes("pant") ||
    norm.includes("chino") ||
    norm.includes("jogger") ||
    norm.includes("denim") ||
    norm.includes("cargo")
  ) {
    return "WAIST_BOTTOMS";
  }

  // Accessories detection (Belts, Ties, Wallets, Bags, Watches)
  if (
    norm.includes("access") ||
    norm.includes("belt") ||
    norm.includes("tie") ||
    norm.includes("wallet") ||
    norm.includes("bag") ||
    norm.includes("watch") ||
    norm.includes("pocket square") ||
    norm.includes("cufflink")
  ) {
    return "ACCESSORIES";
  }

  // Default to Apparel Tops (Shirts, T-Shirts, Blazers, Jackets, Kurtas, etc.)
  return "ALPHA_TOPS";
};

/**
 * Retrieves the full size config object for a given category
 */
export const getCategorySizeConfig = (
  category: string = "",
): CategorySizeConfig => {
  const sizeType = resolveSizeTypeForCategory(category);
  return CATEGORY_SIZE_CONFIGS[sizeType];
};

/**
 * Filters an array of size strings, retaining only those strictly supported by the category.
 * Prevents stale shirt sizes ('M', 'L') from polluting jeans, or waist sizes ('32') on shirts.
 */
export const filterValidSizesForCategory = (
  category: string,
  sizes: string[],
): string[] => {
  if (!Array.isArray(sizes) || sizes.length === 0) return [];
  const config = getCategorySizeConfig(category);
  const supportedSet = new Set(
    config.supportedSizes.map((s) => s.toLowerCase()),
  );
  return sizes.filter((s) => supportedSet.has(String(s).trim().toLowerCase()));
};

/**
 * Checks if a specific size is valid for the given category
 */
export const isSizeValidForCategory = (
  category: string,
  size: string,
): boolean => {
  if (!size) return false;
  const config = getCategorySizeConfig(category);
  return config.supportedSizes.some(
    (s) => s.toLowerCase() === String(size).trim().toLowerCase(),
  );
};

/**
 * Generates an authoritative category size chart, optionally converted to cm or filtered by stocked sizes
 */
export const getCategorySizeChart = (
  category: string,
  selectedSizes?: string[],
  unit: "in" | "cm" = "in",
) => {
  const config = getCategorySizeConfig(category);
  let chartRows = config.defaultChart;

  if (selectedSizes && selectedSizes.length > 0) {
    const validSelected = new Set(selectedSizes.map((s) => s.toLowerCase()));
    chartRows = config.defaultChart.filter((row) =>
      validSelected.has(String(row.size).toLowerCase()),
    );
    if (chartRows.length === 0) {
      chartRows = config.defaultChart;
    }
  }

  // Convert unit if requested
  if (
    unit === "cm" &&
    config.sizeType !== "FOOTWEAR" &&
    config.sizeType !== "ACCESSORIES"
  ) {
    chartRows = chartRows.map((row) => {
      const converted: SizeChartRow = { size: row.size };
      Object.keys(row).forEach((key) => {
        if (key !== "size") {
          const val = Number(row[key]);
          converted[key] = isNaN(val)
            ? row[key]
            : Math.round(val * 2.54 * 10) / 10;
        }
      });
      return converted;
    });
  }

  const columns = config.columns.map((col) => {
    if (col.unit === "in" && unit === "cm") {
      return {
        ...col,
        label: col.label.replace("(in)", "(cm)"),
        unit: "cm" as const,
      };
    }
    return col;
  });

  return {
    sizeType: config.sizeType,
    label: config.label,
    description: config.description,
    columns,
    rows: chartRows,
  };
};
