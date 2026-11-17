import { useEffect } from "react";
import { detectLowEnd, isTouch } from "@/lib/perf";

type LenisLike = {
  raf: (t: number) => void;
  destroy: () => void;
  resize: () => void;
  scrollTo: (target: number, opts?: { immediate?: boolean; force?: boolean; lock?: boolean }) => void;
};

const getLenis = () => (window as unknown as { __lenis?: LenisLike }).__lenis;

/**
 * Jump to the top of the page (used when switching sections). Resets the browser AND the smooth-scroll
 * engine together, and again after the new section has been drawn, so they can never disagree
 * (that disagreement froze the page until you scrolled a few times).
 */
export function scrollPageToTop() {
  if (typeof window === "undefined") return;
  const reset = () => {
    const lenis = getLenis();
    lenis?.resize();
    lenis?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
  };
  reset();
  // Re-check once the new section is drawn, unless you've already started scrolling it
  let userMoved = false;
  const mark = () => { userMoved = true; };
  const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
  events.forEach((e) => window.addEventListener(e, mark, { once: true, passive: true }));
  const later = () => { if (!userMoved) reset(); };
  requestAnimationFrame(() => requestAnimationFrame(later));
  setTimeout(() => {
    later();
    events.forEach((e) => window.removeEventListener(e, mark));
  }, 400);
}

export function SmoothScroll() {
  useEffect(() => {
    // Native scrolling is smoother on touch screens and weak hardware.
    if (detectLowEnd() || isTouch()) return;
    let raf = 0;
    let lenis: LenisLike | null = null;
    let cancelled = false;
    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      lenis = new Lenis({
        // Follows the wheel closely (lerp) instead of a long fixed-time glide: still smooth and premium,
        // but it never feels like the page is lagging behind your hand.
        lerp: 0.12,
        wheelMultiplier: 1,
        smoothWheel: true,
        prevent: (node: HTMLElement) => !!node.closest("[role=dialog],[data-radix-scroll-area-viewport],[data-lenis-prevent]"),
      }) as unknown as LenisLike;
      (window as unknown as { __lenis?: unknown }).__lenis = lenis;
      const loop = (t: number) => { lenis?.raf(t); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      lenis?.destroy();
      (window as unknown as { __lenis?: unknown }).__lenis = undefined;
    };
  }, []);
  return null;
}
