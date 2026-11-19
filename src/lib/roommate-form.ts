// Roommate profile questionnaire (20 questions, from "SetMyStay — Roommate Profile Form").
// The server has the same keys in listings/roommate_form.py; keep both in step.

export type Opt = { value: string; label: string };
export type Importance = "not_much" | "somewhat" | "very" | "dealbreaker";

export interface RoommateDetails {
  v?: number;
  first_name?: string;
  age?: number | null;
  gender?: string;
  occupation?: string;
  workplace?: string;
  open_to?: string;
  has_place?: string;
  move_in?: string;
  answers?: Record<string, string>;
  medical_note?: string;
  interests?: string[];
  languages?: string[];
  prompts?: { q: string; a: string }[];
  importance?: Record<string, Importance>;
  visible?: Record<string, boolean>;
}

const o = (value: string, label: string): Opt => ({ value, label });

export const PROFILE_OPTIONS = {
  gender: [o("male", "Male"), o("female", "Female"), o("nonbinary", "Non-binary")],
  occupation: [o("student", "Student"), o("professional", "Working professional"), o("freelancer", "Freelancer / self-employed")],
  open_to: [o("male", "Male roommates only"), o("female", "Female roommates only"), o("anyone", "Anyone")],
  has_place: [o("has_place", "I have a place and need a roommate"), o("looking", "I'm looking for a place with a roommate")],
};

export interface Question {
  key: string;          // answers key
  title: string;
  options: Opt[];
  starred: boolean;     // pick importance + visibility
}

export const QUESTIONS: Record<string, Question> = {
  sleep: { key: "sleep", starred: true, title: "Are you a night person or a day person?", options: [
    o("early", "Early bird — asleep by 10:30, up before 7"),
    o("regular", "Regular — sleep around midnight, up 7–9"),
    o("night", "Night owl — up past 1:30, wake after 9")] },
  home_time: { key: "home_time", starred: true, title: "How much are you at home?", options: [
    o("mostly_home", "Mostly home — WFH / homebody weekends"),
    o("mix", "Mix of home and out"),
    o("mostly_out", "Mostly out — office/college all day, out on weekends")] },
  drink: { key: "drink", starred: true, title: "Do you drink — and where?", options: [
    o("no", "Don't drink"),
    o("occasionally_outside", "Occasionally — only outside"),
    o("socially", "Socially — outside & sometimes at home"),
    o("regularly_home", "Regularly — at home too")] },
  smoke: { key: "smoke", starred: true, title: "Do you smoke?", options: [
    o("no", "No"), o("outside", "Only outside the house"), o("balcony", "Balcony / window"), o("inside", "Inside the house too")] },
  weed: { key: "weed", starred: false, title: "Weed?", options: [o("no", "No"), o("rarely", "Rarely"), o("yes", "Yes")] },
  ok_with: { key: "ok_with", starred: true, title: "Okay with a roommate who drinks, smokes or uses weed at home?", options: [
    o("neither", "Not okay with either"),
    o("drinking_only", "Drinking is okay, no smoking"),
    o("both_outside", "Both okay — smoking outside / balcony only"),
    o("dont_mind", "Don't mind at all")] },
  clean: { key: "clean", starred: true, title: "How clean do you keep your space?", options: [
    o("spotless", "Spotless — dishes done right after eating"),
    o("tidy", "Tidy — clean up the same day"),
    o("relaxed", "Relaxed — clean when needed"),
    o("messy", "Honestly, messy")] },
  chores: { key: "chores", starred: true, title: "How should chores work?", options: [
    o("rota", "Fixed rota / schedule"),
    o("maid", "Hire a maid & split the cost"),
    o("whenever", "Clean whenever needed"),
    o("cleaner", "I prefer a cleaner do it — not by myself")] },
  groceries: { key: "groceries", starred: true, title: "Sharing groceries & splitting bills?", options: [
    o("share_all", "Share groceries, split bills equally"),
    o("share_basics", "Share basics only, split bills equally"),
    o("separate", "Keep everything separate, split bills by usage")] },
  noise: { key: "noise", starred: true, title: "How much noise is okay — music, calls, gaming?", options: [
    o("quiet", "Need it quiet, especially late night"),
    o("moderate", "Moderate — some music / calls are fine"),
    o("loud", "Loud is fine — music, gaming, late calls")] },
  social: { key: "social", starred: true, title: "What kind of roommate are you?", options: [
    o("introvert", "Introvert — just roommates, polite & private"),
    o("ambivert", "Ambivert — friendly, occasional plans"),
    o("extrovert", "Extrovert — best friends, do everything together")] },
  friends: { key: "friends", starred: true, title: "How often do friends visit?", options: [
    o("never", "Never"), o("rarely", "Rarely"), o("monthly", "A few times a month"),
    o("often", "Often — small hangouts"), o("daily", "Daily / I love hosting")] },
  parents: { key: "parents", starred: true, title: "How often do your parents visit?", options: [
    o("never", "Never"), o("rarely", "Rarely — a few times a year"), o("monthly", "About once a month"), o("often", "Often / they stay over")] },
  overnight: { key: "overnight", starred: true, title: "Overnight guests or partner staying over?", options: [
    o("not_ok", "Not okay"), o("occasionally", "Occasionally is fine"), o("anytime", "Fine anytime")] },
  diet: { key: "diet", starred: true, title: "What do you eat?", options: [
    o("jain_veg", "Pure veg / Jain — no non-veg in the kitchen"),
    o("veg", "Veg — non-veg okay if cooked separately"),
    o("eggetarian", "Eggetarian"),
    o("non_veg", "Non-veg")] },
  cooking: { key: "cooking", starred: true, title: "Cooking & meals?", options: [
    o("daily", "Cook daily — happy to eat together"),
    o("sometimes", "Cook sometimes, mostly eat separately"),
    o("order_in", "Mostly order in")] },
  pets: { key: "pets", starred: true, title: "Pets?", options: [
    o("have_pet", "I have a pet"), o("love_pets", "No pet, but love them"), o("neutral", "Neutral"), o("allergic", "Allergic / no pets please")] },
  medical: { key: "medical", starred: false, title: "Any medical issue your roommate should know about?", options: [
    o("no", "No"), o("minor", "Yes — minor (allergy, asthma etc.)"), o("emergency", "Yes — may need help in an emergency")] },
};

