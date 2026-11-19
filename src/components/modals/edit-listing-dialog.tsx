"use client";

import { useEffect, useMemo, useState } from "react";
import { FileUp, ImagePlus, Loader2, X } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { AutocompleteInput } from "@/components/shared/autocomplete-input";
import { indianStates } from "@/lib/states";
import { allIndianCities, indianCitiesByState } from "@/lib/cities";
import { indianAreas } from "@/lib/areas";

const MAX_PHOTOS = 8;
const COMMON_AMENITIES = ["AC", "Wi-Fi", "Parking", "Lift/Elevator", "Security", "Power Backup", "Balcony", "Gymnasium",
  "In-house Mess", "Washing Machine (Private/Common)", "Refrigerator", "Attached Bathroom", "Housekeeping", "CCTV Surveillance"];

type Form = {
  title: string; description: string; rent: string; sq_ft: string; state: string; city: string; area: string; address: string;
  owner_name: string; phone_primary: string; phone_secondary: string; bhk: string; furnishing: string; occupancy_type: string;
  is_broker: string; amenities: string[];
};

const last10 = (v?: string) => String(v || "").replace(/\D/g, "").slice(-10);
const isPlaceholder = (u: string) => /placehold\.co/.test(u);
// Older listings saved "1BHK" / "Semi": match them to the dropdown values
const normBhk = (v?: string) => {
  const t = String(v || "").trim();
  if (/^1\s*rk$/i.test(t)) return "1 RK";
  const m = t.match(/^(\d)\s*\+?\s*bhk$/i);
  if (!m) return t;
  return Number(m[1]) >= 4 ? "4+ BHK" : `${m[1]} BHK`;
};
const normFurnishing = (v?: string) => {
  const t = String(v || "").trim().toLowerCase();
  if (t.startsWith("semi")) return "Semi-Furnished";
  if (t.startsWith("un")) return "Unfurnished";
  if (t.startsWith("furn") || t === "full" || t === "fully furnished") return "Furnished";
  return v || "";
};

function Row({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required ? <span className="text-destructive"> *</span> : <span className="font-normal text-muted-foreground"> (optional)</span>}</Label>
      {children}
    </div>
  );
}

function DocButton({ label, existing, file, onPick, required }: { label: string; existing?: string; file?: File; onPick: (f: File) => void; required?: boolean }) {
  return (
    <Row label={label} required={required}>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-3 py-2.5 text-sm hover:border-primary">
        <FileUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{file ? file.name : existing ? "Uploaded — tap to replace" : "Tap to upload"}</span>
        {existing && !file && <a href={existing} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-primary underline">View</a>}
        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} />
      </label>
    </Row>
  );
}

