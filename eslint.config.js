const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expo,
  { ignores: ["dist/**", "android/**", "ios/**"] },
  // These API effects deliberately invalidate stale product/financial data before
  // fetching. Keeping old data payable would be a correctness regression.
  {
    files: ["src/screens/Shop.tsx", "src/screens/Commerce.tsx"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
]);
