import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, feeFor, recordSwipe, saveSettings, fetchSwipeState, addProfile, loadProfiles } from "@/lib/app-settings";

describe("app settings", () => {
  beforeEach(() => localStorage.clear());
  it("allows 25 swipes for a guest by default", async () => {
    expect((await fetchSwipeState()).left).toBe(25);
    for (let i = 0; i < 25; i++) await recordSwipe();
    expect((await fetchSwipeState()).left).toBe(0);
  });
  it("uses the admin swipe limit saved with the pricing", async () => {
    localStorage.setItem("pricing", JSON.stringify({ unlocks: {}, listings: {}, settings: { swipe_limit: 3, swipe_reset_hours: 24, slot_cooldown_hours: 24 } }));
    await recordSwipe();
    expect((await fetchSwipeState()).left).toBe(2);
  });
  it("falls back to locally saved settings", async () => {
    saveSettings({ ...DEFAULT_SETTINGS, swipeLimit: 4 });
    expect((await fetchSwipeState()).left).toBe(4);
  });
  it("charges the Pricing Management listing fee per type", () => {
    localStorage.setItem("pricing", JSON.stringify({ unlocks: {}, listings: { rental: 600, pg: 300, roommate: 100 } }));
    expect(feeFor("Rental")).toBe(600);
    expect(feeFor("PG")).toBe(300);
    expect(feeFor("ROOMMATE")).toBe(100);
  });
  it("keeps one profile per email", () => {
    addProfile({ name: "A", phone: "9999999999", email: "a@x.com", address: "Somewhere 1" });
    addProfile({ name: "A2", phone: "9999999999", email: "A@x.com", address: "Somewhere 2" });
    expect(loadProfiles()).toHaveLength(1);
    expect(loadProfiles()[0].name).toBe("A2");
  });
});
