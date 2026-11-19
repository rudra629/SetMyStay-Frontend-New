'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { whatsappLink } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Construction, Mail, Phone, MessageCircle } from 'lucide-react';

// "For Sale" section: properties for sale are coming soon. Until then it shows
// a maintenance notice with the contact details the admin saved (Admin > Contact Information).
export function ForSaleSection() {
  const [email, setEmail] = useState('setmystay02@gmail.com');
  const [phone, setPhone] = useState('+91 79771 69550');

  useEffect(() => {
    api.get('/site-contact/').then(({ data }) => {
      if (data?.email) setEmail(data.email);
      if (data?.phone) setPhone(data.phone);
    }).catch(() => {});
  }, []);

  const telHref = `tel:${phone.replace(/[^\d+]/g, '')}`;

  return (
    <section className="relative overflow-hidden px-4 py-16 sm:py-24">
      {/* soft background shapes */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-amber-400/15 blur-3xl" />

      <div className="relative mx-auto max-w-2xl rounded-3xl border bg-card/80 p-8 text-center shadow-xl backdrop-blur-sm sm:p-12">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
          <Construction className="h-8 w-8" />
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">For Sale</p>
        <h1 className="font-headline text-3xl font-bold sm:text-4xl">Under maintenance</h1>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          We&apos;re building a place to buy and sell homes on SetMyStay. It will be live soon.
          Want to buy or sell a property right now? Get in touch and we&apos;ll help you directly.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <a href={telHref} className="group flex items-center gap-3 rounded-2xl border bg-background p-4 text-left transition hover:border-primary hover:shadow-md">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Phone className="h-5 w-5" /></span>
            <span className="min-w-0">
              <span className="block text-xs text-muted-foreground">Call us</span>
              <span className="block truncate font-semibold group-hover:text-primary">{phone}</span>
            </span>
          </a>
          <a href={`mailto:${email}`} className="group flex items-center gap-3 rounded-2xl border bg-background p-4 text-left transition hover:border-primary hover:shadow-md">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Mail className="h-5 w-5" /></span>
            <span className="min-w-0">
              <span className="block text-xs text-muted-foreground">Email us</span>
              <span className="block truncate font-semibold group-hover:text-primary">{email}</span>
            </span>
          </a>
        </div>

        <Button asChild variant="outline" className="mt-4 rounded-full">
          <a href={whatsappLink(phone, 'Hello, I want to buy / sell a property on SetMyStay.')} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="mr-2 h-4 w-4" /> Chat on WhatsApp
          </a>
        </Button>
      </div>
    </section>
  );
}
