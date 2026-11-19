"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, FileUp, ImagePlus, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { AutocompleteInput } from "@/components/shared/autocomplete-input";
import { indianStates } from "@/lib/states";
import { allIndianCities, indianCitiesByState } from "@/lib/cities";
import { indianAreas } from "@/lib/areas";
import { cn } from "@/lib/utils";
import {
  IMPORTANCE, INTERESTS, LANGUAGES, PROFILE_OPTIONS, PROMPTS, QUESTIONS, SECTIONS, STEPS, STARRED,
  roommateCompletion, type Importance, type Opt, type RoommateDetails,
} from "@/lib/roommate-form";

export interface RoommateFields {
  rent: string; state: string; city: string; locality: string; address: string;
  phone_primary: string; phone_secondary: string; description: string;
  vendor_number: string;
}
export interface ExistingMedia {
  photos: { id: string; url: string }[];
  aadhaar?: string; electricity?: string; noc?: string;
}
export interface RoommateFormResult {
  details: RoommateDetails;
  fields: RoommateFields;
  newPhotos: File[];
  removeImageIds: string[];
  docs: { aadhaar?: File; electricity?: File; noc?: File };
}

const DRAFT_KEY = "setmystay_roommate_draft";
const MAX_PHOTOS = 8;
const DOC_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

const emptyFields: RoommateFields = { rent: "", state: "", city: "", locality: "", address: "", phone_primary: "", phone_secondary: "", description: "", vendor_number: "" };

function defaultDetails(): RoommateDetails {
  return {
    v: 1, first_name: "", age: null, gender: "", occupation: "", workplace: "", open_to: "", has_place: "", move_in: "",
    answers: {}, medical_note: "", interests: [], languages: [], prompts: [],
    importance: Object.fromEntries(STARRED.map((k) => [k, "somewhat"])) as Record<string, Importance>,
    visible: Object.fromEntries(STARRED.map((k) => [k, true])),
  };
}

