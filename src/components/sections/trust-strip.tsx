import { ShieldCheck, PhoneCall, LayoutGrid, Lock } from "lucide-react";

const POINTS = [
  { icon: ShieldCheck, label: "Every listing reviewed" },
  { icon: PhoneCall, label: "Direct owner contact" },
  { icon: LayoutGrid, label: "PGs, rentals & roommates" },
  { icon: Lock, label: "Secure payments" },
];

/** One quiet line under the hero. Static, so it also renders on the server. */
export function TrustStrip() {
  return (
    <section aria-label="Why SetMyStay" className="border-b border-border/60">
      <ul className="container flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-6 text-sm text-muted-foreground">
        {POINTS.map((p) => (
          <li key={p.label} className="flex items-center gap-2">
            <p.icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
            <span>{p.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
