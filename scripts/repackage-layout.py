"""Reuse a verified native test APK for a JavaScript-only layout iteration.

CI separately rejects changes to dependencies, native configuration and assets.
The native/resource payload must remain byte-for-byte identical. Android tools
align and re-sign the result with the same development certificate afterwards.
"""
import hashlib
from pathlib import Path
import re
import sys
import zipfile

base, bundle, output = map(Path, sys.argv[1:4])
asset_directory = Path(sys.argv[4]) if len(sys.argv) > 4 else None
bundle_name = "assets/index.android.bundle"
def signature(name):
    return bool(re.fullmatch(r"META-INF/(?:MANIFEST\.MF|[^/]+\.(?:SF|RSA|DSA|EC))", name, re.I))
with zipfile.ZipFile(base) as source:
    old = source.read(bundle_name)
    replacement = bundle.read_bytes()
    if old[:12] != replacement[:12] or old[:8].hex() != "c61fbc03c103191f":
        raise SystemExit("Hermes bytecode version differs from the native base")
    # AAPT can shorten physical resource paths. Its table retains the logical
    # Android asset names that React Native resolves at runtime.
    table = source.read("resources.arsc")
    if asset_directory:
        for asset in asset_directory.rglob("*"):
            if asset.is_file() and asset.stem.encode() not in table:
                raise SystemExit("New native resource requires a full build: " + asset.name)
    with zipfile.ZipFile(output, "w") as target:
        for item in source.infolist():
            if signature(item.filename):
                continue
            target.writestr(item, replacement if item.filename == bundle_name else source.read(item.filename))
with zipfile.ZipFile(base) as source, zipfile.ZipFile(output) as target:
    expected = {n for n in source.namelist() if not signature(n)}
    if expected != set(target.namelist()):
        raise SystemExit("Unexpected APK entry changes")
    for name in expected - {bundle_name}:
        if hashlib.sha256(source.read(name)).digest() != hashlib.sha256(target.read(name)).digest():
            raise SystemExit("Native payload changed: " + name)
print("Verified identical native libraries, DEX, manifest, configuration and resources; only Hermes layout bundle changed.")
