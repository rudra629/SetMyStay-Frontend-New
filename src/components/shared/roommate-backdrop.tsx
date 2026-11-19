import { Coffee, Dumbbell, Headphones, Heart, Leaf, Moon, Sun, Utensils, BookOpen, Sparkles } from "lucide-react";

// Decorative, desktop-only background for the Roommates swipe deck: soft colour blobs,
// a dotted grid and floating "lifestyle" chips. Pure decoration (aria-hidden, no clicks).
const CHIPS = [
  { icon: Headphones, label: "Music lover", pos: "left-[2%] top-[10%]", delay: "0s", tint: "text-violet-600 bg-violet-50 dark:bg-violet-500/15 dark:text-violet-300" },
  { icon: Sun, label: "Early riser", pos: "right-[3%] top-[8%]", delay: "1.2s", tint: "text-amber-600 bg-amber-50 dark:bg-amber-500/15 dark:text-amber-300" },
  { icon: Leaf, label: "Vegetarian", pos: "left-[6%] top-[40%]", delay: "2.1s", tint: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-300" },
  { icon: Dumbbell, label: "Gym buddy", pos: "right-[5%] top-[36%]", delay: "0.6s", tint: "text-sky-600 bg-sky-50 dark:bg-sky-500/15 dark:text-sky-300" },
  { icon: Moon, label: "Night owl", pos: "left-[1%] top-[70%]", delay: "1.6s", tint: "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/15 dark:text-indigo-300" },
  { icon: Utensils, label: "Loves cooking", pos: "right-[2%] top-[66%]", delay: "2.6s", tint: "text-rose-600 bg-rose-50 dark:bg-rose-500/15 dark:text-rose-300" },
  { icon: BookOpen, label: "Quiet study", pos: "left-[12%] bottom-[2%]", delay: "0.9s", tint: "text-teal-600 bg-teal-50 dark:bg-teal-500/15 dark:text-teal-300" },
  { icon: Coffee, label: "Coffee first", pos: "right-[11%] bottom-[3%]", delay: "1.9s", tint: "text-orange-600 bg-orange-50 dark:bg-orange-500/15 dark:text-orange-300" },
];

export function RoommateBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-hidden rounded-[2rem] lg:block">
      {/* colour blobs */}
      <div className="absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-primary/20 via-sky-300/15 to-fuchsia-300/20 blur-3xl" />
      <div className="sms-drift absolute -left-10 top-6 h-56 w-56 rounded-full bg-amber-300/25 blur-3xl" />
      <div className="sms-drift absolute -right-10 bottom-4 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl" style={{ animationDelay: "3s" }} />
      {/* dotted grid, fading out towards the edges */}
      <div
        className="absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_75%)]"
        style={{ backgroundImage: "radial-gradient(color-mix(in oklch, var(--primary) 28%, transparent) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      />
      {/* rings around the card */}
      <div className="absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10" />
      <div className="absolute left-1/2 top-1/2 h-[46rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-primary/10" />
      {/* floating lifestyle chips */}
      {CHIPS.map(({ icon: Icon, label, pos, delay, tint }) => (
        <div key={label} className={`sms-float absolute ${pos}`} style={{ animationDelay: delay }}>
          <div className="flex items-center gap-2 rounded-full border bg-card/90 px-3.5 py-2 text-sm font-medium shadow-lg backdrop-blur-sm">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full ${tint}`}><Icon className="h-4 w-4" /></span>
            {label}
          </div>
        </div>
      ))}
      {/* small hearts and sparkles */}
      <Heart className="sms-float absolute left-[24%] top-[18%] h-5 w-5 fill-rose-400/70 text-rose-400/70" style={{ animationDelay: "1.1s" }} />
      <Heart className="sms-float absolute right-[24%] bottom-[18%] h-4 w-4 fill-rose-300/70 text-rose-300/70" style={{ animationDelay: "2.4s" }} />
      <Sparkles className="sms-float absolute right-[26%] top-[14%] h-5 w-5 text-amber-400/80" style={{ animationDelay: "0.3s" }} />
      <Sparkles className="sms-float absolute left-[26%] bottom-[16%] h-4 w-4 text-primary/60" style={{ animationDelay: "1.7s" }} />
    </div>
  );
}
