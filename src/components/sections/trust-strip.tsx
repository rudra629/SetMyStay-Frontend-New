import { ShieldCheck, PhoneCall, LayoutGrid, Lock } from "lucide-react";

const POINTS = [
  { icon: ShieldCheck, title: "Every listing reviewed", text: "Our team checks each listing before it goes live." },
  { icon: PhoneCall, title: "Talk to owners directly", text: "Unlock a listing to call or WhatsApp the owner." },
  { icon: LayoutGrid, title: "PGs, rentals & roommates", text: "All three in one place, with filters that fit you." },
  { icon: Lock, title: "Secure payments", text: "Plans are paid safely through Razorpay." },
];

const CITIES = ["Mumbai", "Navi Mumbai", "Thane", "Pune"];

/** The band right under the hero: why SetMyStay, and the cities we cover. Static, so it also renders on the server. */
export function TrustStrip() {
  return (
    <section aria-label="Why SetMyStay" className="border-b border-border bg-secondary/60">
      <div className="container grid grid-cols-1 gap-x-8 gap-y-5 py-7 sm:grid-cols-2 lg:grid-cols-4">
        {POINTS.map((p) => (
          <div key={p.title} className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-card text-primary shadow-sm">
              <p.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold leading-tight">{p.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="container flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border/70 py-3 text-sm">
        <span className="text-muted-foreground">Now listing in</span>
        {CITIES.map((c) => (
          <span key={c} className="rounded-full border border-border bg-card px-3 py-1 font-medium">{c}</span>
        ))}
      </div>
    </section>
  );
}
