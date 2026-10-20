"""Guest-page visual evidence from the real installed APK; no test accounts or writes."""
import subprocess
import time
import struct
import xml.etree.ElementTree as ET
from pathlib import Path

OUT = Path("startup-results")
OUT.mkdir(exist_ok=True)

def adb(*args):
    return subprocess.check_output(["adb", *args], timeout=40)

def capture(name, path, expected):
    adb("shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", "tastha:///" + path.lstrip("/"), "com.tastha.app")
    visible = ""
    for attempt in range(5):
        time.sleep(3)
        adb("shell", "uiautomator", "dump", "/sdcard/responsive.xml")
        xml = adb("shell", "cat", "/sdcard/responsive.xml")
        (OUT / (name + ".xml")).write_bytes(xml)
        visible = " ".join(node.get("text", "") for node in ET.fromstring(xml).iter("node"))
        if expected.lower() in visible.lower():
            break
    png = adb("exec-out", "screencap", "-p")
    (OUT / (name + ".png")).write_bytes(png)
    dimensions = struct.unpack_from(">II", png, 16)
    if name.startswith("landscape"):
        assert dimensions[0] > dimensions[1], "Landscape display was not applied"
    assert expected.lower() in visible.lower(), f"{name}: expected {expected!r}, visible {visible[:500]!r}"
    assert adb("shell", "pidof", "com.tastha.app").strip(), f"{name}: app process stopped"
    print("PASS guest route", name, "display pixels", dimensions)

try:
    for name, path, expected in [
        ("account", "/account", "My account"),
        ("home", "/", "New in"),
        ("catalog", "/shop", "Shop styles"),
        ("bag-guest", "/bag", "Sign in to continue"),
        ("wishlist-guest", "/wishlist", "Sign in to continue"),
        ("staff-login", "/admin", "Staff sign in"),
        ("customer-login", "/login", "Welcome to Tastha"),
        ("location", "/location", "Where should we deliver?"),
        ("search", "/search", "Find your Tastha look"),
    ]:
        capture(name, path, expected)
    adb("shell", "wm", "size", "720x1280")
    adb("shell", "wm", "density", "360")
    capture("phone-320-account", "/account", "My account")
    capture("phone-320-catalog", "/shop", "Shop styles")
    adb("shell", "settings", "put", "system", "font_scale", "1.8")
    capture("large-text-account", "/account", "My account")
    capture("large-text-catalog", "/shop", "Shop styles")
    adb("shell", "settings", "put", "system", "font_scale", "1.0")
    adb("shell", "settings", "put", "system", "accelerometer_rotation", "0")
    adb("shell", "settings", "put", "system", "user_rotation", "1")
    capture("landscape-catalog", "/shop", "Shop styles")
    adb("shell", "settings", "put", "system", "user_rotation", "0")
    adb("shell", "wm", "size", "1600x2560")
    adb("shell", "wm", "density", "240")
    capture("tablet-catalog", "/shop", "Shop styles")
    capture("tablet-account", "/account", "My account")
finally:
    adb("shell", "settings", "put", "system", "user_rotation", "0")
    adb("shell", "settings", "put", "system", "accelerometer_rotation", "1")
    adb("shell", "settings", "put", "system", "font_scale", "1.0")
    adb("shell", "wm", "size", "reset")
    adb("shell", "wm", "density", "reset")
    (OUT / "responsive-logcat.txt").write_bytes(adb("logcat", "-d"))
