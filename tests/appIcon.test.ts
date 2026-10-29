import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const config = JSON.parse(
  readFileSync(new URL("../app.json", import.meta.url), "utf8"),
).expo;
describe("launcher icon assets", () => {
  it.each([
    config.icon,
    config.android.adaptiveIcon.foregroundImage,
    config.web.favicon,
  ])("uses a square 1024px PNG at %s", (path) => {
    const png = readFileSync(new URL("../" + path, import.meta.url));
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1024);
    expect(png.readUInt32BE(20)).toBe(1024);
  });
});
