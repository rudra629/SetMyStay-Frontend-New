'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Megaphone } from 'lucide-react';

export interface HeroAd { id: number; text: string; link_url?: string; image_url?: string; is_active?: boolean; sort_order?: number }

// Moving ad strip on the hero (right to left). Ads are added/removed in Admin > Management.
// Shows nothing at all when there are no active ads.
export function HeroAdBanner() {
  const [ads, setAds] = useState<HeroAd[]>([]);

  useEffect(() => {
    let alive = true;
    api.get('/hero-ads/', { authSlot: 'site' } as any)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.results || [];
        if (alive) setAds(list.filter((a: HeroAd) => a && a.text && a.is_active !== false));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!ads.length) return null;

  // Repeat short lists so the strip is always wider than the screen, then render it twice for a seamless loop.
  const base = ads.length < 4 ? Array.from({ length: Math.ceil(4 / ads.length) }, () => ads).flat() : ads;
  const loop = [...base, ...base];
  const seconds = Math.max(18, base.length * 7);

  const item = (ad: HeroAd, i: number) => {
    const body = (
      <span className="flex items-center gap-3 whitespace-nowrap px-6">
        {ad.image_url
          ? <img src={ad.image_url} alt="" loading="lazy" className="h-7 w-7 rounded-md object-cover sm:h-8 sm:w-8" />
          : <Megaphone className="h-4 w-4 shrink-0 text-amber-300" />}
        <span className="text-sm font-medium sm:text-[15px]">{ad.text}</span>
        <span aria-hidden className="ml-3 h-1.5 w-1.5 rounded-full bg-white/40" />
      </span>
    );
    return ad.link_url
      ? <a key={`${ad.id}-${i}`} href={ad.link_url} target="_blank" rel="noopener noreferrer sponsored" className="hover:text-amber-200" aria-hidden={i >= base.length || undefined} tabIndex={i >= base.length ? -1 : undefined}>{body}</a>
      : <span key={`${ad.id}-${i}`} aria-hidden={i >= base.length || undefined}>{body}</span>;
  };

  return (
    <div className="absolute inset-x-0 top-[5.75rem] z-20 px-3 sm:top-28 sm:px-6 lg:px-8">
      <div
        role="region"
        aria-label="Advertisements"
        className="group relative mx-auto max-w-6xl overflow-hidden rounded-full border border-white/20 bg-black/35 py-2 text-white shadow-lg backdrop-blur-md [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
      >
        <div className="hero-marquee flex w-max items-center group-hover:[animation-play-state:paused]" style={{ animationDuration: `${seconds}s` }}>
          {loop.map(item)}
        </div>
      </div>
    </div>
  );
}
