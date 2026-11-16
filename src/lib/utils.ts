import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isVideoUrl(url?: unknown): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.split('?')[0].toLowerCase().trim();
  return (
    clean.includes('/video/upload/') ||
    clean.includes('/property_videos/') ||
    clean.includes('/video/') ||
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.mkv') ||
    clean.endsWith('.m4v') ||
    /\.(mp4|webm|ogg|mov|mkv|m4v)($|\?)/i.test(url)
  );
}

export function getFirstImageUrl(images?: string[]): string | undefined {
  if (!images || images.length === 0) return undefined;
  return images.find((img) => !isVideoUrl(img)) || images[0];
}

/**
 * Turns any Indian phone format ("+91 79771 69550", "09423421979", "7977169550")
 * into the digits-only form WhatsApp links need ("917977169550").
 */
export function whatsappNumber(phone: string | null | undefined): string {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = "91" + d;
  return d;
}

export function whatsappLink(phone: string | null | undefined, message?: string): string {
  const n = whatsappNumber(phone);
  return `https://wa.me/${n}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

/**
 * Ask Cloudinary for a photo at the size it is shown, in the best format the browser
 * supports (WebP/AVIF), at automatic quality. `width` should be about twice the
 * on-screen width so photos stay sharp on phones and retina screens.
 * Non-Cloudinary URLs (and URLs that already have settings) are returned unchanged.
 */
export function cdnImage(url: string | null | undefined, width: number): string {
  const u = String(url || "");
  const marker = "/image/upload/";
  const i = u.indexOf(marker);
  if (!u.includes("res.cloudinary.com") || i === -1) return u;
  const rest = u.slice(i + marker.length);
  // Already has transformation settings (e.g. "w_800,..." or "f_auto/...")
  if (/^[a-z]{1,3}_[^/]+\//.test(rest) && !/^v\d+\//.test(rest)) return u;
  return `${u.slice(0, i + marker.length)}f_auto,q_auto,c_limit,w_${width}/${rest}`;
}

/** Public listing ID shown to owners and support, e.g. 21 -> "SMS-00021". */
export function listingCode(id: string | number | null | undefined): string {
  const n = String(id ?? '').replace(/\D/g, '');
  return n ? `SMS-${n.padStart(5, '0')}` : '';
}

/** True if a search text matches a listing's ID ("SMS-00021", "sms21", "21"). */
export function matchesListingCode(query: string, id: string | number | null | undefined): boolean {
  const q = String(query || '').trim().toLowerCase().replace(/^sms[-\s]*/, '');
  if (!/^\d+$/.test(q)) return false;
  return Number(q) === Number(String(id ?? '').replace(/\D/g, ''));
}
