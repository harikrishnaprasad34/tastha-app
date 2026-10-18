import React from "react";
import { Text } from "react-native";
import { styles as s } from "./ui";
export function DeliveryMap(_props: {
  lat: number;
  lng: number;
  disabled: boolean;
  onMove: (lat: number, lng: number) => void;
}) {
  return (
    <Text style={s.muted}>
      Use the Tastha Android or iOS app to adjust the map pin.
    </Text>
  );
}