/** Big tappable option list (radio). */
function Choice({ options, value, onChange, cols = 1 }: { options: Opt[]; value?: string; onChange: (v: string) => void; cols?: 1 | 2 | 3 }) {
  return (
    <div role="radiogroup" className={cn("grid gap-2.5", cols === 2 && "sm:grid-cols-2", cols === 3 && "sm:grid-cols-3")}>
      {options.map((opt) => {
        const on = value === opt.value;
        return (
          <button
            key={opt.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] transition",
              on ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/50 hover:bg-muted/50",
            )}
          >
            <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>
              {on && <Check className="h-3 w-3" />}
            </span>
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Multi-select chips. */
function Chips({ options, value, onChange }: { options: Opt[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const on = value.includes(opt.value);
        return (
          <button key={opt.value} type="button" aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== opt.value) : [...value, opt.value])}
            className={cn("rounded-full border px-3.5 py-1.5 text-sm transition", on ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/60")}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** "How much does it matter" + "show on profile" for starred questions. */
function MattersRow({ k, d, set }: { k: string; d: RoommateDetails; set: (fn: (d: RoommateDetails) => RoommateDetails) => void }) {
  const imp = d.importance?.[k] || "somewhat";
  const vis = d.visible?.[k] !== false;
  return (
    <div className="mt-5 space-y-3 rounded-xl border bg-muted/30 p-4">
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-medium"><Star className="h-4 w-4 text-amber-500" /> How much does this matter to you?</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {IMPORTANCE.map((o) => (
            <button key={o.value} type="button" aria-pressed={imp === o.value}
              onClick={() => set((x) => ({ ...x, importance: { ...(x.importance || {}), [k]: o.value as Importance } }))}
              className={cn("rounded-lg border px-2 py-1.5 text-sm transition",
                imp === o.value ? (o.value === "dealbreaker" ? "border-rose-500 bg-rose-500 text-white" : "border-primary bg-primary text-primary-foreground") : "bg-background hover:border-primary/60")}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-1.5">{vis ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />} Show this answer on my profile</span>
        <Switch checked={vis} onCheckedChange={(on) => set((x) => ({ ...x, visible: { ...(x.visible || {}), [k]: on } }))} />
      </label>
    </div>
  );
}

function Field({ label, required, hint, error, children }: { label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}{required ? <span className="text-destructive"> *</span> : <span className="font-normal text-muted-foreground"> (optional)</span>}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function DocPicker({ label, required, file, existing, onPick }: { label: string; required?: boolean; file?: File; existing?: string; onPick: (f?: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <Field label={label} required={required}>
      <button type="button" onClick={() => ref.current?.click()}
        className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 text-left text-sm hover:border-primary">
        <FileUp className="h-5 w-5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">
          {file ? file.name : existing ? "Uploaded — tap to replace" : "Tap to upload (JPG, PNG or PDF)"}
        </span>
        {existing && !file && <a href={existing} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-primary underline">View</a>}
      </button>
      <input ref={ref} type="file" accept="image/*,application/pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} />
    </Field>
  );
}

export function RoommateListingForm({
  mode, initialDetails, initialFields, existingMedia, submitting, onSubmit, onCancel,
}: {
  mode: "create" | "edit";
  initialDetails?: RoommateDetails;
  initialFields?: Partial<RoommateFields>;
  existingMedia?: ExistingMedia;
  submitting?: boolean;
  onSubmit: (r: RoommateFormResult) => void;
  onCancel?: () => void;
}) {
  const [d, setD] = useState<RoommateDetails>(() => ({ ...defaultDetails(), ...(initialDetails || {}) }));
  const [f, setF] = useState<RoommateFields>(() => ({ ...emptyFields, ...(initialFields || {}) }));
  const [i, setI] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [removeIds, setRemoveIds] = useState<string[]>([]);
  const [docs, setDocs] = useState<{ aadhaar?: File; electricity?: File; noc?: File }>({});
  const topRef = useRef<HTMLDivElement>(null);
  const restored = useRef(false);

  // New listing: keep a draft (answers only, not files) so a refresh doesn't lose everything
  useEffect(() => {
    if (mode !== "create" || restored.current) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved?.d) setD((x) => ({ ...x, ...saved.d }));
        if (saved?.f) setF((x) => ({ ...x, ...saved.f }));
        if (typeof saved?.i === "number") setI(Math.min(saved.i, STEPS.length - 1));
      } else {
        // Prefill from the profile the user filled after sign-up
        const prof = JSON.parse(localStorage.getItem("setmystay_profile") || "null");
        const name = (prof?.name || localStorage.getItem("user_name") || "").trim().split(/\s+/)[0] || "";
        const phone = String(prof?.phone || "").replace(/^\+91/, "").replace(/\D/g, "");
        setD((x) => ({ ...x, first_name: x.first_name || name }));
        if (/^\d{10}$/.test(phone)) setF((x) => ({ ...x, phone_primary: x.phone_primary || phone }));
      }
    } catch { /* ignore */ }
  }, [mode]);
  useEffect(() => {
    if (mode !== "create" || !restored.current) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ d, f, i })); } catch { /* ignore */ }
  }, [d, f, i, mode]);

  const keptPhotos = (existingMedia?.photos || []).filter((p) => !removeIds.includes(p.id));
  const photoCount = keptPhotos.length + newPhotos.length;
  const previews = useMemo(() => newPhotos.map((file) => URL.createObjectURL(file)), [newPhotos]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const pct = roommateCompletion(d, {
    rent: f.rent, city: f.city, locality: f.locality, address: f.address, phone_primary: f.phone_primary, description: f.description,
    photoCount, hasAadhaar: !!(docs.aadhaar || existingMedia?.aadhaar), hasElectricity: !!(docs.electricity || existingMedia?.electricity),
  });

  const { step, section } = STEPS[i];
  const sectionIndex = SECTIONS.findIndex((s) => s.title === section);
  const answers = d.answers || {};
  const setAnswer = (k: string, v: string) => setD((x) => ({ ...x, answers: { ...(x.answers || {}), [k]: v } }));
  const setField = (k: keyof RoommateFields, v: string) => setF((x) => ({ ...x, [k]: v }));

  const citySuggestions = f.state ? indianCitiesByState[f.state] || [] : allIndianCities;
  const areaSuggestions = f.city ? indianAreas[f.city] || [] : [];

  /** Required checks for one screen. Returns the first problem, or null. */
  function check(s: string): string | null {
    if (s === "about") {
      if (!d.first_name?.trim() || d.first_name.trim().length < 2) return "Please enter your first name.";
      const age = Number(d.age);
      if (!age || age < 18 || age > 99) return "Please enter your age (18 or older).";
      if (!d.gender) return "Please choose your gender.";
      if (!d.occupation) return "Please tell us what you do.";
      if (!d.open_to) return "Please choose who you are open to living with.";
      return null;
    }
    if (s === "search") {
      if (!d.has_place) return "Please tell us if you already have a place.";
      const rent = Number(f.rent);
      if (!rent || rent < 1000) return d.has_place === "has_place" ? "Please enter the rent per person (at least ₹1,000)." : "Please enter your monthly budget (at least ₹1,000).";
      if (!indianStates.includes(f.state)) return "Please choose your state.";
      if (!f.city) return "Please choose your city.";
      if (!f.locality.trim()) return "Please enter the area / locality.";
      if (d.has_place === "has_place" && f.address.trim().length < 10) return "Please enter the full address of your place.";
      return null;
    }
    if (s === "smoke") return !answers.smoke ? "Please answer about smoking." : !answers.weed ? "Please answer about weed." : null;
    if (QUESTIONS[s]) return answers[s] ? null : "Please pick an answer.";
    if (s === "contact") {
      if (!/^\d{10}$/.test(f.phone_primary)) return "Please enter a 10-digit phone number.";
      if (f.phone_secondary && !/^\d{10}$/.test(f.phone_secondary)) return "The second phone number must be 10 digits.";
      if (f.vendor_number.trim().length > 50) return "The vendor number can be at most 50 characters.";
      return null;
    }
    if (s === "prompts") {
      const bad = (d.prompts || []).find((p) => !p.a.trim());
      return bad ? "Write an answer for each prompt you picked, or remove it." : null;
    }
    if (s === "media") {
      if (photoCount < 1) return "Please add at least one photo.";
      if (!docs.aadhaar && !existingMedia?.aadhaar) return "Please upload your Aadhaar / ID proof.";
      if (d.has_place === "has_place" && !docs.electricity && !existingMedia?.electricity) return "Please upload an electricity bill of the place.";
      return null;
    }
    return null;
  }

  const go = (to: number) => {
    setError(null);
    setI(Math.max(0, Math.min(STEPS.length - 1, to)));
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const next = () => {
    const e = check(step);
    if (e) { setError(e); return; }
    if (i < STEPS.length - 1) { go(i + 1); return; }
    submitAll();
  };
  const submitAll = () => {
    // Make sure every required screen is done (an edit can jump around)
    const firstBad = STEPS.findIndex((s) => check(s.step));
    if (firstBad !== -1) { go(firstBad); setTimeout(() => setError(check(STEPS[firstBad].step)), 0); return; }
    const prompts = (d.prompts || []).filter((p) => p.a.trim()).map((p) => ({ q: p.q, a: p.a.trim().slice(0, 150) }));
    onSubmit({
      details: { ...d, first_name: d.first_name?.trim(), age: Number(d.age), prompts, medical_note: answers.medical === "no" ? "" : (d.medical_note || "").trim() },
      fields: { ...f, locality: f.locality.trim(), address: f.address.trim(), description: f.description.trim(), vendor_number: (f.vendor_number || "").trim() },
      newPhotos, removeImageIds: removeIds, docs,
    });
  };

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const imgs = Array.from(files).filter((x) => x.type.startsWith("image/"));
    const room = MAX_PHOTOS - photoCount;
    if (imgs.length > room) setError(`You can add up to ${MAX_PHOTOS} photos.`);
    setNewPhotos((p) => [...p, ...imgs.slice(0, Math.max(0, room))]);
  };
  const pickDoc = (k: "aadhaar" | "electricity" | "noc") => (file?: File) => {
    if (file && !DOC_TYPES.includes(file.type)) { setError("Documents must be JPG, PNG or PDF."); return; }
    if (file && file.size > 10 * 1024 * 1024) { setError("Each document must be under 10 MB."); return; }
    setError(null);
    setDocs((x) => ({ ...x, [k]: file }));
  };

  const q = QUESTIONS[step];
  const last = i === STEPS.length - 1;

  return (
    <div ref={topRef} className="mx-auto max-w-2xl scroll-mt-28">
      {/* progress */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-primary">{section}</span>
          <span className="text-muted-foreground">Question {i + 1} of {STEPS.length}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${((i + 1) / STEPS.length) * 100}%` }} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SECTIONS.map((s, n) => (
            <button key={s.title} type="button" onClick={() => mode === "edit" || n <= sectionIndex ? go(STEPS.findIndex((x) => x.section === s.title)) : undefined}
              className={cn("rounded-full px-2.5 py-0.5 text-xs transition",
                n === sectionIndex ? "bg-primary text-primary-foreground" : n < sectionIndex || mode === "edit" ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-muted text-muted-foreground")}
              disabled={!(mode === "edit" || n <= sectionIndex)}>
              {s.title}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5">
          <div className="relative h-10 w-10 shrink-0">
            <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                className={pct >= 80 ? "text-emerald-500" : pct >= 50 ? "text-amber-500" : "text-rose-500"}
                strokeDasharray={`${(pct / 100) * 97.4} 97.4`} />
            </svg>
          </div>
          <div className="text-sm">
            <p className="font-semibold">Profile {pct}% complete</p>
            <p className="text-muted-foreground">Answer the optional questions too for better matches.</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        {step === "about" && (
          <div className="space-y-5">
            <h2 className="text-2xl font-semibold">Tell us about yourself</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" required>
                <Input value={d.first_name || ""} maxLength={40} onChange={(e) => setD((x) => ({ ...x, first_name: e.target.value }))} placeholder="e.g. Riya" />
              </Field>
              <Field label="Age" required>
                <Input type="number" inputMode="numeric" min={18} max={99} value={d.age ?? ""} onChange={(e) => setD((x) => ({ ...x, age: e.target.value ? Number(e.target.value) : null }))} placeholder="e.g. 24" />
              </Field>
            </div>
            <Field label="Gender" required><Choice cols={3} options={PROFILE_OPTIONS.gender} value={d.gender} onChange={(v) => setD((x) => ({ ...x, gender: v }))} /></Field>
            <Field label="What do you do?" required><Choice cols={3} options={PROFILE_OPTIONS.occupation} value={d.occupation} onChange={(v) => setD((x) => ({ ...x, occupation: v }))} /></Field>
            <Field label="College / company">
              <Input value={d.workplace || ""} maxLength={80} onChange={(e) => setD((x) => ({ ...x, workplace: e.target.value }))} placeholder="e.g. IIT Bombay, TCS" />
            </Field>
            <Field label="Open to living with" required><Choice cols={3} options={PROFILE_OPTIONS.open_to} value={d.open_to} onChange={(v) => setD((x) => ({ ...x, open_to: v }))} /></Field>
          </div>
        )}

        {step === "search" && (
          <div className="space-y-5">
            <h2 className="text-2xl font-semibold">Where and what are you looking for?</h2>
            <Field label="Your situation" required><Choice options={PROFILE_OPTIONS.has_place} value={d.has_place} onChange={(v) => setD((x) => ({ ...x, has_place: v }))} /></Field>
            <Field label={d.has_place === "has_place" ? "Rent per person (₹ / month)" : "Your monthly budget (₹)"} required>
              <Input type="number" inputMode="numeric" min={1000} value={f.rent} onChange={(e) => setField("rent", e.target.value)} placeholder="e.g. 12000" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="State" required>
                <SearchableSelect placeholder="Select state..." searchPlaceholder="Search state..." emptyText="No matching state." value={f.state}
                  onChange={(v) => setF((x) => ({ ...x, state: v, city: x.state === v ? x.city : "", locality: x.state === v ? x.locality : "" }))} options={indianStates} />
              </Field>
              <Field label="City" required>
                <SearchableSelect placeholder={f.state ? "Select city..." : "Select state first"} searchPlaceholder="Search city..." emptyText="No city found." value={f.city}
                  onChange={(v) => setF((x) => ({ ...x, city: v, locality: x.city === v ? x.locality : "" }))} options={citySuggestions} disabled={!f.state} />
              </Field>
            </div>
            <Field label="Area / locality" required>
              <AutocompleteInput placeholder="e.g. Kharghar" value={f.locality} onChange={(v) => setField("locality", v)} suggestions={areaSuggestions} />
            </Field>
            {d.has_place === "has_place" && (
              <Field label="Full address of your place" required hint="Only shown to people who unlock your contact details.">
                <Textarea rows={2} value={f.address} onChange={(e) => setField("address", e.target.value)} placeholder="Building, street, landmark" />
              </Field>
            )}
            <Field label="Move-in date">
              <Input type="date" value={d.move_in || ""} onChange={(e) => setD((x) => ({ ...x, move_in: e.target.value }))} />
            </Field>
            <Field label="A few lines about you">
              <Textarea rows={3} maxLength={600} value={f.description} onChange={(e) => setField("description", e.target.value)} placeholder="What you're like, what you're looking for in a roommate…" />
            </Field>
          </div>
        )}

        {q && step !== "smoke" && step !== "medical" && (
          <div>
            <h2 className="mb-5 text-2xl font-semibold">{q.title}<span className="text-destructive"> *</span></h2>
            <Choice options={q.options} value={answers[step]} onChange={(v) => setAnswer(step, v)} />
            {q.starred && <MattersRow k={step} d={d} set={setD} />}
          </div>
        )}

        {step === "smoke" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Do you smoke or use weed?</h2>
            <Field label="Smoking" required><Choice cols={2} options={QUESTIONS.smoke.options} value={answers.smoke} onChange={(v) => setAnswer("smoke", v)} /></Field>
            <Field label="Weed" required><Choice cols={3} options={QUESTIONS.weed.options} value={answers.weed} onChange={(v) => setAnswer("weed", v)} /></Field>
            <MattersRow k="smoke" d={d} set={setD} />
          </div>
        )}

        {step === "medical" && (
          <div className="space-y-5">
            <h2 className="text-2xl font-semibold">{QUESTIONS.medical.title}<span className="text-destructive"> *</span></h2>
            <Choice options={QUESTIONS.medical.options} value={answers.medical} onChange={(v) => setAnswer("medical", v)} />
            {answers.medical && answers.medical !== "no" && (
              <Field label="Anything they should know?" hint="Allergies, medicines, emergency contact. Only people who unlock your profile see this.">
                <Textarea rows={3} maxLength={300} value={d.medical_note || ""} onChange={(e) => setD((x) => ({ ...x, medical_note: e.target.value }))} />
              </Field>
            )}
          </div>
        )}

        {step === "interests" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Interests & languages</h2>
            <Field label="Interests"><Chips options={INTERESTS} value={d.interests || []} onChange={(v) => setD((x) => ({ ...x, interests: v }))} /></Field>
            <Field label="Languages you speak"><Chips options={LANGUAGES} value={d.languages || []} onChange={(v) => setD((x) => ({ ...x, languages: v }))} /></Field>
            <MattersRow k="interests" d={d} set={setD} />
          </div>
        )}

        {step === "prompts" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-semibold">Pick up to 3 prompts</h2>
              <p className="mt-1 text-sm text-muted-foreground">Optional, but profiles with prompts get more replies. Max 150 characters each.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {PROMPTS.map((p) => {
                const on = (d.prompts || []).some((x) => x.q === p.value);
                const full = (d.prompts || []).length >= 3 && !on;
                return (
                  <button key={p.value} type="button" disabled={full}
                    onClick={() => setD((x) => ({ ...x, prompts: on ? (x.prompts || []).filter((y) => y.q !== p.value) : [...(x.prompts || []), { q: p.value, a: "" }] }))}
                    className={cn("rounded-full border px-3.5 py-1.5 text-sm transition disabled:opacity-40", on ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/60")}>
                    {p.label}
                  </button>
                );
              })}
            </div>
            {(d.prompts || []).map((p) => (
              <div key={p.q} className="space-y-1.5 rounded-xl border p-4">
                <div className="flex items-center justify-between gap-2">
                  <Label>{PROMPTS.find((x) => x.value === p.q)?.label}</Label>
                  <button type="button" aria-label="Remove prompt" onClick={() => setD((x) => ({ ...x, prompts: (x.prompts || []).filter((y) => y.q !== p.q) }))}><X className="h-4 w-4 text-muted-foreground" /></button>
                </div>
                <Textarea rows={2} maxLength={150} value={p.a} onChange={(e) => setD((x) => ({ ...x, prompts: (x.prompts || []).map((y) => (y.q === p.q ? { ...y, a: e.target.value } : y)) }))} />
                <p className="text-right text-xs text-muted-foreground">{p.a.length}/150</p>
              </div>
            ))}
          </div>
        )}

        {step === "contact" && (
          <div className="space-y-5">
            <h2 className="text-2xl font-semibold">How can people reach you?</h2>
            <p className="-mt-3 text-sm text-muted-foreground">Your number is only shown to people who unlock your profile.</p>
            <Field label="Phone number" required>
              <div className="flex gap-2">
                <span className="flex h-9 items-center rounded-xl border bg-muted px-3 text-sm">+91</span>
                <Input inputMode="numeric" autoComplete="tel-national" value={f.phone_primary} placeholder="9876543210"
                  onChange={(e) => setField("phone_primary", e.target.value.replace(/\D/g, "").slice(0, 10))} />
              </div>
            </Field>
            <Field label="Second phone number">
              <div className="flex gap-2">
                <span className="flex h-9 items-center rounded-xl border bg-muted px-3 text-sm">+91</span>
                <Input inputMode="numeric" value={f.phone_secondary} placeholder="Optional"
                  onChange={(e) => setField("phone_secondary", e.target.value.replace(/\D/g, "").slice(0, 10))} />
              </div>
            </Field>
            <Field label="Vendor number" hint="Only if our team gave you a vendor number. Leave it empty otherwise.">
              <Input value={f.vendor_number} maxLength={50} placeholder="e.g. VN-1024" autoComplete="off"
                onChange={(e) => setField("vendor_number", e.target.value)} />
            </Field>
          </div>
        )}

        {step === "media" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold">Photos & verification</h2>
              <p className="mt-1 text-sm text-muted-foreground">Add a clear photo of yourself{d.has_place === "has_place" ? " and photos of the place" : ""}. Documents are only seen by our review team.</p>
            </div>
            <Field label={`Photos (${photoCount}/${MAX_PHOTOS})`} required>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {keptPhotos.map((p) => (
                  <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg border">
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                    <button type="button" aria-label="Remove photo" onClick={() => setRemoveIds((r) => [...r, p.id])}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                {previews.map((u, n) => (
                  <div key={u} className="relative aspect-square overflow-hidden rounded-lg border">
                    <img src={u} alt="" className="h-full w-full object-cover" />
                    <span className="absolute left-1 top-1 rounded bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">New</span>
                    <button type="button" aria-label="Remove photo" onClick={() => setNewPhotos((p) => p.filter((_, k) => k !== n))}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                {photoCount < MAX_PHOTOS && (
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground hover:border-primary">
                    <ImagePlus className="h-6 w-6" /> Add photos
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
                  </label>
                )}
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <DocPicker label="Aadhaar / ID proof" required file={docs.aadhaar} existing={existingMedia?.aadhaar} onPick={pickDoc("aadhaar")} />
              <DocPicker label="Electricity bill of the place" required={d.has_place === "has_place"} file={docs.electricity} existing={existingMedia?.electricity} onPick={pickDoc("electricity")} />
              <DocPicker label="NOC / rent agreement" file={docs.noc} existing={existingMedia?.noc} onPick={pickDoc("noc")} />
            </div>
          </div>
        )}

        {error && <p role="alert" className="mt-5 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          {i > 0 ? (
            <Button type="button" variant="outline" onClick={() => go(i - 1)} disabled={submitting}><ArrowLeft className="mr-1 h-4 w-4" />Back</Button>
          ) : onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>Cancel</Button>
          ) : <span />}
          <div className="flex gap-2">
          {mode === "edit" && !last && (
            <Button type="button" variant="secondary" onClick={submitAll} disabled={submitting}>{submitting ? "Saving..." : "Save changes"}</Button>
          )}
          <Button type="button" onClick={next} disabled={submitting} className="min-w-[9rem]">
            {last ? (submitting ? "Saving..." : mode === "edit" ? "Save changes" : "Continue to payment") : <>Next <ArrowRight className="ml-1 h-4 w-4" /></>}
          </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const clearRoommateDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } };
