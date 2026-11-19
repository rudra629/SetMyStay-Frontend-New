import { useEffect, useState } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import api from "@/lib/api";
import { addProfile } from "@/lib/app-settings";

// Country codes for the phone field (India first)
const COUNTRY_CODES: { code: string; label: string }[] = [
  { code: "+91", label: "IN +91" }, { code: "+1", label: "US/CA +1" }, { code: "+44", label: "UK +44" },
  { code: "+971", label: "UAE +971" }, { code: "+966", label: "SA +966" }, { code: "+974", label: "QA +974" },
  { code: "+968", label: "OM +968" }, { code: "+965", label: "KW +965" }, { code: "+973", label: "BH +973" },
  { code: "+65", label: "SG +65" }, { code: "+60", label: "MY +60" }, { code: "+61", label: "AU +61" },
  { code: "+64", label: "NZ +64" }, { code: "+49", label: "DE +49" }, { code: "+33", label: "FR +33" },
  { code: "+977", label: "NP +977" }, { code: "+880", label: "BD +880" }, { code: "+94", label: "LK +94" },
  { code: "+92", label: "PK +92" }, { code: "+81", label: "JP +81" },
];
/** "+919876543210" -> ["+91", "9876543210"] (longest matching code wins) */
const splitPhone = (full: string): [string, string] => {
  const v = (full || "").replace(/[\s-]/g, "");
  if (!v.startsWith("+")) return ["+91", v];
  const hit = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length).find((c) => v.startsWith(c.code));
  return hit ? [hit.code, v.slice(hit.code.length)] : ["+91", v.replace(/^\+/, "")];
};

const schema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().regex(/^[0-9]{6,12}$/, "Enter a valid phone number (digits only)"),
  email: z.string().trim().email("Enter a valid email").max(255),
  address: z.string().trim().min(5, "Enter your address").max(300),
});
type Form = z.infer<typeof schema>;
const DONE_KEY = "setmystay_profile_done";
const accountKey = () => localStorage.getItem("user_email") || localStorage.getItem("user_name") || "guest";

export function WelcomeProfileModal({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>({ name: "", phone: "", email: "", address: "" });
  const [countryCode, setCountryCode] = useState("+91");
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return setOpen(false);
    if (localStorage.getItem("is_profile_complete") === "true") return setOpen(false);
    let done: string[] = [];
    try { done = JSON.parse(localStorage.getItem(DONE_KEY) || "[]"); } catch { /* ignore */ }
    const key = accountKey();
    if (key !== "guest" && (done.includes(key) || done.some(d => d.toLowerCase() === key.toLowerCase()))) {
      return setOpen(false);
    }
    setForm((f) => ({ ...f, name: localStorage.getItem("user_name") || "", email: localStorage.getItem("user_email") || "" }));
    // Ask the server first: the profile may already be complete (e.g. after clearing browser data)
    let cancelled = false;
    api.get("/users/complete-profile/")
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.is_profile_complete) {
          localStorage.setItem("is_profile_complete", "true");
          setOpen(false);
        } else {
          setForm((f) => ({ ...f, name: data?.first_name || f.name, email: data?.email || f.email, phone: data?.phone_number ? splitPhone(data.phone_number)[1] : f.phone, address: data?.address || f.address }));
          if (data?.phone_number) setCountryCode(splitPhone(data.phone_number)[0]);
          setOpen(true);
        }
      })
      .catch(() => { if (!cancelled) setOpen(true); });
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  const handleDismiss = () => {
    const key = accountKey();
    let done: string[] = [];
    try { done = JSON.parse(localStorage.getItem(DONE_KEY) || "[]"); } catch { /* ignore */ }
    localStorage.setItem(DONE_KEY, JSON.stringify([...done, key]));
    setOpen(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(form);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    const fullPhone = `${countryCode}${r.data.phone}`;
    if (fullPhone.length > 15) { setErrors({ phone: "This number is too long for the selected country code" }); return; }
    setErrors({}); setSaving(true);
    try {
      try {
        await api.put("/users/complete-profile/", { first_name: r.data.name, phone_number: fullPhone, email: r.data.email, address: r.data.address, role: "SEEKER" });
      } catch {
        toast.error("Could not save your details. Please check your internet and try again.");
        return;
      }
      const key = accountKey();
      let done: string[] = [];
      try { done = JSON.parse(localStorage.getItem(DONE_KEY) || "[]"); } catch { /* ignore */ }
      localStorage.setItem(DONE_KEY, JSON.stringify([...done, key]));
      localStorage.setItem("setmystay_profile", JSON.stringify({ ...r.data, phone: fullPhone }));
      localStorage.setItem("is_profile_complete", "true");
      addProfile({ ...r.data, phone: fullPhone } as any);
      localStorage.setItem("user_name", r.data.name);
      toast.success("Thanks! Your details are saved.");
      setOpen(false);
    } finally { setSaving(false); }
  };

  const field = (k: keyof Form, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={`wp-${k}`}>{label}</Label>
      {k === "address"
        ? <Textarea id={`wp-${k}`} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} rows={2} />
        : <Input id={`wp-${k}`} type={type} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />}
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleDismiss(); else setOpen(val); }}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Welcome to SetMyStay</DialogTitle>
          <DialogDescription>Tell us a little about yourself to continue.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {field("name", "Full name")}
          <div className="space-y-1.5">
            <Label htmlFor="wp-phone">Phone number</Label>
            <div className="flex gap-2">
              <select
                aria-label="Country code"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="h-9 w-[7.5rem] shrink-0 rounded-xl border border-input bg-transparent px-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
              >
                {COUNTRY_CODES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
              <Input
                id="wp-phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="9876543210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9]/g, "").slice(0, 12) })}
              />
            </div>
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>
          {field("email", "Email", "email")}
          {field("address", "Address")}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="w-1/3" onClick={handleDismiss}>Skip</Button>
            <Button type="submit" className="w-2/3" disabled={saving}>{saving ? "Saving..." : "Continue"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
