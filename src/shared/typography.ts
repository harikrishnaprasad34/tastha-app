/** Compact mobile type scale, in logical pixels. Native font scaling stays enabled. */
export const typography = {
  title: { fontSize: 20, lineHeight: 26 },
  heading: { fontSize: 16, lineHeight: 22 },
  body: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 13, lineHeight: 18 },
  helper: { fontSize: 13, lineHeight: 19 },
  caption: { fontSize: 12, lineHeight: 17 },
  price: { fontSize: 16, lineHeight: 22 },
} as const;
export const iconSizes = {
  small: 16,
  control: 20,
  navigation: 22,
  feature: 24,
} as const;
