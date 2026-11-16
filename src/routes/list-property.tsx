import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListPropertySection } from "@/components/sections/list-property-section";
import { ListPropertyPaymentModal } from "@/components/modals/list-property-payment-modal";
import { feeFor, fetchAndCachePricing } from "@/lib/app-settings";
import { createListing } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const UNUSED_FEE_KEY = "setmystay_unused_listing_fee";

// Turn a server error into one readable sentence (no raw JSON).
function friendlyError(error: any): string {
  const data = error?.response?.data;
  if (!error?.response) return "We couldn't reach the server. Check your internet and try again.";
  if (typeof data === "string") return "Something went wrong on our side. Please try again.";
  if (data?.error) return String(data.error);
  if (data?.detail) return String(data.detail);
  if (data && typeof data === "object") {
    const [field, msgs] = Object.entries(data)[0] || [];
    const msg = Array.isArray(msgs) ? msgs[0] : msgs;
    if (field) return `${String(field).replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())}: ${msg}`;
  }
  return "Please check that all fields are filled in correctly.";
}

export const Route = createFileRoute("/list-property")({
  head: () => ({
    meta: [
      { title: "List Your Property — SetMyStay" },
      { name: "description", content: "List your PG, rental or roommate requirement on SetMyStay and reach verified tenants." },
      { property: "og:title", content: "List Your Property — SetMyStay" },
      { property: "og:description", content: "List your PG, rental or roommate requirement on SetMyStay and reach verified tenants." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ListPropertyPage,
});

function ListPropertyPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [listingAmount, setListingAmount] = useState<number>(0);

  const [checkedSignIn, setCheckedSignIn] = useState(false);

  useEffect(() => {
    // Listing needs an account: send signed-out visitors to sign in first (then they come back here)
    if (!localStorage.getItem('access_token')) {
      window.location.replace('/?signin=list');
      return;
    }
    setCheckedSignIn(true);
    setListingAmount(feeFor("RENTAL"));
    fetchAndCachePricing().catch(() => {});
  }, []);

  useEffect(() => {
    if (isSubmitting) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSubmitting]);

  // 1. When Form is Valid, Open Payment Modal with the exact price for this property type
  const handleFormSubmit = (data: any) => {
    setFormData(data);
    const computedFee = feeFor(data?.property_type ?? data?.propertyType);
    setListingAmount(computedFee);
    // Paid before but the upload failed? Submit again with that payment instead of charging twice.
    const unusedFee = localStorage.getItem(UNUSED_FEE_KEY);
    if (unusedFee) {
      submitListing(data, unusedFee);
      return;
    }
    setIsPaymentModalOpen(true);
  };

  // 2. When Payment is Successful, Send Data to Django
  const handlePaymentSuccess = async (plan?: { title: string; price: number; paymentId?: string }) => {
    setIsPaymentModalOpen(false);
    await submitListing(formData, plan?.paymentId);
  };

  const submitListing = async (formData: any, paymentId?: string) => {
    try {
      setIsSubmitting(true);

      const payload = new FormData();

      const uEmail = (typeof localStorage !== 'undefined' && localStorage.getItem('user_email')) || '';
      const uName = (typeof localStorage !== 'undefined' && localStorage.getItem('user_name')) || '';
      if (uEmail) {
        payload.append("user_email", uEmail);
        payload.append("email", uEmail);
      }

      // --- BASIC FIELDS ---
      if (paymentId) payload.append("payment_id", paymentId);
      payload.append("title", formData.title);
      payload.append("description", formData.description || "No description provided");
      payload.append("property_type", formData.property_type);
      payload.append("rent", formData.rent.toString());
      payload.append("deposit", formData.rent.toString());

      // --- LOCATION ---
      if (formData.state) {
        payload.append("state", formData.state);
      }
      payload.append("city", formData.city);
      payload.append("area", formData.locality || formData.area);
      payload.append("address", formData.address || `${formData.locality || ""}, ${formData.city || ""}`);

      if (formData.vendor_number) {
        payload.append("vendor_number", formData.vendor_number);
      }

      // --- SPECS ---
      payload.append("sq_ft", formData.area ? formData.area.toString() : "500");
      if (formData.bhk) payload.append("bhk", formData.bhk);
      if (formData.furnishing) payload.append("furnishing", formData.furnishing);
      payload.append("status", "PENDING");

      if (formData.age) {
        payload.append("age", formData.age.toString());
      }

      payload.append("owner_name", formData.owner_name);
      payload.append("phone_primary", formData.phone_primary);

      if (formData.phone_secondary) {
        payload.append("phone_secondary", formData.phone_secondary);
      }

      // --- AMENITIES ---
      if (formData.amenities) {
        const amenitiesString = Array.isArray(formData.amenities)
          ? formData.amenities.join(",")
          : formData.amenities;
        payload.append("amenities_list", amenitiesString);
      }

      // --- CONDITIONAL FIELDS BASED ON TYPE ---
      if (formData.property_type === "ROOMMATE") {
        payload.append("gender_preference", formData.gender_preference || "Any");
        payload.append("sharing_status", formData.sharing_status || "Living in");
      } else if (formData.property_type === "RENTAL") {
        payload.append("is_broker", formData.is_broker ? "True" : "False");
      } else {
        payload.append("occupancy_type", formData.occupancy_type || "");
        payload.append("gender_preference", "Any");
      }

      // --- IMAGES & VIDEO ---
      if (formData.images && formData.images.length > 0) {
        formData.images.forEach((file: File) => {
          payload.append("uploaded_images", file);
        });
      }
      if (formData.video_file) {
        payload.append("uploaded_video", formData.video_file);
      }

      // --- DOCUMENTS ---
      const aadharFile = formData.aadhaar_card || formData.aadhaarCard;
      const electricFile = formData.electricity_bill || formData.electricityBill;
      const nocFile = formData.noc;

      if (aadharFile) {
        payload.append("document_aadhaar", Array.isArray(aadharFile) ? aadharFile[0] : aadharFile);
      }
      if (electricFile) {
        payload.append("document_electricity", Array.isArray(electricFile) ? electricFile[0] : electricFile);
      }
      if (nocFile) {
        payload.append("document_noc", Array.isArray(nocFile) ? nocFile[0] : nocFile);
      }

      console.log("Submitting Payload...");

      await createListing(payload);
      localStorage.removeItem(UNUSED_FEE_KEY);

      toast({
        title: "Listing submitted!",
        description: "Your property has been sent for review. You can see its status in My Properties.",
      });

      navigate({ to: "/" });
    } catch (error: any) {
      console.error("Submission Error:", error);
      const status = error?.response?.status;
      if (status === 402) {
        // No paid fee available (or it was for a cheaper listing type): ask to pay
        localStorage.removeItem(UNUSED_FEE_KEY);
        toast({ title: "Listing fee needed", description: "Please pay the listing fee to submit this listing." });
        setIsPaymentModalOpen(true);
        return;
      }
      if (paymentId) localStorage.setItem(UNUSED_FEE_KEY, paymentId);
      toast({
        title: "Couldn't submit your listing",
        description: `${friendlyError(error)}${paymentId || localStorage.getItem(UNUSED_FEE_KEY) ? " Your payment is saved — fix this and press Submit again; you won't be charged twice." : ""}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!checkedSignIn) {
    return <main className="min-h-screen bg-background" />;
  }

  return (
    <main className="min-h-screen bg-background relative">
      {isSubmitting && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm touch-none select-none cursor-wait"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onWheel={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onTouchMove={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
        </div>
      )}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft /> Back to Home
          </Link>
        </Button>
      </div>
      <ListPropertySection onSubmit={handleFormSubmit} />

      <ListPropertyPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onProceedToPayment={handlePaymentSuccess}
        amount={listingAmount}
        userEmail={(typeof localStorage !== 'undefined' && localStorage.getItem('user_email')) || ''}
        userName={(typeof localStorage !== 'undefined' && localStorage.getItem('user_name')) || ''}
        pricing={null}
      />
    </main>
  );
}