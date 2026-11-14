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
