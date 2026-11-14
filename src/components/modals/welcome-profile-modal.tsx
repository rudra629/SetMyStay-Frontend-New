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

const schema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().regex(/^\+?[0-9]{10,13}$/, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email").max(255),
  address: z.string().trim().min(5, "Enter your address").max(300),
});
type Form = z.infer<typeof schema>;
const DONE_KEY = "setmystay_profile_done";
const accountKey = () => localStorage.getItem("user_email") || localStorage.getItem("user_name") || "guest";

export function WelcomeProfileModal({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>({ name: "", phone: "", email: "", address: "" });
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
    setOpen(true);
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
    setErrors({}); setSaving(true);
    try {
      await api.put("/users/complete-profile/", { first_name: r.data.name, phone_number: r.data.phone, email: r.data.email, address: r.data.address, role: "SEEKER" }).catch(() => null);
      const key = accountKey();
      let done: string[] = [];
      try { done = JSON.parse(localStorage.getItem(DONE_KEY) || "[]"); } catch { /* ignore */ }
      localStorage.setItem(DONE_KEY, JSON.stringify([...done, key]));
      localStorage.setItem("setmystay_profile", JSON.stringify(r.data));
      localStorage.setItem("is_profile_complete", "true");
      addProfile(r.data as any);
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
          {field("phone", "Phone number", "tel")}
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
