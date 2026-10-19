#!/usr/bin/env bash
set -euo pipefail

mkdir -p startup-results
adb install -r "${1:?APK path required}"
adb shell pm grant com.tastha.app android.permission.ACCESS_FINE_LOCATION
adb shell pm grant com.tastha.app android.permission.ACCESS_COARSE_LOCATION
adb logcat -c
capture() {
  adb logcat -d > startup-results/logcat.txt || true
  adb shell uiautomator dump /sdcard/window.xml >/dev/null 2>&1 || true
  adb pull /sdcard/window.xml startup-results/window.xml >/dev/null 2>&1 || true
  adb exec-out screencap -p > startup-results/screen.png || true
}
trap capture EXIT

check_screen() {
  local label="$1"
  adb shell am start -W -n com.tastha.app/.MainActivity
  sleep 20
  adb shell pidof com.tastha.app
  adb shell uiautomator dump /sdcard/window.xml
  adb pull /sdcard/window.xml "startup-results/${label}.xml"
  adb exec-out screencap -p > "startup-results/${label}.png"
  # A live native process alone does not prove React rendered the storefront.
  grep -Eq 'Delivery location|Use your current location|TASTHA' "startup-results/${label}.xml"
}

check_screen cold-start
adb shell input keyevent KEYCODE_HOME
sleep 3
check_screen resume
adb shell am force-stop com.tastha.app
check_screen restart

# Visit public native shopping surfaces and capture actual release rendering.
# These checks do not create orders, sign in, or manufacture catalog content.
for route in shop wishlist bag account search; do
  adb shell am start -W -a android.intent.action.VIEW -d "tastha:///$route" com.tastha.app
  sleep 8
  adb shell uiautomator dump /sdcard/window.xml >/dev/null
  adb pull /sdcard/window.xml "startup-results/native-${route}.xml" >/dev/null
  adb exec-out screencap -p > "startup-results/native-${route}.png"
done
# Verify route rendering, not simply a running Android process.
grep -q 'The collection' startup-results/native-shop.xml
grep -Eq 'Sign in|Your bag' startup-results/native-bag.xml
grep -Eq 'Tastha account|My Account' startup-results/native-account.xml
grep -q 'Find your Tastha look' startup-results/native-search.xml
adb shell am start -W -a android.intent.action.VIEW -d 'tastha:///' com.tastha.app
sleep 15
adb shell uiautomator dump /sdcard/window.xml >/dev/null
adb pull /sdcard/window.xml startup-results/native-home.xml >/dev/null
adb exec-out screencap -p > startup-results/native-home.png
grep -q 'Shop by category\|Finding your next favourite\|Retry' startup-results/native-home.xml

# Exercise the new native page directory and the real, unauthenticated admin
# website. No credentials or admin mutations are used in this acceptance check.
adb shell am start -W -a android.intent.action.VIEW -d 'tastha://website' com.tastha.app
sleep 5
adb shell uiautomator dump /sdcard/window.xml
adb pull /sdcard/window.xml startup-results/website-directory.xml
grep -q 'Explore Tastha' startup-results/website-directory.xml
adb shell am start -W -a android.intent.action.VIEW -d 'tastha://website/admin-dashboard' com.tastha.app
workspace_ready=false
for attempt in $(seq 1 12); do
  sleep 5
  adb shell uiautomator dump /sdcard/window.xml >/dev/null
  adb pull /sdcard/window.xml startup-results/admin-sign-in.xml >/dev/null 2>&1
  if grep -q 'android.webkit.WebView' startup-results/admin-sign-in.xml && grep -Eqi 'Email|Password|Sign in|Access denied' startup-results/admin-sign-in.xml; then
    workspace_ready=true
    break
  fi
done
test "$workspace_ready" = true
adb exec-out screencap -p > startup-results/admin-sign-in.png
capture
if grep -Eq 'FATAL EXCEPTION|Fatal signal|ReactNativeJS:.*(Error:|Exception)' startup-results/logcat.txt; then
  cat startup-results/logcat.txt
  exit 1
fi
