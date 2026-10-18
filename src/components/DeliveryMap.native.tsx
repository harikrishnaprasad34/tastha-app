import React from "react";
import { Platform, Text, View } from "react-native";
import Constants from "expo-constants";
import MapView, { Marker } from "react-native-maps";
import { styles as s } from "./ui";
export function DeliveryMap({
  lat,
  lng,
  disabled,
  onMove,
}: {
  lat: number;
  lng: number;
  disabled: boolean;
  onMove: (lat: number, lng: number) => void;
}) {
  if (
    Platform.OS === "android" &&
    !Constants.expoConfig?.extra?.androidMapsConfigured
  )
    return (
      <Text style={s.muted}>
        Map preview is unavailable. Search or confirm your street and PIN below.
      </Text>
    );
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.muted}>
        Drag the pin to your entrance, then confirm the address.
      </Text>
      <MapView
        style={{ height: 280, width: "100%", borderRadius: 12 }}
        region={{
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        }}
        scrollEnabled={!disabled}
        zoomEnabled={!disabled}
        accessibilityLabel="Delivery map"
        onPress={(event) => {
          if (!disabled)
            onMove(
              event.nativeEvent.coordinate.latitude,
              event.nativeEvent.coordinate.longitude,
            );
        }}
      >
        <Marker
          coordinate={{ latitude: lat, longitude: lng }}
          draggable={!disabled}
          title="Delivery entrance"
          onDragEnd={(event) =>
            onMove(
              event.nativeEvent.coordinate.latitude,
              event.nativeEvent.coordinate.longitude,
            )
          }
        />
      </MapView>
    </View>
  );
}