export const ANSWER_KEYS = Object.keys(QUESTIONS);

export const IMPORTANCE: Opt[] = [o("not_much", "Not much"), o("somewhat", "Somewhat"), o("very", "Very"), o("dealbreaker", "Dealbreaker")];
// Starred questions ("smoke" also covers weed). "interests" is question 19.
export const STARRED = ["sleep", "home_time", "drink", "smoke", "ok_with", "clean", "chores", "groceries", "noise",
  "social", "friends", "parents", "overnight", "diet", "cooking", "pets", "interests"];

export const INTERESTS: Opt[] = [o("gym", "Gym"), o("cricket", "Cricket"), o("football", "Football"), o("gaming", "Gaming"),
  o("movies", "Movies & series"), o("music", "Music"), o("reading", "Reading"), o("cooking", "Cooking"), o("travel", "Travel"),
  o("trekking", "Trekking"), o("partying", "Partying"), o("spirituality", "Spirituality"), o("coding", "Coding"), o("art", "Art")];
export const LANGUAGES: Opt[] = [o("hindi", "Hindi"), o("english", "English"), o("marathi", "Marathi"), o("gujarati", "Gujarati"),
  o("tamil", "Tamil"), o("telugu", "Telugu"), o("kannada", "Kannada"), o("bengali", "Bengali"), o("malayalam", "Malayalam"), o("punjabi", "Punjabi")];
export const PROMPTS: Opt[] = [o("best_roommate", "The roommate I get along with best…"), o("ideal_sunday", "My ideal Sunday at home…"),
  o("house_rule", "A house rule I swear by…"), o("particular_about", "I'm weirdly particular about…"),
  o("kitchen", "You'll find me in the kitchen making…"), o("green_flag", "Green flag in a roommate…"),
  o("pet_peeve", "My biggest pet peeve at home…"), o("long_day", "After a long day I just want to…")];

export const labelOf = (opts: Opt[], v?: string) => opts.find((x) => x.value === v)?.label || v || "";
export const answerLabel = (key: string, v?: string) => labelOf(QUESTIONS[key]?.options || [], v);
// Short labels (before the dash) for chips
export const shortAnswer = (key: string, v?: string) => answerLabel(key, v).split(" — ")[0];

/** Screens of the form, in order (one question per screen, like the PDF). */
export const SECTIONS: { title: string; steps: string[] }[] = [
  { title: "About you", steps: ["about"] },
  { title: "Your search", steps: ["search"] },
  { title: "Daily rhythm", steps: ["sleep", "home_time"] },
  { title: "Habits", steps: ["drink", "smoke", "ok_with"] },
  { title: "Home", steps: ["clean", "chores", "groceries", "noise"] },
  { title: "Social life", steps: ["social", "friends", "parents", "overnight"] },
  { title: "Food", steps: ["diet", "cooking"] },
  { title: "More about you", steps: ["pets", "medical", "interests"] },
  { title: "Your prompts", steps: ["prompts"] },
  { title: "Contact", steps: ["contact"] },
  { title: "Photos & documents", steps: ["media"] },
];
export const STEPS = SECTIONS.flatMap((s) => s.steps.map((step) => ({ step, section: s.title })));

