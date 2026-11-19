'use client';

import React, { useEffect, useMemo, useState } from 'react';
import api, { getCoupons } from '@/lib/api';
import type { Coupon } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { IndianRupee, Info, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from "@tanstack/react-router";
import { RazorpayScript } from "@/components/razorpay-script";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId?: string;
  amount?: number;
  userEmail?: string;
  userName?: string;
  pricing?: any;
  /** Which listing is being paid for: sets the plan name and lets the server check the price */
  listingType?: string;
  onProceedToPayment?: (plan?: any) => Promise<void> | void;
}

const LISTING_LABEL: Record<string, string> = { PG: 'PG / Co-living Listing', RENTAL: 'Rental Listing', ROOMMATE: 'Roommate Listing' };

export function ListPropertyPaymentModal({ 
  isOpen, 
  onClose, 
  propertyId = '', 
  amount = 499,
  userEmail = "owner@setmystay.com",
  userName = "Property Owner",
  listingType,
  onProceedToPayment,
}: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const type = String(listingType || '').toUpperCase();
  const planLabel = LISTING_LABEL[type] || 'Listing Fee';
  const originalAmount = Number(amount) > 0 ? Number(amount) : 499;

  // Listing-fee coupons only (unlock-plan coupons don't work here)
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    getCoupons().then((all: Coupon[]) => setCoupons(all.filter((c) => c.isActive && c.scope === 'listings'))).catch(() => {});
  }, [isOpen]);
  useEffect(() => { setAppliedCoupon(null); setCouponCode(''); }, [originalAmount, type]);

  const validAmount = useMemo(() => {
    if (!appliedCoupon) return originalAmount;
    const pct = Math.min(Math.max(appliedCoupon.discountPercentage, 0), 90);
    return Math.max(1, Math.round(originalAmount - originalAmount * (pct / 100)));
  }, [originalAmount, appliedCoupon]);

  const applyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    const c = coupons.find((x) => x.code.toUpperCase() === code);
    if (c) {
      setAppliedCoupon(c);
      toast({ title: 'Coupon Applied!', description: `You've received a ${c.discountPercentage}% discount.` });
    } else {
      toast({ title: 'Invalid Coupon', description: 'This code is not valid for listing fees, or it has expired.', variant: 'destructive' });
    }
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    onClose();

    toast({
      title: "Connecting to payment gateway...",
      description: "Please wait a moment.",
    });

    setTimeout(async () => {
      try {
        const { data } = await api.post('/payments/create-order/', {
          amount: validAmount,
          property_id: propertyId || null,
          plan_name: 'Property Listing Fee',
          listing_type: type ? type.toLowerCase() : undefined,
        });

        // Robust key resolution: checks backend keys (razorpay_key, key, key_id)
        // and falls back to frontend environment variables and test key
        const razorpayKey =
          data?.razorpay_key ||
          data?.key ||
          data?.key_id ||
          import.meta.env.VITE_RAZORPAY_KEY_ID ||
          (import.meta.env as any).NEXT_PUBLIC_RAZORPAY_KEY_ID ||
          'rzp_test_Tf3u02X48fg0SH';

        if (!razorpayKey) {
          throw new Error("Razorpay Key ID is missing. Please check your configuration.");
        }

        if (typeof (window as any).Razorpay === "undefined") {
          throw new Error("Razorpay SDK is not loaded yet. Please wait a moment and try again.");
        }

        const options = {
          key: razorpayKey,
          amount: data.amount,
          currency: data.currency || 'INR',
          name: 'SetMyStay',
          description: appliedCoupon ? `${planLabel} (coupon ${appliedCoupon.code})` : planLabel,
          order_id: data.order_id,
          handler: async function (response: any) {
            // 1. Confirm the payment with our server first (records the listing fee)
            try {
              const uEmail = (typeof window !== 'undefined' ? (localStorage.getItem('user_email') || userEmail) : userEmail) || '';
              const uName = (typeof window !== 'undefined' ? (localStorage.getItem('user_name') || userName) : userName) || '';
              await api.post('/payments/verify-local/', {
                property_id: propertyId || null,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                plan_name: 'Property Listing Fee',
                amount: validAmount,
                user_email: uEmail,
                user_name: uName,
              });
            } catch (e) {
              console.warn("Payment confirmation failed:", e);
              setIsProcessing(false);
              toast({
                title: "Payment not confirmed yet",
                description: `We couldn't confirm your payment. Please contact us with payment ID ${response.razorpay_payment_id || ''} and we'll sort it out.`,
                variant: "destructive",
              });
              return;
            }

            // 2. Keep it in this browser's purchase history
            try {
              const existing = JSON.parse(localStorage.getItem('setmystay_purchase_history') || '[]');
              const newPurchase = {
                id: response.razorpay_payment_id || `pur_${Date.now()}`,
                plan: 'Property Listing Fee',
                plan_name: 'Property Listing Fee',
                date: new Date().toISOString(),
                created_at: new Date().toISOString(),
                amount: validAmount,
              };
              localStorage.setItem('setmystay_purchase_history', JSON.stringify([newPurchase, ...existing]));
            } catch (e) {
              console.error(e);
            }

            // 3. Now submit the listing, linked to this payment (the page shows the result)
            setIsProcessing(false);
            if (onProceedToPayment) {
              await onProceedToPayment({ title: 'Property Listing Fee', price: validAmount, paymentId: response.razorpay_payment_id });
            } else {
              toast({ title: "Payment Successful!", description: "Your listing fee is paid." });
              navigate({ to: "/" });
            }
          },
          prefill: {
            name: (typeof window !== 'undefined' && localStorage.getItem('user_name')) || userName,
            email: userEmail,
          },
          theme: {
            color: '#2563eb',
          },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          toast({
            title: "Payment Failed",
            description: response.error?.description || "Transaction was declined.",
            variant: "destructive",
          });
          setIsProcessing(false);
        });

        rzp.open();
      } catch (error: any) {
        console.error("Payment Initialization Failed:", error);
        toast({
          title: "Payment Gateway Error",
          description: error?.response?.data?.error || error?.message || "Could not initialize payment gateway.",
          variant: "destructive",
        });
        setIsProcessing(false);
      }
    }, 400);
  };

  return (
    <>
      <RazorpayScript />
      
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">Confirm Your Purchase</DialogTitle>
            <DialogDescription className="text-center">Please review your order before proceeding.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="border rounded-lg p-4 bg-muted/50 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Plan:</span>
                <span className="font-semibold">{planLabel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Original Price:</span>
                <span className="font-semibold flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{originalAmount}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between items-center text-green-600">
                  <span className="text-sm">Discount ({appliedCoupon.discountPercentage}%):</span>
                  <span className="font-semibold flex items-center">- <IndianRupee className="w-3 h-3 mx-1" />{originalAmount - validAmount}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-lg border-t pt-2 mt-2">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-bold flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{validAmount}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="listing-coupon-code" className="text-sm">Have a coupon code?</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="listing-coupon-code"
                  placeholder="Enter code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } }}
                  disabled={!!appliedCoupon}
                />
                {appliedCoupon ? (
                  <Button variant="ghost" size="icon" aria-label="Remove coupon" onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} className="text-destructive">
                    <XCircle className="w-5 h-5" />
                  </Button>
                ) : (
                  <Button onClick={applyCoupon} variant="secondary">Apply</Button>
                )}
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Important: Listing Verification</AlertTitle>
              <AlertDescription>
                Your listing will be manually reviewed by our staff before it goes live. If it is rejected for any reason, your payment will be fully refunded within 3 working days.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handlePayment} disabled={isProcessing} className="w-full sm:w-auto">
              {isProcessing ? 'Processing...' : `Pay ₹${validAmount}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}