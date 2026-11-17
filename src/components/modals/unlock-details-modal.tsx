"use client";

import { useState, useEffect } from "react";
import { RazorpayScript } from "@/components/razorpay-script";
import api, { getCoupons } from "@/lib/api"; // Uses your configured Axios instance with JWT interceptors
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Check, Star, Gem, Rocket, Crown, Building, User, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { UnlockPlan, PricingData, Coupon } from "@/lib/types";
import { PaymentConfirmationModal } from "./payment-confirmation-modal";
import axios from "axios";
interface UnlockDetailsModalProps {
  isOpen: boolean;
  onClose: (proceedingToPayment?: boolean) => void;
  onPlanSelect: (plan: { plan: UnlockPlan, title: string, price: number }) => void;
  onNavigateToListProperty: () => void;
  pricing: PricingData | null;
  /** What the signed-in user already has (to show it and block lower plans) */
  planState?: { isUnlimited: boolean; unlimitedExpiresAt: string | null; creditsLeft: number };
  /** Called when a signed-out visitor confirms a plan: open Google sign-in (the choice is saved) */
  onRequireSignIn?: () => void;
  /** After sign-in: continue straight to Razorpay with this plan and the amount after coupon */
  autoPurchase?: { title: string; amount: number } | null;
  onAutoPurchaseHandled?: () => void;
}

export const PENDING_PURCHASE_KEY = 'setmystay_pending_purchase';

type Tier = 'unlimited' | 0 | 1 | 5 | 10;
const tierOf = (ps?: UnlockDetailsModalProps['planState']): Tier => {
  if (!ps) return 0;
  if (ps.isUnlimited) return 'unlimited';
  const left = ps.creditsLeft || 0;
  return left >= 10 ? 10 : left >= 5 ? 5 : left >= 1 ? 1 : 0;
};
const fmtDate = (iso?: string | null) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; }
};

