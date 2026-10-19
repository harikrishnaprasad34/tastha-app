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
