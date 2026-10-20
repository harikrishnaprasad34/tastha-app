import React from "react";
import type { ColorValue } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../config";
const paths = {
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  close: "m6 6 12 12M6 18 18 6",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  tag: "M3 3h8l10 10-8 8L3 11V3Zm4 4h.01",
  logout: "M9 3H4v18h5M10 12h11m-5-5 5 5-5 5",
  shirt: "m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4c0 4-8 4-8 0Z",
  home: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  shop: "M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z",
  heart:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
  bag: "M5 8h14l1 13H4L5 8ZM8 8V6a4 4 0 0 1 8 0v2",
  person: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
  location:
    "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  help: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9 9a3 3 0 0 1 6 0c0 2-3 2-3 4M12 17h.01",
  shield: "M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6L12 2ZM8 12l3 3 5-6",
  returns: "M4 8h12a5 5 0 0 1 0 10h-3M4 8l5-5M4 8l5 5",
  sparkle: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z",
  contact:
    "M3 13v-1a9 9 0 0 1 18 0v1M3 12h4v8H3v-8ZM17 12h4v8h-4v-8ZM21 19v1a3 3 0 0 1-3 3h-4",
  chevron: "m9 5 7 7-7 7",
  card: "M3 4h18v16H3V4ZM3 9h18M7 15h4",
  bank: "m2 8 10-6 10 6H2ZM5 11v8M12 11v8M19 11v8M2 22h20",
  upi: "M3 3h6v6H3ZM15 3h6v6h-6ZM3 15h6v6H3ZM15 15h3v3h3v3h-6Z",
  check: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM8 12l3 3 5-6",
  circle: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
} as const;
export type IconName = keyof typeof paths;
export function Icon({
  name,
  size = 24,
  color = colors.gold,
  filled = false,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue | null;
  filled?: boolean;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? (color ?? colors.gold) : "none"}
      stroke={color ?? colors.gold}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
    >
      <Path d={paths[name]} />
    </Svg>
  );
}