export function UnlockDetailsModal({ isOpen, onClose, onPlanSelect, onNavigateToListProperty, pricing, planState, onRequireSignIn, autoPurchase, onAutoPurchaseHandled }: UnlockDetailsModalProps) {
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const { toast } = useToast();
  
  // Fetch active coupons when the modal opens
  useEffect(() => {
    if (isOpen) {
      getCoupons().then(setAvailableCoupons).catch(console.error);
    }
  }, [isOpen]);

  const unlockPlans = [
    { plan: 1 as UnlockPlan, title: 'Single Unlock', price: pricing?.unlocks['1'] ?? 19, features: ['1 Listing Unlock', 'Complete Address', 'Direct Contact Details', 'Valid for 30 days'], icon: <Rocket className="w-5 h-5"/>, suffix: 'one-time' },
    { plan: 5 as UnlockPlan, title: 'Value Pack', price: pricing?.unlocks['5'] ?? 199, features: ['5 Listing Unlocks', 'Complete Address', 'Direct Contact Details', 'Valid for 30 days', 'Best Value!'], icon: <Star className="w-5 h-5"/>, suffix: 'one-time' },
    { plan: 10 as UnlockPlan, title: 'Pro Pack', price: pricing?.unlocks['10'] ?? 399, features: ['10 Listing Unlocks', 'Complete Address', 'Direct Contact Details', 'Valid for 30 days', 'Great Deal!'], icon: <Gem className="w-5 h-5"/>, suffix: 'one-time' },
    { plan: 'unlimited' as UnlockPlan, title: 'Ultimate Subscription', price: pricing?.unlocks.unlimited ?? 999, features: ['Unlimited unlocks for 1 month', 'View all contact details', 'Chat with owners directly', 'Cancel anytime'], icon: <Crown className="w-5 h-5"/>, suffix: 'month' },
  ];

  const listingPlans = [
    { title: 'Roommate Listing', price: pricing?.listings.roommate ?? 149, features: ['30-day listing', 'Reach thousands of users'], icon: <User className="w-5 h-5" />, type: 'Roommate' },
    { title: 'PG/Co-living Listing', price: pricing?.listings.pg ?? 349, features: ['30-day listing', 'Featured for 7 days'], icon: <Building className="w-5 h-5" />, type: 'PG/Co-living' },
    { title: 'Rental Listing', price: pricing?.listings.rental ?? 999, features: ['30-day listing', 'Premium support'], icon: <Crown className="w-5 h-5" />, type: 'Rental' },
  ];

  // What the user already has, and whether each plan can be bought now
  const tier = tierOf(planState);
  const planStatus = (p: { plan: UnlockPlan }): { allowed: boolean; label?: string; upgrade?: boolean } => {
    if (tier === 'unlimited') {
      return p.plan === 'unlimited'
        ? { allowed: false, label: `Active until ${fmtDate(planState?.unlimitedExpiresAt)}` }
        : { allowed: false, label: 'Included in your Ultimate plan' };
    }
    if (typeof p.plan === 'number' && tier && p.plan < tier) {
      return { allowed: false, label: `You have ${planState?.creditsLeft} unlocks left` };
    }
    return { allowed: true, upgrade: tier !== 0 && (p.plan === 'unlimited' || (typeof p.plan === 'number' && p.plan > tier)) };
  };

  // After Google sign-in: continue with the plan and coupon price chosen before signing in
  useEffect(() => {
    if (!isOpen || !autoPurchase) return;
    const plan = unlockPlans.find((p) => p.title === autoPurchase.title);
    onAutoPurchaseHandled?.();
    if (!plan) return;
    const st = planStatus(plan);
    if (!st.allowed) {
      toast({ title: "You already have a plan", description: st.label || "This plan isn't available right now." });
      return;
    }
    setSelectedPlan(plan);
    handleProceedToPayment(autoPurchase.amount, plan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, autoPurchase]);

  // 1. User clicks a plan -> Open confirmation modal first
  const handleSelectPlan = (plan: any) => {
    setSelectedPlan(plan);
    setIsConfirmModalOpen(true);
  };

  // 2. User confirms in second modal -> Proceed to Razorpay
  const handleProceedToPayment = async (finalAmount: number, planOverride?: any) => {
    const currentPlan = planOverride || selectedPlan;
    if (!currentPlan) return;

    // Signed out: remember the plan and the price after coupon, open Google sign-in,
    // then come straight back to Razorpay with the same amount.
    if (typeof window !== 'undefined' && !localStorage.getItem('access_token')) {
      try { sessionStorage.setItem(PENDING_PURCHASE_KEY, JSON.stringify({ title: currentPlan.title, amount: finalAmount, at: Date.now() })); } catch { /* ignore */ }
      setIsConfirmModalOpen(false);
      setSelectedPlan(null);
      onClose(true);
      onRequireSignIn?.();
      return;
    }

    // Close both modals immediately with proceedingToPayment=true so itemToUnlock is NOT re-opened behind Razorpay!
    setIsConfirmModalOpen(false);
    onClose(true); 

    // Release any lingering Radix modal pointer-events lock on document body
    if (typeof document !== 'undefined') {
      document.body.style.pointerEvents = 'auto';
      document.documentElement.style.pointerEvents = 'auto';
    }
    
    toast({
      title: "Connecting to secure gateway...",
      description: "Please wait a moment.",
    });

    // Wait 350ms for Radix UI animations/locks to fully clear before opening Razorpay
    setTimeout(async () => {
      try {
        if (typeof document !== 'undefined') {
          document.body.style.pointerEvents = 'auto';
          document.documentElement.style.pointerEvents = 'auto';
        }

        // Uses `api` from @/lib/api so baseURL and Bearer token are automatically attached
        const { data } = await api.post('/payments/create-order/', {
          amount: finalAmount, 
          property_id: null,
          plan_name: currentPlan.title
        });

        const options = {
          // Uses the key returned by Django first, falling back to environment variables and test key
          key: data?.razorpay_key || data?.key || data?.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || (import.meta.env as any).NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_Tf3u02X48fg0SH',
          amount: data.amount,
          currency: data.currency,
          name: 'SetMyStay',
          description: currentPlan.title,
          order_id: data.order_id,
          handler: async function (response: any) {
            // 1. Save to localStorage purchase history immediately using currentPlan
            try {
              const existing = JSON.parse(localStorage.getItem('setmystay_purchase_history') || '[]');
              const newPurchase = {
                id: response.razorpay_payment_id || `pur_${Date.now()}`,
                plan: currentPlan.title,
                plan_name: currentPlan.title,
                date: new Date().toISOString(),
                created_at: new Date().toISOString(),
                amount: finalAmount,
              };
              localStorage.setItem('setmystay_purchase_history', JSON.stringify([newPurchase, ...existing]));
            } catch (e) {
              console.error(e);
            }

            // 2. Also notify backend
            try {
              const uEmail = (typeof window !== 'undefined' ? (localStorage.getItem('user_email') || '') : '') || '';
              const uName = (typeof window !== 'undefined' ? (localStorage.getItem('user_name') || '') : '') || '';
              await api.post('/payments/verify-local/', {
                property_id: null,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                plan_name: currentPlan.title,
                amount: finalAmount,
                user_email: uEmail,
                user_name: uName,
              });
            } catch (e) {
              console.warn("Payment verification failed:", e);
              toast({
                title: "Payment not confirmed",
                description: "We could not confirm this payment. If money was deducted, contact support with ID " + (response.razorpay_payment_id || '') + ".",
                variant: "destructive",
              });
              if (typeof document !== 'undefined') document.body.style.pointerEvents = 'auto';
              setSelectedPlan(null);
              return;
            }

            toast({
              title: "Payment Successful!",
              description: `Your ${currentPlan.title} is now active!`,
              variant: "default",
            });

            if (typeof document !== 'undefined') {
              document.body.style.pointerEvents = 'auto';
            }

            // Pass currentPlan to onPlanSelect
            onPlanSelect({ plan: currentPlan.plan, title: currentPlan.title, price: finalAmount });
          },
          prefill: {
            name: (typeof localStorage !== 'undefined' && localStorage.getItem('user_name')) || "SetMyStay User",
            email: (typeof localStorage !== 'undefined' && localStorage.getItem('user_email')) || "user@setmystay.com",
            contact: (typeof localStorage !== 'undefined' && localStorage.getItem('user_phone')) || "",
          },
          theme: { color: '#2563eb' },
          modal: {
            ondismiss: function () {
              setSelectedPlan(null);
              if (typeof document !== 'undefined') {
                document.body.style.pointerEvents = 'auto';
              }
              // Payment was dismissed, restore the previous modal view
              onClose(false);
            }
          }
        };

        // Right after a sign-in reload the checkout script may still be loading
        for (let i = 0; i < 40 && !(window as any).Razorpay; i++) await new Promise((r) => setTimeout(r, 150));
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          toast({
            title: "Payment Failed",
            description: response.error?.description || "Payment could not be completed.",
            variant: "destructive",
          });
          setSelectedPlan(null);
          if (typeof document !== 'undefined') {
            document.body.style.pointerEvents = 'auto';
          }
          onClose(false);
        });
        rzp.open();

      } catch (error: any) {
        console.error("Payment Error", error);
        const errorMsg = error.response?.status === 401
          ? "Please sign in before purchasing a plan."
          : error.response?.data?.error
            ? String(error.response.data.error)
            : "Could not start the payment. Please check your internet and try again.";
        
        toast({
          title: "Payment Failed",
          description: errorMsg,
          variant: "destructive",
        });
        setSelectedPlan(null);
        if (typeof document !== 'undefined') {
          document.body.style.pointerEvents = 'auto';
        }
        onClose(false);
      }
    }, 350); 
  };
  
  return (
    <>
      <RazorpayScript />

      {/* Pricing Cards Modal */}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:w-[92vw] max-w-5xl p-0 max-h-[90vh] flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden my-auto border border-border/80 shadow-2xl">
          <DialogHeader className="p-4 md:p-6 pb-4 border-b shrink-0 relative flex flex-row items-center justify-between">
            <div className="flex-1 text-center pr-6 sm:pr-0">
              <DialogTitle className="text-xl sm:text-3xl font-bold">Our Pricing Plans</DialogTitle>
              <DialogDescription className="text-xs sm:text-base mt-1">
                Choose a plan that's right for you.
              </DialogDescription>
            </div>
          </DialogHeader>

          <Tabs defaultValue="unlock" className="w-full flex flex-col flex-1 min-h-0">
            <div className="px-4 md:px-6 py-4 border-b">
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger value="unlock" className="text-sm sm:text-base">Unlock Contact Details</TabsTrigger>
                <TabsTrigger value="list" className="text-sm sm:text-base">List Your Property</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="unlock" className="mt-0">
                <div className="p-4 md:p-8">
                  {tier === 'unlimited' && (
                    <div className="mb-5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                      <span className="font-semibold">You're on the Ultimate plan.</span> Unlimited unlocks until {fmtDate(planState?.unlimitedExpiresAt)}.
                    </div>
                  )}
                  {typeof tier === 'number' && tier > 0 && (
                    <div className="mb-5 rounded-xl border bg-muted/50 px-4 py-3 text-sm">
                      You have <span className="font-semibold">{planState?.creditsLeft} unlocks</span> left. You can upgrade to a bigger plan anytime.
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {unlockPlans.map(p => { const st = planStatus(p); const isActive = tier === 'unlimited' && p.plan === 'unlimited'; return (
                      <Card key={p.title} className={`flex flex-col transition-shadow ${isActive ? 'border-2 border-primary shadow-lg' : st.allowed ? 'border-primary/50 hover:shadow-lg' : 'border-border opacity-70'}`}>
                        <CardHeader className="items-center text-center">
                          <div className="p-3 bg-primary/10 rounded-full mb-2 text-primary">{p.icon}</div>
                          <CardTitle>{p.title}</CardTitle>
                          <CardDescription>
                            <span className="text-3xl font-bold text-foreground">₹{p.price}</span>
                            <span className="text-muted-foreground">/{p.suffix}</span>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            {p.features.map(feature => (
                              <li key={feature} className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-green-500 mt-1 shrink-0"/>
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                        <CardFooter className="flex-col gap-2">
                          {st.allowed ? (
                            <Button 
                              className="w-full" 
                              disabled={processingPlan === p.title}
                              onClick={() => handleSelectPlan(p)}
                            >
                              {processingPlan === p.title ? "Processing..." : st.upgrade ? "Upgrade" : "Choose Plan"}
                            </Button>
                          ) : (
                            <Button className="w-full" variant={isActive ? "default" : "secondary"} disabled>
                              {isActive ? <><Check className="mr-1.5 h-4 w-4" />Your current plan</> : "Not needed now"}
                            </Button>
                          )}
                          {st.label && <p className="text-center text-xs text-muted-foreground">{st.label}</p>}
                        </CardFooter>
                      </Card>
                    ); })}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="list" className="mt-0">
                <div className="p-4 md:p-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {listingPlans.map(p => (
                      <Card key={p.title} className="flex flex-col border-accent/50 hover:shadow-lg transition-shadow">
                        <CardHeader className="items-center text-center">
                          <div className="p-3 bg-accent/10 rounded-full mb-2 text-accent">{p.icon}</div>
                          <CardTitle>{p.title}</CardTitle>
                          <CardDescription>
                            <span className="text-3xl font-bold text-foreground">₹{p.price}</span>
                            <span className="text-muted-foreground">/listing</span>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            {p.features.map(feature => (
                              <li key={feature} className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-green-500 mt-1 shrink-0"/>
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                        <CardFooter>
                          <Button className="w-full" variant="secondary" onClick={onNavigateToListProperty}>
                            List your {p.type}
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Coupon / Confirmation Modal */}
      {selectedPlan && (
        <PaymentConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => {
            setIsConfirmModalOpen(false);
            setSelectedPlan(null);
          }}
          onConfirm={handleProceedToPayment}
          planName={selectedPlan.title}
          amount={selectedPlan.price}
          availableCoupons={availableCoupons}
        />
      )}
    </>
  );
}