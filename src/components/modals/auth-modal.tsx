"use client";

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { DEMO_MODE } from '@/lib/demo-backend';
import { addProfile } from "@/lib/app-settings";

// Works on Vercel (uses NEXT_PUBLIC_API_URL) and Locally (falls back to localhost:8000)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'login' | 'complete_profile'>('login');
  
  // Mandatory profile fields
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [address, setAddress] = useState('');

  const { toast } = useToast();
  const googleWrapRef = useRef<HTMLDivElement>(null);
  const [googleWidth, setGoogleWidth] = useState(280);

  // Measure the available width so the Google button fills the modal on any screen size
  useEffect(() => {
    if (!isOpen) return;
    const el = googleWrapRef.current;
    if (!el) return;
    const update = () => setGoogleWidth(Math.max(200, Math.min(400, Math.floor(el.clientWidth))));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen]);

  // Check on mount or step change to populate prefilled data
  useEffect(() => {
    if (isOpen) {
      const token = localStorage.getItem('access_token');
      const isProfileComplete = localStorage.getItem('is_profile_complete');
      
      setFullName(localStorage.getItem('user_name') || '');
      setEmailAddress(localStorage.getItem('user_email') || '');
      setPhoneNumber(localStorage.getItem('user_phone') || '');
      setAddress(localStorage.getItem('user_address') || '');

      if (token && isProfileComplete === 'false') {
        setStep('complete_profile');
      } else {
        setStep('login');
      }
    }
  }, [isOpen]);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    try {
      // 1. Send the Google token to our Django backend using dynamic API_URL
      const res = await fetch(`${API_URL}/users/google-login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      const data = await res.json();

      if (res.ok) {
        // 2. Save tokens and user details to localStorage
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        localStorage.setItem('is_profile_complete', String(data.is_profile_complete));
        localStorage.setItem('user_pic', data.picture || '');
        localStorage.setItem('user_name', data.first_name || '');
        if (data.email) localStorage.setItem('user_email', data.email);
        if (data.phone_number) localStorage.setItem('user_phone', data.phone_number);
        if (data.address) localStorage.setItem('user_address', data.address);

        setFullName(data.first_name || '');
        setEmailAddress(data.email || '');
        setPhoneNumber(data.phone_number || '');
        setAddress(data.address || '');

        // 3. Route them based on the flag
        if (data.is_profile_complete) {
          toast({ title: "Welcome back!", description: "You successfully logged in." });
          onLoginSuccess();
          onClose();
        } else {
          // Flip the modal to the mandatory complete profile form
          setStep('complete_profile');
          toast({ title: "Almost there!", description: "Please complete your profile to continue." });
        }
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error: any) {
      console.error(error);
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoSignIn = () => {
    localStorage.setItem('access_token', 'demo-access-token');
    localStorage.setItem('refresh_token', 'demo-refresh-token');
    localStorage.setItem('is_profile_complete', 'true');
    localStorage.setItem('user_name', 'Demo User');
    localStorage.setItem('user_email', 'demo@setmystay.com');
    localStorage.setItem('user_phone', '+919999999999');
    localStorage.setItem('user_address', 'Mumbai, Maharashtra');
    localStorage.setItem('user_pic', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80');
    toast({ title: 'Signed in', description: 'You are using a test account.' });
    onLoginSuccess();
    onClose();
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast({ title: "Required", description: "Please enter your full name.", variant: "destructive" });
      return;
    }
    const cleanPhone = phoneNumber.trim().replace(/[\s-]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      toast({ title: "Invalid Phone", description: "Please enter a valid phone number (at least 10 digits).", variant: "destructive" });
      return;
    }
    if (!emailAddress.trim() || !emailAddress.includes('@')) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    if (!address.trim() || address.trim().length < 4) {
      toast({ title: "Required", description: "Please enter your address.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('access_token');
      
      const res = await fetch(`${API_URL}/users/complete-profile/`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          first_name: fullName.trim(), 
          phone_number: cleanPhone,
          email: emailAddress.trim(),
          address: address.trim(),
          role: 'SEEKER' 
        }), 
      });

      if (res.ok) {
        localStorage.setItem('is_profile_complete', 'true');
        localStorage.setItem('user_name', fullName.trim());
        localStorage.setItem('user_email', emailAddress.trim());
        localStorage.setItem('user_phone', cleanPhone);
        localStorage.setItem('user_address', address.trim());

        addProfile({
          name: fullName.trim(),
          phone: cleanPhone,
          email: emailAddress.trim(),
          address: address.trim(),
        });

        // Set DONE_KEY so welcome modal doesn't fire redundantly
        try {
          const done = JSON.parse(localStorage.getItem('setmystay_profile_done') || '[]');
          localStorage.setItem('setmystay_profile_done', JSON.stringify([...done, emailAddress.trim(), fullName.trim()]));
        } catch {}

        toast({ title: "Profile Complete!", description: "Your details have been saved." });
        onLoginSuccess();
        onClose();
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error(error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Prevent closing without completing profile
  const handleOpenChange = (open: boolean) => {
    const isProfileComplete = localStorage.getItem('is_profile_complete');
    const token = localStorage.getItem('access_token');
    
    if (!open && token && isProfileComplete === 'false') {
      toast({ title: "Required", description: "You must complete your profile to continue.", variant: "destructive" });
      return; 
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-2.5rem)] max-w-[360px] rounded-3xl p-5 sm:p-6 shadow-2xl">
        {step === 'login' ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">Welcome to SetMyStay</DialogTitle>
              <DialogDescription className="text-center">
                Sign in to manage your property listings.
              </DialogDescription>
            </DialogHeader>
            <div ref={googleWrapRef} className="flex justify-center py-4 w-full">
              <GoogleOAuthProvider clientId="567107261238-gujakiaj292e4fm7kk5t74k15j1umgno.apps.googleusercontent.com">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {
                    toast({ title: "Error", description: "Google Login Failed", variant: "destructive" });
                  }}
                  width={googleWidth}
                  shape="pill"
                  size="large"
                  text="continue_with"
                />
              </GoogleOAuthProvider>
            </div>
            {DEMO_MODE && (
              <div className="space-y-2 border-t pt-4">
                <Button className="w-full" onClick={handleDemoSignIn}>Continue with test account</Button>
                <p className="text-center text-xs text-muted-foreground">Temporary — for testing until the backend is connected.</p>
              </div>
            )}
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">Complete Your Profile</DialogTitle>
              <DialogDescription className="text-center">
                Please provide your contact information to continue.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCompleteProfile} className="space-y-3 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="fullname">Full Name</Label>
                <Input 
                  id="fullname" 
                  type="text"
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  type="tel"
                  placeholder="+91 9999999999"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email"
                  placeholder="user@example.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Address / City</Label>
                <Textarea 
                  id="address" 
                  rows={2}
                  placeholder="e.g. Sector 15, CBD Belapur, Navi Mumbai"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required 
                />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                {isLoading ? "Saving Profile..." : "Save & Continue"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}