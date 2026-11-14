'use client';

import React, { useState } from 'react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  onProceedToPayment?: (plan?: any) => Promise<void> | void;
}

export function ListPropertyPaymentModal({ 
  isOpen, 
  onClose, 
  propertyId = '', 
  amount = 499,
  userEmail = "owner@setmystay.com",
  userName = "Property Owner",
  onProceedToPayment,
}: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const validAmount = Number(amount) > 0 ? Number(amount) : 499;

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
        });

        // Robust key resolution: checks backend keys (razorpay_key, key, key_id)
        // and falls back to frontend environment variables
        const razorpayKey =
          data.razorpay_key ||
          data.key ||
          data.key_id ||
          import.meta.env.VITE_RAZORPAY_KEY_ID ||
          (import.meta.env as any).NEXT_PUBLIC_RAZORPAY_KEY_ID;

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
          description: 'Property Listing Fee',
          order_id: data.order_id,
          handler: async function (response: any) {
            toast({
              title: "Payment Successful!",
              description: "Submitting your listing for approval...",
              variant: "default",
            });

            // 1. Submit the property listing to the backend
            if (onProceedToPayment) {
              try {
                await onProceedToPayment({ title: 'Property Listing Fee', price: validAmount });
              } catch (err) {
                console.error("Error in onProceedToPayment:", err);
              }
            }

            // 2. Verify payment & record in Purchase History on backend
            try {
              await api.post('/payments/verify-local/', {
                property_id: propertyId || null,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                plan_name: 'Property Listing Fee',
                amount: validAmount,
              });
            } catch (e) {
              console.warn("Verification warning:", e);
            }

            // 3. Save to localStorage purchase history
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

            toast({
              title: "Listing Submitted!",
              description: "Your property has been submitted for admin approval.",
            });
            setIsProcessing(false);
            navigate({ to: "/" });
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
            <DialogTitle>Complete Your Listing</DialogTitle>
            <DialogDescription>
              Pay the listing fee of ₹{validAmount} to publish your property on SetMyStay.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-4 py-4">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg">
              <span className="font-medium text-slate-700">Total Amount</span>
              <span className="font-bold text-lg">₹{validAmount}</span>
            </div>
            
            <Button 
              onClick={handlePayment} 
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? "Processing..." : `Pay ₹${validAmount} Now`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}