/** Listing fields that live outside roommate_details (budget, location, contact, media). */
export interface RoommateListingFields {
  rent?: number | string;
  state?: string;
  city?: string;
  locality?: string;
  address?: string;
  phone_primary?: string;
  phone_secondary?: string;
  description?: string;
  photoCount?: number;
  hasAadhaar?: boolean;
  hasElectricity?: boolean;
}

const filled = (v: unknown) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== "");

/** How much of the roommate form is filled in (required and optional items), 0–100. */
export function roommateCompletion(d: RoommateDetails = {}, f: RoommateListingFields = {}): number {
  const a = d.answers || {};
  const items: unknown[] = [
    d.first_name, d.age, d.gender, d.occupation, d.workplace, d.open_to, d.has_place, d.move_in,
    f.rent, f.city, f.locality, f.phone_primary, f.description,
    ...ANSWER_KEYS.map((k) => a[k]),
    d.interests, d.languages, d.prompts,
    f.photoCount ? "x" : "", (f.photoCount || 0) >= 3 ? "x" : "", f.hasAadhaar ? "x" : "",
  ];
  if (a.medical && a.medical !== "no") items.push(d.medical_note);
  if (d.has_place === "has_place") items.push(f.hasElectricity ? "x" : "", f.address);
  const done = items.filter(filled).length;
  return Math.round((done / items.length) * 100);
}

/** Readable name for a changed field in the admin/staff Notifications view. */
export function changeFieldLabel(field: string): string {
  const base: Record<string, string> = {
    title: "Title", description: "Description", rent: "Rent / budget", deposit: "Deposit", is_negotiable: "Negotiable",
    state: "State", city: "City", area: "Area / locality", address: "Full address", vendor_number: "Vendor number",
    bhk: "BHK", furnishing: "Furnishing", sq_ft: "Size (sq ft)", occupancy_type: "Room type",
    gender_preference: "Gender", age: "Age", sharing_status: "Place status", is_broker: "Broker",
    owner_name: "Name", phone_primary: "Phone number", phone_secondary: "Second phone number",
    document_aadhaar: "Aadhaar / ID proof", document_electricity: "Electricity bill", document_noc: "NOC",
    amenities: "Amenities / preferences", photos: "Photos", video: "Video",
  };
  if (base[field]) return base[field];
  const m = field.match(/^roommate\.(?:(answers|importance|visible)\.)?(.+)$/);
  if (!m) return field;
  const [, group, key] = m;
  const q = QUESTIONS[key]?.title || ({ interests: "Interests", first_name: "First name", age: "Age", gender: "Gender",
    occupation: "What you do", workplace: "College / company", open_to: "Open to living with", has_place: "Place status",
    move_in: "Move-in date", medical_note: "Medical note", languages: "Languages", prompts: "Prompts" } as Record<string, string>)[key] || key;
  if (group === "importance") return `How much it matters: ${q}`;
  if (group === "visible") return `Shown on profile: ${q}`;
  return q;
}

/** Readable value for a changed field (option keys -> labels). */
export function changeValueLabel(field: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return `${v.length} ${field === "photos" ? (v.length === 1 ? "photo" : "photos") : "items"}`;
  const s = String(v);
  const m = field.match(/^roommate\.(?:(answers|importance|visible)\.)?(.+)$/);
  if (!m) return s;
  const [, group, key] = m;
  if (group === "answers") return answerLabel(key, s);
  if (group === "importance") return labelOf(IMPORTANCE, s);
  if (group === "visible") return s === "Yes" || s === "true" ? "Shown" : "Hidden";
  if (key in PROFILE_OPTIONS) return labelOf((PROFILE_OPTIONS as Record<string, Opt[]>)[key], s);
  if (key === "interests") return s.split(", ").map((x) => labelOf(INTERESTS, x)).join(", ");
  if (key === "languages") return s.split(", ").map((x) => labelOf(LANGUAGES, x)).join(", ");
  if (key === "prompts") return s.split(" | ").map((p) => { const [q, ...rest] = p.split(": "); return `${labelOf(PROMPTS, q)} ${rest.join(": ")}`; }).join(" | ");
  return s;
}

/** Card / filter chips derived from the answers (only answers the user chose to show). */
export function preferenceChips(d: RoommateDetails): string[] {
  const a = d.answers || {}; const vis = d.visible || {};
  const chips: string[] = [];
  if (vis.smoke !== false && a.smoke === "no") chips.push("Non-Smoker");
  if (vis.diet !== false && (a.diet === "jain_veg" || a.diet === "veg")) chips.push("Vegetarian");
  if (vis.pets !== false && (a.pets === "have_pet" || a.pets === "love_pets")) chips.push("Pet-Friendly");
  if (vis.drink !== false && a.drink === "no") chips.push("Non-Drinker");
  if (vis.clean !== false && (a.clean === "spotless" || a.clean === "tidy")) chips.push("Clean");
  return chips;
}
