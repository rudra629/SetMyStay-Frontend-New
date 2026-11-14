
"use client";

import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone } from "lucide-react";
import { useState, useEffect } from "react";
import type { Page } from "@/lib/types";
import { getFromLocalStorage } from "@/lib/storage";


// Default contact info for the very first run or if not set
const DEFAULT_ADMIN_EMAIL = 'setmystay02@gmail.com';
const DEFAULT_ADMIN_PHONE = '+91 79771 69550';
const DEFAULT_ADMIN_ADDRESS = 'Office no. 01, Neelsidhi Splendour, Sector 15, CBD Belapur, Navi Mumbai, Maharashtra 400614';


interface FooterProps {
  onNavigate: (page: Page) => void;
  onOpenPolicy?: (tab: 'privacy' | 'terms' | 'refund') => void;
}

export function Footer({ onNavigate, onOpenPolicy }: FooterProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [contactEmail, setContactEmail] = useState(DEFAULT_ADMIN_EMAIL);
  const [contactPhone, setContactPhone] = useState(DEFAULT_ADMIN_PHONE);
  const [contactAddress, setContactAddress] = useState(DEFAULT_ADMIN_ADDRESS);


  useEffect(() => {
    setIsMounted(true);
    setContactEmail(getFromLocalStorage('admin_email', DEFAULT_ADMIN_EMAIL));
    setContactPhone(getFromLocalStorage('admin_phone', DEFAULT_ADMIN_PHONE));
    setContactAddress(getFromLocalStorage('admin_address', DEFAULT_ADMIN_ADDRESS));
  }, []);


  return (
    <footer className="bg-ink text-ink-foreground/70">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <p className="mb-12 font-display text-4xl font-semibold text-ink-foreground">SetMyStay</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <Logo className="w-10 h-10" />
              <span className="font-display text-2xl text-ink-foreground">SetMyStay</span>
            </Link>
            <p className="text-sm">
              Your trusted partner for finding the perfect living space. Connecting people with their ideal homes.
            </p>
            <div className="flex space-x-2">
              <Button variant="ghost" size="icon" asChild>
                <a href="#" aria-label="Facebook" className="text-ink-foreground/50 hover:text-ink-foreground"><Facebook className="w-5 h-5" /></a>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a href="#" aria-label="Twitter" className="text-ink-foreground/50 hover:text-ink-foreground"><Twitter className="w-5 h-5" /></a>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a href="https://www.instagram.com/setmystay?igsh=MXJkOXFkYzVwc3JjNg==" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-ink-foreground/50 hover:text-ink-foreground"><Instagram className="w-5 h-5" /></a>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a href="https://www.linkedin.com/company/setmystay/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-ink-foreground/50 hover:text-ink-foreground"><Linkedin className="w-5 h-5" /></a>
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-ink-foreground mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => onNavigate('home')} className="hover:text-ink-foreground text-left w-full transition-colors">Home</button></li>
              <li><a href="https://g.co/kgs/Mmk6x3N" target="_blank" rel="noopener noreferrer" className="hover:text-ink-foreground transition-colors">Visit Our Office</a></li>
              <li><Link to="/admin/login" className="hover:text-ink-foreground transition-colors">Admin Dashboard</Link></li>
              <li><Link to="/staff/login" className="hover:text-ink-foreground transition-colors">Staff Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-ink-foreground mb-4">Legal & Policies</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button 
                  onClick={() => onOpenPolicy?.('refund')} 
                  className="hover:text-ink-foreground text-left w-full transition-colors"
                >
                  Refund & Cancellation Policy
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onOpenPolicy?.('privacy')} 
                  className="hover:text-ink-foreground text-left w-full transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onOpenPolicy?.('terms')} 
                  className="hover:text-ink-foreground text-left w-full transition-colors"
                >
                  Terms & Conditions
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-ink-foreground mb-4">Contact</h3>
            <div className="space-y-2 text-sm">
              <p>{contactAddress}</p>
              <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 hover:text-ink-foreground transition-colors">
                <Mail className="w-4 h-4 shrink-0" />
                <span className="break-all">{contactEmail}</span>
              </a>
              <a href={`tel:${contactPhone}`} className="flex items-center gap-2 hover:text-ink-foreground transition-colors">
                <Phone className="w-4 h-4 shrink-0" />
                <span>{contactPhone}</span>
              </a>
            </div>
          </div>

        </div>

        <div className="mt-12 border-t border-ink-foreground/10 pt-8 text-center text-sm">
          {isMounted && <p>&copy; {new Date().getFullYear()} SetMyStay. All rights reserved.</p>}
          <div className="flex flex-wrap justify-center gap-3 text-xs text-ink-foreground/60 mt-3">
            <button onClick={() => onOpenPolicy?.('refund')} className="hover:underline">Refund Policy</button>
            <span>•</span>
            <button onClick={() => onOpenPolicy?.('privacy')} className="hover:underline">Privacy Policy</button>
            <span>•</span>
            <button onClick={() => onOpenPolicy?.('terms')} className="hover:underline">Terms & Conditions</button>
          </div>
          <p className="text-xs text-ink-foreground/50 mt-2">Developed & Designed by Kelvora</p>
        </div>
      </div>
    </footer>
  );
}
