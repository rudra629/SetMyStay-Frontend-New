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
