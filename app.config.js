const { expo } = require("./app.json");
const androidGoogleMapsApiKey = process.env.ANDROID_GOOGLE_MAPS_API_KEY;
module.exports = {
  ...expo,
  extra: {
    ...expo.extra,
    androidMapsConfigured: Boolean(androidGoogleMapsApiKey),
  },
  plugins: [
    ...expo.plugins,
    "expo-sharing",
    [
      "expo-image-picker",
      {
        photosPermission:
          "Choose photos to include with your Tastha product review.",
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
    [
      "react-native-maps",
      ...(androidGoogleMapsApiKey ? [{ androidGoogleMapsApiKey }] : [{}]),
    ],
  ],
};
