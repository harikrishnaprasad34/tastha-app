"""Verify the reflection constructor implicated in the installed APK crash.

Reads the built DEX files, not generated Java sources or the keep-rule text.
No Android SDK or third-party Python dependency is needed.
"""
import struct
import sys
import zipfile

TARGET = "Landroidx/work/impl/WorkDatabase_Impl;"


def verify(path):
    with zipfile.ZipFile(path) as apk:
        for name in apk.namelist():
            if not name.endswith(".dex"):
                continue
            data = apk.read(name)

            def uint(offset):
                return struct.unpack_from("<I", data, offset)[0]

            def leb(offset):
                value = shift = 0
                while True:
                    byte = data[offset]
                    offset += 1
                    value |= (byte & 127) << shift
                    if not byte & 128:
                        return value, offset
                    shift += 7

            def string(offset):
                _, offset = leb(offset)
                return data[offset:data.index(b"\0", offset)].decode("utf-8", errors="replace")

            count, start = uint(56), uint(60)
            strings = [string(uint(start + 4 * i)) for i in range(count)]
            count, start = uint(64), uint(68)
            types = [strings[uint(start + 4 * i)] for i in range(count)]
            methods = uint(92)
            prototypes = uint(76)
            count, classes = uint(96), uint(100)
            for index in range(count):
                definition = classes + 32 * index
                if types[uint(definition)] != TARGET:
                    continue
                position = uint(definition + 24)
                counts = []
                for _ in range(4):
                    size, position = leb(position)
                    counts.append(size)
                for _ in range(counts[0] + counts[1]):
                    _, position = leb(position)
                    _, position = leb(position)
                method = 0
                for _ in range(counts[2]):
                    delta, position = leb(position)
                    access, position = leb(position)
                    _, position = leb(position)
                    method += delta
                    method_offset = methods + 8 * method
                    prototype = struct.unpack_from("<H", data, method_offset + 2)[0]
                    parameters = uint(prototypes + 12 * prototype + 8)
                    if strings[uint(method_offset + 4)] == "<init>" and parameters == 0 and access & 1:
                        print("PASS: WorkDatabase_Impl public no-argument constructor survives release R8.")
                        return
                raise AssertionError("Release APK removed WorkDatabase_Impl's reflection constructor.")
    raise AssertionError("Release APK does not contain WorkDatabase_Impl.")


if __name__ == "__main__":
    verify(sys.argv[1])
