"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Users } from "lucide-react";
import api, { getMyProperties } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ListPropertyPaymentModal } from "@/components/modals/list-property-payment-modal";
import { feeFor, fetchAndCachePricing } from "@/lib/app-settings";
import { preferenceChips, type RoommateDetails } from "@/lib/roommate-form";
import {
  RoommateListingForm, clearRoommateDraft, type ExistingMedia, type RoommateFields, type RoommateFormResult,
} from "@/components/sections/roommate-listing-form";

const UNUSED_FEE_KEY = "setmystay_unused_listing_fee";

function friendlyError(error: any): string {
  const data = error?.response?.data;
  if (!error?.response) return "We couldn't reach the server. Check your internet and try again.";
  if (typeof data === "string") return "Something went wrong on our side. Please try again.";
  if (data?.error) return String(data.error);
  if (data?.detail) return String(data.detail);
  if (data && typeof data === "object") {
    const [field, msgs] = Object.entries(data)[0] || [];
    const msg = Array.isArray(msgs) ? msgs[0] : msgs;
    if (field === "roommate_details") return String(msg);
    if (field) return `${String(field).replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())}: ${msg}`;
  }
  return "Please check that all fields are filled in correctly.";
}

const last10 = (v?: string) => String(v || "").replace(/\D/g, "").slice(-10);
const isPlaceholder = (u: string) => /placehold\.co/.test(u);

/** Builds the form data sent to /properties/ for a roommate listing (create or edit). */
function buildPayload(r: RoommateFormResult, edit: boolean): FormData {
  const { details: d, fields: f } = r;
  const fd = new FormData();
  fd.append("title", `${d.first_name} · Roommate in ${f.locality}`.slice(0, 200));
  fd.append("description", f.description || "");
  fd.append("rent", String(Math.round(Number(f.rent))));
  fd.append("state", f.state);
  fd.append("city", f.city);
  fd.append("area", f.locality);
  fd.append("address", d.has_place === "has_place" ? f.address : `${f.locality}, ${f.city}`);
  fd.append("owner_name", d.first_name || "");
  fd.append("phone_primary", f.phone_primary);
  fd.append("phone_secondary", f.phone_secondary || "");
  fd.append("roommate_details", JSON.stringify(d));
  // Optional; on an edit an empty value clears it
  if (f.vendor_number || edit) fd.append("vendor_number", f.vendor_number || "");
  fd.append("amenities_list", preferenceChips(d).join(","));
  if (!edit) fd.append("property_type", "ROOMMATE");
  r.newPhotos.forEach((file) => fd.append("uploaded_images", file));
  if (edit && r.removeImageIds.length) fd.append("remove_image_ids", r.removeImageIds.join(","));
  if (r.docs.aadhaar) fd.append("document_aadhaar", r.docs.aadhaar);
  if (r.docs.electricity) fd.append("document_electricity", r.docs.electricity);
  if (r.docs.noc) fd.append("document_noc", r.docs.noc);
  return fd;
}

