#!/usr/bin/env bash
set -euo pipefail

mkdir -p startup-results
adb install -r "${1:?APK path required}"
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
  # A live native process alone does not prove React rendered the storefront.
  grep -Eq 'Delivery location|Use your current location|TASTHA' "startup-results/${label}.xml"
}

check_screen cold-start
adb shell input keyevent KEYCODE_HOME
sleep 3
check_screen resume
adb shell am force-stop com.tastha.app
check_screen restart
capture
if grep -Eq 'FATAL EXCEPTION|Fatal signal|ReactNativeJS:.*(Error:|Exception)' startup-results/logcat.txt; then
  cat startup-results/logcat.txt
  exit 1
fi