/** Owner edits a PG / rental listing (My Properties > Edit). Roommate profiles use the roommate form instead. */
export function EditListingDialog({ listingId, open, onClose, onSaved }: { listingId: string | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);
  const [removeIds, setRemoveIds] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [docs, setDocs] = useState<{ aadhaar?: string; electricity?: string; noc?: string }>({});
  const [newDocs, setNewDocs] = useState<{ aadhaar?: File; electricity?: File; noc?: File }>({});
  const [video, setVideo] = useState<File | null>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraAmenity, setExtraAmenity] = useState("");

  useEffect(() => {
    if (!open || !listingId) return;
    let alive = true;
    setLoading(true); setError(null); setForm(null); setRemoveIds([]); setNewPhotos([]); setNewDocs({}); setVideo(null);
    api.get(`/properties/${listingId}/`).then(({ data }) => {
      if (!alive) return;
      const imgs = Array.isArray(data.images) ? data.images : [];
      setType(String(data.property_type || "").toUpperCase());
      setPhotos(imgs.filter((x: any) => !x.is_video && x.image_url && !isPlaceholder(x.image_url)).map((x: any) => ({ id: String(x.id), url: x.image_url })));
      setHasVideo(imgs.some((x: any) => x.is_video));
      setDocs({ aadhaar: data.document_aadhaar || undefined, electricity: data.document_electricity || undefined, noc: data.document_noc || undefined });
      setForm({
        title: data.title || "", description: data.description || "", rent: data.rent ? String(data.rent) : "", sq_ft: data.sq_ft ? String(data.sq_ft) : "",
        state: data.state || "", city: data.city || "", area: data.area || "", address: data.address || "",
        owner_name: data.owner_name || "", phone_primary: last10(data.phone_primary), phone_secondary: last10(data.phone_secondary),
        bhk: normBhk(data.bhk), furnishing: normFurnishing(data.furnishing), occupancy_type: data.occupancy_type || "",
        is_broker: data.is_broker ? "With Broker" : "Without Broker",
        amenities: (data.amenities || []).map((a: any) => (typeof a === "string" ? a : a?.name)).filter(Boolean),
      });
    }).catch(() => { if (alive) setError("Could not load this listing. Please try again."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, listingId]);

  const previews = useMemo(() => newPhotos.map((f) => URL.createObjectURL(f)), [newPhotos]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  if (!open) return null;
  const set = (k: keyof Form, v: any) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const kept = photos.filter((p) => !removeIds.includes(p.id));
  const photoCount = kept.length + newPhotos.length;
  const isRental = type === "RENTAL";
  const isPG = type === "PG";

  const validate = (f: Form): string | null => {
    if (f.title.trim().length < 5) return "Title must be at least 5 characters.";
    if (!Number(f.rent) || Number(f.rent) < 1000) return "Rent must be at least ₹1,000.";
    if (!indianStates.includes(f.state)) return "Please choose a state.";
    if (!f.city) return "Please choose a city.";
    if (!f.area.trim()) return "Please enter the area / locality.";
    if (f.address.trim().length < 10) return "Please enter the full address.";
    if (f.owner_name.trim().length < 2) return "Please enter the owner's name.";
    if (!/^\d{10}$/.test(f.phone_primary)) return "Phone number must be 10 digits.";
    if (f.phone_secondary && !/^\d{10}$/.test(f.phone_secondary)) return "Second phone number must be 10 digits.";
    if (isRental && !f.bhk) return "Please choose the BHK.";
    if (isPG && !f.occupancy_type) return "Please choose the room type.";
    if ((isRental || isPG) && !f.furnishing) return "Please choose the furnishing.";
    if (photoCount < 1) return "Keep at least one photo.";
    return null;
  };

  const save = async () => {
    if (!form || !listingId) return;
    const e = validate(form);
    if (e) { setError(e); return; }
    setError(null); setSaving(true);
    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("description", form.description.trim());
    fd.append("rent", String(Math.round(Number(form.rent))));
    if (form.sq_ft) fd.append("sq_ft", String(Math.round(Number(form.sq_ft))));
    fd.append("state", form.state); fd.append("city", form.city); fd.append("area", form.area.trim()); fd.append("address", form.address.trim());
    fd.append("owner_name", form.owner_name.trim());
    fd.append("phone_primary", form.phone_primary); fd.append("phone_secondary", form.phone_secondary || "");
    if (isRental) { fd.append("bhk", form.bhk); fd.append("is_broker", form.is_broker === "With Broker" ? "True" : "False"); }
    if (isPG) fd.append("occupancy_type", form.occupancy_type);
    if (isRental || isPG) fd.append("furnishing", form.furnishing);
    fd.append("amenities_list", form.amenities.join(","));
    newPhotos.forEach((f) => fd.append("uploaded_images", f));
    if (removeIds.length) fd.append("remove_image_ids", removeIds.join(","));
    if (video) fd.append("uploaded_video", video);
    if (newDocs.aadhaar) fd.append("document_aadhaar", newDocs.aadhaar);
    if (newDocs.electricity) fd.append("document_electricity", newDocs.electricity);
    if (newDocs.noc) fd.append("document_noc", newDocs.noc);
    try {
      await api.patch(`/properties/${listingId}/`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast({ title: "Changes saved", description: "Your listing is updated." });
      onSaved();
    } catch (err: any) {
      const d = err?.response?.data;
      const first = d && typeof d === "object" ? Object.values(d)[0] : null;
      setError(d?.error || (Array.isArray(first) ? String(first[0]) : first ? String(first) : "Could not save. Please check your internet and try again."));
    } finally { setSaving(false); }
  };

  const cities = form?.state ? indianCitiesByState[form.state] || [] : allIndianCities;
  const areas = form?.city ? indianAreas[form.city] || [] : [];
  const amenityChoices = Array.from(new Set([...COMMON_AMENITIES, ...(form?.amenities || [])]));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !saving) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit listing</DialogTitle>
          <DialogDescription>Change any detail, photo or document, then press Save.</DialogDescription>
        </DialogHeader>
        {loading || !form ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            {error ? error : <><Loader2 className="h-5 w-5 animate-spin" /> Loading…</>}
          </div>
        ) : (
          <div className="space-y-5">
            <Row label="Title" required><Input value={form.title} maxLength={200} onChange={(e) => set("title", e.target.value)} /></Row>
            <div className="grid gap-4 sm:grid-cols-2">
              <Row label="Rent (₹ / month)" required><Input type="number" min={1000} value={form.rent} onChange={(e) => set("rent", e.target.value)} /></Row>
              <Row label="Size (sq ft)"><Input type="number" min={50} value={form.sq_ft} onChange={(e) => set("sq_ft", e.target.value)} /></Row>
            </div>
            {(isRental || isPG) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {isRental && (
                  <Row label="BHK" required>
                    <Select value={form.bhk} onValueChange={(v) => set("bhk", v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{["1 RK", "1 BHK", "2 BHK", "3 BHK", "4+ BHK"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                    </Select>
                  </Row>
                )}
                {isPG && (
                  <Row label="Room type" required>
                    <Select value={form.occupancy_type} onValueChange={(v) => set("occupancy_type", v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{["Single Room", "Double Sharing", "Triple Sharing"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                    </Select>
                  </Row>
                )}
                <Row label="Furnishing" required>
                  <Select value={form.furnishing} onValueChange={(v) => set("furnishing", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{["Furnished", "Semi-Furnished", "Unfurnished"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                  </Select>
                </Row>
                {isRental && (
                  <Row label="Broker" required>
                    <Select value={form.is_broker} onValueChange={(v) => set("is_broker", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Without Broker">Without Broker</SelectItem><SelectItem value="With Broker">With Broker</SelectItem></SelectContent>
                    </Select>
                  </Row>
                )}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Row label="State" required>
                <SearchableSelect placeholder="Select state..." searchPlaceholder="Search state..." emptyText="No state found." value={form.state} options={indianStates}
                  onChange={(v) => setForm((f) => f && ({ ...f, state: v, city: f.state === v ? f.city : "", area: f.state === v ? f.area : "" }))} />
              </Row>
              <Row label="City" required>
                <SearchableSelect placeholder="Select city..." searchPlaceholder="Search city..." emptyText="No city found." value={form.city} options={cities} disabled={!form.state}
                  onChange={(v) => setForm((f) => f && ({ ...f, city: v, area: f.city === v ? f.area : "" }))} />
              </Row>
            </div>
            <Row label="Area / locality" required><AutocompleteInput placeholder="e.g. Kharghar" value={form.area} onChange={(v) => set("area", v)} suggestions={areas} /></Row>
            <Row label="Full address" required><Textarea rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} /></Row>
            <Row label="Description"><Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} /></Row>
            <div className="grid gap-4 sm:grid-cols-3">
              <Row label="Owner name" required><Input value={form.owner_name} onChange={(e) => set("owner_name", e.target.value)} /></Row>
              <Row label="Phone" required><Input inputMode="numeric" value={form.phone_primary} onChange={(e) => set("phone_primary", e.target.value.replace(/\D/g, "").slice(0, 10))} /></Row>
              <Row label="Second phone"><Input inputMode="numeric" value={form.phone_secondary} onChange={(e) => set("phone_secondary", e.target.value.replace(/\D/g, "").slice(0, 10))} /></Row>
            </div>
            <Row label="Amenities">
              <div className="flex flex-wrap gap-2">
                {amenityChoices.map((a) => {
                  const on = form.amenities.includes(a);
                  return (
                    <button key={a} type="button" aria-pressed={on} onClick={() => set("amenities", on ? form.amenities.filter((x) => x !== a) : [...form.amenities, a])}
                      className={`rounded-full border px-3 py-1 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/60"}`}>{a}</button>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2">
                <Input value={extraAmenity} onChange={(e) => setExtraAmenity(e.target.value)} placeholder="Add another amenity" maxLength={40} />
                <Button type="button" variant="outline" onClick={() => { const a = extraAmenity.trim().replace(/,/g, " "); if (a && !form.amenities.includes(a)) set("amenities", [...form.amenities, a]); setExtraAmenity(""); }}>Add</Button>
              </div>
            </Row>
            <Row label={`Photos (${photoCount}/${MAX_PHOTOS})`} required>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {kept.map((p) => (
                  <div key={p.id} className="relative aspect-square overflow-hidden rounded-lg border">
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                    <button type="button" aria-label="Remove photo" onClick={() => setRemoveIds((r) => [...r, p.id])} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                {previews.map((u, n) => (
                  <div key={u} className="relative aspect-square overflow-hidden rounded-lg border">
                    <img src={u} alt="" className="h-full w-full object-cover" />
                    <button type="button" aria-label="Remove photo" onClick={() => setNewPhotos((p) => p.filter((_, k) => k !== n))} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                {photoCount < MAX_PHOTOS && (
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground hover:border-primary">
                    <ImagePlus className="h-6 w-6" /> Add
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                      const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
                      setNewPhotos((p) => [...p, ...files].slice(0, MAX_PHOTOS - kept.length)); e.target.value = "";
                    }} />
                  </label>
                )}
              </div>
            </Row>
            <Row label="Video tour">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-3 py-2.5 text-sm hover:border-primary">
                <FileUp className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{video ? video.name : hasVideo ? "Uploaded — tap to replace" : "Tap to upload a video"}</span>
                <input type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setVideo(f); e.target.value = ""; }} />
              </label>
            </Row>
            <div className="grid gap-4 sm:grid-cols-3">
              <DocButton label="Aadhaar card" existing={docs.aadhaar} file={newDocs.aadhaar} onPick={(f) => setNewDocs((d) => ({ ...d, aadhaar: f }))} />
              <DocButton label="Electricity bill" existing={docs.electricity} file={newDocs.electricity} onPick={(f) => setNewDocs((d) => ({ ...d, electricity: f }))} />
              <DocButton label="NOC" existing={docs.noc} file={newDocs.noc} onPick={(f) => setNewDocs((d) => ({ ...d, noc: f }))} />
            </div>
            {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save changes"}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
