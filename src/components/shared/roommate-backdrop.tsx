import { Heart, X } from "lucide-react";

// Decorative stage (phones, tablets and desktop) behind the Roommates swipe deck: a soft spotlight, a fine
// grid that fades out, two gentle colour glows and a swipe hint on each side. Purely visual
// (aria-hidden, no clicks) and uses the global theme colours only.
export function RoommateBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl border border-border/60 lg:rounded-[2rem]">
      {/* base wash */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-background to-background" />
      {/* fine grid, fading towards the edges */}
      <div
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,black,transparent)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklch, var(--primary) 10%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--primary) 10%, transparent) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* spotlight behind the card */}
      <div className="absolute left-1/2 top-[44%] h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-[70px] sm:h-80 sm:w-80 lg:h-[26rem] lg:w-[26rem] lg:blur-[90px]" />
      {/* slow colour glows */}
      <div className="sms-drift absolute -left-20 top-6 h-48 w-48 rounded-full bg-sky-400/15 blur-[60px] sm:h-60 sm:w-60 lg:-left-24 lg:top-10 lg:h-72 lg:w-72 lg:blur-[80px]" />
      <div className="sms-drift absolute -right-20 bottom-4 h-52 w-52 rounded-full bg-rose-400/12 blur-[60px] sm:h-64 sm:w-64 lg:-right-24 lg:bottom-6 lg:h-80 lg:w-80 lg:blur-[90px]" style={{ animationDelay: "4s" }} />

      {/* swipe hints */}
      <div className="absolute left-[6%] top-1/2 hidden -translate-y-1/2 lg:block">
        <div className="sms-float flex flex-col items-center gap-3 text-center" style={{ animationDelay: "0.4s" }}>
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-rose-200 bg-card shadow-lg shadow-rose-500/10 dark:border-rose-500/30">
            <X className="h-6 w-6 text-rose-500" />
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Swipe left<br />to pass</span>
        </div>
      </div>
      <div className="absolute right-[6%] top-1/2 hidden -translate-y-1/2 lg:block">
        <div className="sms-float flex flex-col items-center gap-3 text-center" style={{ animationDelay: "1.6s" }}>
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-card shadow-lg shadow-primary/15">
            <Heart className="h-6 w-6 fill-primary text-primary" />
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Swipe right<br />to like</span>
        </div>
      </div>

      {/* a few soft dots for depth */}
      <span className="sms-float absolute left-[22%] top-[16%] h-2 w-2 rounded-full bg-primary/40" style={{ animationDelay: "1s" }} />
      <span className="sms-float absolute right-[24%] top-[22%] h-1.5 w-1.5 rounded-full bg-sky-400/60" style={{ animationDelay: "2.2s" }} />
      <span className="sms-float absolute left-[28%] bottom-[18%] h-1.5 w-1.5 rounded-full bg-rose-400/60" style={{ animationDelay: "0.2s" }} />
      <span className="sms-float absolute right-[20%] bottom-[14%] h-2 w-2 rounded-full bg-primary/30" style={{ animationDelay: "3s" }} />
    </div>
  );
}
