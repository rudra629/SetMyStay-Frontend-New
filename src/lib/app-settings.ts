import { defaultPricing } from "@/lib/data";
import api, { getPricingConfig } from "@/lib/api";

export type ListingKind = "RENTAL" | "PG" | "ROOMMATE";
export type AppSettings = { swipeLimit: number; slotCooldownHours: number; swipeResetHours: number };

export const DEFAULT_SETTINGS: AppSettings = { swipeLimit: 25, slotCooldownHours: 24, swipeResetHours: 24 };
const KEY = "setmystay_app_settings";
const SWIPES_KEY = "setmystay_swipes";
const PRICING_KEY = "pricing";

export async function fetchAndCachePricing(): Promise<typeof defaultPricing> {
  try {
    const remote = await getPricingConfig();
    if (remote && remote.listings) {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(PRICING_KEY, JSON.stringify(remote));
      }
      return remote;
    }
  } catch { /* use cached or default */ }
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(PRICING_KEY) : null;
    if (raw) return JSON.parse(raw);
  } catch {}
  return defaultPricing;
}

/** Settings set by the admin. They come from the server (saved with the pricing), cached in the browser. */
export function loadSettings(): AppSettings {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(PRICING_KEY) : null;
    const server = raw ? (JSON.parse(raw)?.settings || null) : null;
    if (server) {
      return {
        swipeLimit: Number(server.swipe_limit) || DEFAULT_SETTINGS.swipeLimit,
        slotCooldownHours: Number(server.slot_cooldown_hours) || DEFAULT_SETTINGS.slotCooldownHours,
        swipeResetHours: Number(server.swipe_reset_hours) || DEFAULT_SETTINGS.swipeResetHours,
      };
    }
  } catch { /* fall through */ }
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    if (!raw) return DEFAULT_SETTINGS;
    const p = JSON.parse(raw);
    return {
      swipeLimit: Number(p.swipeLimit) || DEFAULT_SETTINGS.swipeLimit,
      slotCooldownHours: Number(p.slotCooldownHours) || DEFAULT_SETTINGS.slotCooldownHours,
      swipeResetHours: Number(p.swipeResetHours) || DEFAULT_SETTINGS.swipeResetHours,
    };
  } catch { return DEFAULT_SETTINGS; }
}
export function saveSettings(s: Partial<AppSettings>) { 
  const current = loadSettings();
  const next = { ...current, ...s };
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(next)); 
  }
}

export function normalizeKind(t: string | undefined | null): ListingKind {
  const v = String(t || "").toUpperCase();
  if (v === "PG") return "PG";
  if (v === "ROOMMATE") return "ROOMMATE";
  return "RENTAL";
}
/** Listing fee comes from Admin → Management → Pricing (Listing Plans). */
export function feeFor(type: string | undefined | null): number {
  let listings = defaultPricing.listings;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(PRICING_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.listings) listings = { ...listings, ...parsed.listings };
    }
  } catch { /* ignore */ }
  const k = normalizeKind(type);
  const fee = k === "PG" ? listings.pg : k === "ROOMMATE" ? listings.roommate : listings.rental;
  return Number(fee) > 0 ? Number(fee) : (k === "PG" ? 349 : k === "ROOMMATE" ? 149 : 999);
}

// ---- Swipes ----
// Logged-in users: counted on the server (/swipes/), same on every device, resets every N hours.
// Guests: counted in this browser with the same reset window.
export type SwipeState = { limit: number; used: number; left: number; resetsAt: string | null };

const GUEST_SWIPES_KEY = "setmystay_guest_swipes";
function guestState(): { count: number; start: number } {
  const hours = loadSettings().swipeResetHours;
  try {
    const s = JSON.parse(localStorage.getItem(GUEST_SWIPES_KEY) || "null");
    if (s && Date.now() - s.start < hours * 3600 * 1000) return s;
  } catch { /* ignore */ }
  return { count: 0, start: Date.now() };
}
function toState(count: number, start: number): SwipeState {
  const { swipeLimit, swipeResetHours } = loadSettings();
  return { limit: swipeLimit, used: count, left: Math.max(0, swipeLimit - count), resetsAt: new Date(start + swipeResetHours * 3600 * 1000).toISOString() };
}
const isLoggedIn = () => typeof localStorage !== "undefined" && !!localStorage.getItem("access_token");
const fromServer = (d: any): SwipeState => ({ limit: d.limit, used: d.used, left: d.left, resetsAt: d.resets_at || null });

export async function fetchSwipeState(): Promise<SwipeState> {
  if (isLoggedIn()) {
    try { const { data } = await api.get("/swipes/"); return fromServer(data); } catch { /* fall back to guest */ }
  }
  const g = guestState();
  return toState(g.count, g.start);
}

export async function recordSwipe(): Promise<SwipeState> {
  if (isLoggedIn()) {
    try {
      const { data } = await api.post("/swipes/");
      return fromServer(data);
    } catch (e: any) {
      if (e?.response?.status === 429 && e.response.data) return fromServer(e.response.data);
    }
  }
  const g = guestState();
  g.count += 1;
  try { localStorage.setItem(GUEST_SWIPES_KEY, JSON.stringify(g)); } catch { /* ignore */ }
  return toState(g.count, g.start);
}

// Old per-browser counter is no longer used
try { if (typeof localStorage !== "undefined") localStorage.removeItem(SWIPES_KEY); } catch { /* ignore */ }

export type UserProfile = { name: string; phone: string; email: string; address: string; submittedAt: string };
const PROFILES_KEY = "setmystay_user_profiles";
export function loadProfiles(): UserProfile[] {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || "[]"); } catch { return []; }
}
export function addProfile(p: Omit<UserProfile, "submittedAt">) {
  const list = loadProfiles().filter((x) => x.email.toLowerCase() !== p.email.toLowerCase());
  list.unshift({ ...p, submittedAt: new Date().toISOString() });
  localStorage.setItem(PROFILES_KEY, JSON.stringify(list));
}