/** "List as Roommate" page: the 20-question roommate form (new listing, or editing one with editId). */
export function ListRoommateSection({ editId, onDone }: { editId?: string | null; onDone: (what: "created" | "saved" | "cancel") => void }) {
  const { toast } = useToast();
  const edit = !!editId;
  const [loading, setLoading] = useState(edit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initial, setInitial] = useState<{ details?: RoommateDetails; fields?: Partial<RoommateFields>; media?: ExistingMedia; status?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [pending, setPending] = useState<RoommateFormResult | null>(null);
  const [fee, setFee] = useState(0);
  const [existingRoommateId, setExistingRoommateId] = useState<string | null>(null);

  useEffect(() => {
    setFee(feeFor("ROOMMATE"));
    fetchAndCachePricing().then(() => setFee(feeFor("ROOMMATE"))).catch(() => {});
  }, []);

  // New listing: point people who already have a roommate profile to editing it
  useEffect(() => {
    if (edit) return;
    getMyProperties().then((mine) => {
      const r = mine.find((p) => String(p.propertyType).toLowerCase() === "roommate");
      if (r) setExistingRoommateId(String(r.id));
    }).catch(() => {});
  }, [edit]);

  // Edit: load the listing as the owner sees it (answers, photo ids, documents)
  useEffect(() => {
    if (!editId) return;
    let alive = true;
    setLoading(true); setLoadError(null);
    api.get(`/properties/${editId}/`).then(({ data }) => {
      if (!alive) return;
      const imgs = Array.isArray(data.images) ? data.images : [];
      const rd: RoommateDetails = data.roommate_details && Object.keys(data.roommate_details).length ? data.roommate_details : {
        // Older roommate listings (before the questionnaire): start from what we know
        first_name: data.owner_name || "", age: data.age || null,
        gender: ({ Male: "male", Female: "female", Other: "nonbinary" } as Record<string, string>)[data.gender_preference] || "",
        has_place: data.sharing_status === "Living in" ? "has_place" : data.sharing_status ? "looking" : "",
      };
      setInitial({
        status: data.status,
        details: rd,
        fields: {
          rent: data.rent ? String(data.rent) : "", state: data.state || "", city: data.city || "", locality: data.area || "",
          address: rd.has_place === "has_place" ? data.address || "" : "",
          phone_primary: last10(data.phone_primary), phone_secondary: last10(data.phone_secondary), description: data.description || "", vendor_number: data.vendor_number || "",
        },
        media: {
          photos: imgs.filter((x: any) => !x.is_video && x.image_url && !isPlaceholder(x.image_url)).map((x: any) => ({ id: String(x.id), url: x.image_url })),
          aadhaar: data.document_aadhaar || undefined, electricity: data.document_electricity || undefined, noc: data.document_noc || undefined,
        },
      });
    }).catch((e) => {
      if (alive) setLoadError(e?.response?.status === 404 ? "This listing was not found." : "Could not load your listing. Please try again.");
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [editId]);

  const create = async (r: RoommateFormResult, paymentId?: string) => {
    setSubmitting(true);
    try {
      const fd = buildPayload(r, false);
      if (paymentId) fd.append("payment_id", paymentId);
      await api.post("/properties/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      localStorage.removeItem(UNUSED_FEE_KEY);
      clearRoommateDraft();
      toast({ title: "Roommate profile submitted!", description: "Our team will review it shortly. You can see its status in My Properties." });
      onDone("created");
    } catch (error: any) {
      if (error?.response?.status === 402) {
        localStorage.removeItem(UNUSED_FEE_KEY);
        toast({ title: "Listing fee needed", description: "Please pay the listing fee to submit your profile." });
        setPayOpen(true);
        return;
      }
      if (paymentId) localStorage.setItem(UNUSED_FEE_KEY, paymentId);
      toast({
        title: "Couldn't submit your profile",
        description: `${friendlyError(error)}${paymentId || localStorage.getItem(UNUSED_FEE_KEY) ? " Your payment is saved — fix this and submit again; you won't be charged twice." : ""}`,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const save = async (r: RoommateFormResult) => {
    if (!editId) return;
    setSubmitting(true);
    try {
      await api.patch(`/properties/${editId}/`, buildPayload(r, true), { headers: { "Content-Type": "multipart/form-data" } });
      toast({ title: "Changes saved", description: "Your roommate profile is updated." });
      onDone("saved");
    } catch (error: any) {
      toast({ title: "Couldn't save your changes", description: friendlyError(error), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = (r: RoommateFormResult) => {
    if (edit) { save(r); return; }
    setPending(r);
    const unused = localStorage.getItem(UNUSED_FEE_KEY);
    if (unused) { create(r, unused); return; }
    setPayOpen(true);
  };

  return (
    <section className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {submitting && (
        <div className="fixed inset-0 z-50 flex cursor-wait items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-xl bg-card px-5 py-4 shadow-xl"><Loader2 className="h-5 w-5 animate-spin" /> {edit ? "Saving your changes…" : "Submitting your profile…"}</div>
        </div>
      )}
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Users className="h-6 w-6" /></span>
        <h1 className="font-display text-4xl font-light tracking-tight">{edit ? "Edit your roommate profile" : "List yourself as a roommate"}</h1>
        <p className="mt-3 text-muted-foreground">
          {edit ? "Update your answers, photos or documents." : "Answer a few quick questions so we can match you with people you'll actually get along with."}
        </p>
      </div>

      {!edit && existingRoommateId && (
        <div className="mx-auto mb-6 flex max-w-2xl flex-col items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>You already have a roommate profile. Want to update it instead of creating a new one?</span>
          <Button size="sm" variant="outline" onClick={() => { window.dispatchEvent(new CustomEvent("setmystay:edit-roommate", { detail: existingRoommateId })); }}>
            <Pencil className="mr-1.5 h-4 w-4" /> Edit my profile
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center gap-3 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /> Loading your profile…</div>
      ) : loadError ? (
        <div className="mx-auto max-w-md rounded-xl border p-6 text-center">
          <p>{loadError}</p>
          <Button className="mt-4" variant="outline" onClick={() => onDone("cancel")}>Back</Button>
        </div>
      ) : (
        <RoommateListingForm
          key={editId || "new"}
          mode={edit ? "edit" : "create"}
          initialDetails={initial.details}
          initialFields={initial.fields}
          existingMedia={initial.media}
          submitting={submitting}
          onSubmit={onSubmit}
          onCancel={edit ? () => onDone("cancel") : undefined}
        />
      )}

      <ListPropertyPaymentModal
        isOpen={payOpen}
        onClose={() => setPayOpen(false)}
        onProceedToPayment={async (plan?: { title: string; price: number; paymentId?: string }) => {
          setPayOpen(false);
          if (pending) await create(pending, plan?.paymentId);
        }}
        amount={fee}
        userEmail={(typeof localStorage !== "undefined" && localStorage.getItem("user_email")) || ""}
        userName={(typeof localStorage !== "undefined" && localStorage.getItem("user_name")) || ""}
        pricing={null}
      />
    </section>
  );
}
