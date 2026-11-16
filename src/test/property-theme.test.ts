import { afterEach, describe, expect, it } from "vitest";
import { applyTheme, cacheTheme, loadTheme, PRESETS, THEME_KEY } from "@/lib/site-theme";

afterEach(() => {
  applyTheme(null);
  localStorage.removeItem(THEME_KEY);
});

describe("Property-only Appearance", () => {
  it("applies festival colours without changing website colours", () => {
    const root = document.documentElement;
    const original = root.style.getPropertyValue("--background");
    applyTheme(PRESETS[1]);
    expect(root.style.getPropertyValue("--property-card")).toBe("#fffaf2");
    expect(root.style.getPropertyValue("--property-primary")).toBe("#b0300f");
    expect(root.style.getPropertyValue("--background")).toBe(original);
    expect(root.style.getPropertyValue("--primary")).toBe("");
  });

  it("keeps the server palette locally and resets its overrides", () => {
    cacheTheme(PRESETS[2]);
    expect(loadTheme()?.name).toBe("Holi");
    expect(document.documentElement.style.getPropertyValue("--property-card")).toBe("#ffffff");
    cacheTheme(null);
    expect(loadTheme()).toBeNull();
    expect(document.documentElement.style.getPropertyValue("--property-card")).toBe("");
  });
});