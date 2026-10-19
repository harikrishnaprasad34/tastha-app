const androidGoogleMapsApiKey = process.env.ANDROID_GOOGLE_MAPS_API_KEY;
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    androidMapsConfigured: Boolean(androidGoogleMapsApiKey),
  },
  plugins: [
    ...(config.plugins || []),
    [
      "expo-build-properties",
      {
        android: {
          // WorkManager initializes Room before Application.onCreate. Its
          // generated database is loaded reflectively and must survive R8.
          extraProguardRules:
            "-keep class androidx.work.impl.WorkDatabase { *; }\n" +
            "-keep class androidx.work.impl.WorkDatabase_Impl { *; }\n" +
            "-keep class * extends androidx.room.RoomDatabase { *; }\n",
        },
      },
    ],
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
});
