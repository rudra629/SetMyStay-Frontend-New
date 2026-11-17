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
      {/* Phones/tablets: tidy 2 x 2 grid. Wide screens: one centred line. */}
      <ul className="container grid grid-cols-2 gap-x-4 gap-y-3 py-5 text-[13px] leading-snug text-muted-foreground sm:text-sm lg:flex lg:flex-wrap lg:items-center lg:justify-center lg:gap-x-10 lg:py-6">
        {POINTS.map((p) => (
          <li key={p.label} className="flex items-center gap-2 min-w-0">
            <p.icon className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} />
            <span>{p.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
