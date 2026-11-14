'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck, FileText, RefreshCw, Mail, Phone, MapPin } from 'lucide-react';

export type PolicyTab = 'privacy' | 'terms' | 'refund';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: PolicyTab;
}

export function PolicyModal({ isOpen, onClose, defaultTab = 'refund' }: PolicyModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] sm:w-[92vw] max-w-4xl p-0 max-h-[90vh] flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden my-auto border border-border/80 shadow-2xl">
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b shrink-0 text-left">
          <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Legal & Customer Policies
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            Transparency and safety are core to SetMyStay. Review our official terms below.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 sm:px-6 pt-3 border-b bg-muted/30 shrink-0">
            <TabsList className="grid grid-cols-3 w-full max-w-md h-10">
              <TabsTrigger value="refund" className="text-xs sm:text-sm flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                Refund Policy
              </TabsTrigger>
              <TabsTrigger value="privacy" className="text-xs sm:text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Privacy Policy
              </TabsTrigger>
              <TabsTrigger value="terms" className="text-xs sm:text-sm flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Terms of Service
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-sm text-foreground/90 leading-relaxed">
            {/* REFUND POLICY TAB */}
            <TabsContent value="refund" className="mt-0 space-y-5 focus-visible:outline-none">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">Refund & Cancellation Policy</h3>
                <p className="text-xs text-muted-foreground">Last Updated: November 2026</p>
              </div>

              <div className="space-y-3 bg-muted/40 p-4 rounded-xl border">
                <h4 className="font-semibold text-primary">1. Overview of Fees</h4>
                <p>
                  SetMyStay charges listing fees for property owners/brokers to publish their properties and unlocks/subscription plans for seekers to connect directly with property owners and roommates without brokerage commissions.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-base">2. Property Listing Fees</h4>
                <p>
                  When you submit a property listing (Rental, PG, or Roommate) along with payment:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li><strong>Pending Review:</strong> All listings undergo verification by our team within 24 to 48 hours.</li>
                  <li><strong>Rejected Listings:</strong> If our verification team rejects your listing due to invalid documentation, fake details, or fraudulent content that cannot be resolved, you are eligible for a full refund processed to your original payment method within 5-7 working days.</li>
                  <li><strong>Approved Listings:</strong> Once a property listing is approved and made live on SetMyStay, the listing fee is non-refundable.</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-base">3. Contact Unlock Credits & Subscriptions</h4>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li><strong>Instant Access:</strong> Contact unlock credits provide immediate access to owner/roommate contact details, verified addresses, and media. Due to the digital and instant nature of these services, credits that have been used to view a listing contact cannot be refunded or undone.</li>
                  <li><strong>Unused Credits:</strong> If you purchased a finite pack (e.g., Value Pack or Pro Pack) and have not used any credits due to a technical error on our gateway, you may request a refund within 48 hours of purchase.</li>
                  <li><strong>Ultimate Subscription (Unlimited):</strong> Subscriptions provide unlimited unlocks for a 30-day period. Subscriptions cannot be cancelled for a partial refund once activated and used.</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-base">4. Duplicate Charges & Technical Errors</h4>
                <p>
                  If you are charged multiple times for the same transaction due to a network glitch or Razorpay gateway timeout, any duplicate payment will be automatically refunded within 5-7 business days to your bank account or payment source.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <h4 className="font-semibold">How to Request a Refund</h4>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  To request a refund, please email our support team at <strong className="text-foreground">setmystay02@gmail.com</strong> with your Razorpay Payment ID, registered email, and reason for the request.
                </p>
              </div>
            </TabsContent>

            {/* PRIVACY POLICY TAB */}
            <TabsContent value="privacy" className="mt-0 space-y-5 focus-visible:outline-none">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">Privacy Policy</h3>
                <p className="text-xs text-muted-foreground">Last Updated: November 2026</p>
              </div>

              <div className="space-y-3 bg-muted/40 p-4 rounded-xl border">
                <h4 className="font-semibold text-primary">1. Information We Collect</h4>
                <p>
                  We collect information necessary to facilitate safe, transparent housing connections:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-xs sm:text-sm">
                  <li><strong>Personal Information:</strong> Name, email address, phone number, and physical address provided during signup or profile completion.</li>
                  <li><strong>Verification Documents:</strong> Identity proofs such as Aadhaar Card, Electricity Bills, or NOC uploaded by property owners for listing verification.</li>
                  <li><strong>Transaction Details:</strong> Payment IDs, transaction amounts, and plan names processed securely via Razorpay (we never store raw card numbers or CVVs).</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-base">2. How We Protect Your Verification Documents</h4>
                <p className="text-muted-foreground">
                  Verification documents (Aadhaar cards, utility bills) uploaded during property listing are strictly accessible only by authorized SetMyStay compliance staff and administrators. They are never shared publicly with tenants or seekers on the live site.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-base">3. How Your Information is Used</h4>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>To display verified property and roommate listings.</li>
                  <li>To facilitate direct contact between verified seekers and verified owners.</li>
                  <li>To prevent fraud, fake brokers, duplicate listings, and spam.</li>
                  <li>To process customer support requests and transaction receipts.</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-base">4. Data Sharing & Security</h4>
                <p className="text-muted-foreground">
                  We do not sell, rent, or trade your personal data with third-party marketing companies. Data is protected with SSL/TLS encryption in transit and secure database storage.
                </p>
              </div>
            </TabsContent>

            {/* TERMS OF SERVICE TAB */}
            <TabsContent value="terms" className="mt-0 space-y-5 focus-visible:outline-none">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">Terms and Conditions</h3>
                <p className="text-xs text-muted-foreground">Last Updated: November 2026</p>
              </div>

              <div className="space-y-3 bg-muted/40 p-4 rounded-xl border">
                <h4 className="font-semibold text-primary">1. Acceptance of Terms</h4>
                <p>
                  By accessing or using SetMyStay (the "Platform"), you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the Platform.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-base">2. User Conduct & Listing Authenticity</h4>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Users agree to provide accurate, honest, and truthful descriptions of properties, rent, deposit, and amenities.</li>
                  <li>Any listing found using forged documents, stolen images, or bait-and-switch pricing will be removed immediately without refund, and the account banned.</li>
                  <li>Roommate profiles must represent real individuals looking for genuine shared living arrangements. Harassment, abusive language, or discrimination will result in permanent suspension.</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-base">3. Platform Role & Limitation of Liability</h4>
                <p className="text-muted-foreground">
                  SetMyStay acts as a platform connecting property owners, tenants, and roommates. While we rigorously verify listings and documents, users are strongly advised to inspect properties in person and verify legal rental agreements before transferring security deposits or rent to property owners. SetMyStay is not a party to private rental contracts.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-base">4. Intellectual Property</h4>
                <p className="text-muted-foreground">
                  All logos, designs, text, and graphics on SetMyStay are the intellectual property of SetMyStay. Photos and videos uploaded by users remain the property of their respective creators but grant SetMyStay a license to display them for rental discovery.
                </p>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* FOOTER CONTACT BAR */}
        <div className="p-3 sm:p-4 bg-muted/50 border-t flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground shrink-0">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-primary" />
              setmystay02@gmail.com
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-primary" />
              +91 79771 69550
            </span>
            <span className="hidden md:flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              CBD Belapur, Navi Mumbai
            </span>
          </div>
          <button 
            onClick={onClose} 
            className="px-4 py-1.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors ml-auto"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
