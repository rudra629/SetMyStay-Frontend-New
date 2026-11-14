import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin Login — SetMyStay" },
      { name: "description", content: "Secure admin sign-in for SetMyStay." },
      { property: "og:title", content: "Admin Login — SetMyStay" },
      { property: "og:description", content: "Secure admin sign-in for SetMyStay." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminLoginPage,
});

import { useState, useEffect } from 'react';
import { useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Lock, User, Home, MailCheck, ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '@/components/icons';
import api from '@/lib/api';

// Saved when the admin ticks "Remember this device"; lets this browser skip the email code.
const DEVICE_KEY = 'setmystay_admin_device';

/**
 * Admin sign-in in two steps:
 *  1. username + password (checked by the server)
 *  2. a 6-digit code sent to the admin's email (skipped on a remembered device)
 */
function AdminLoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<'password' | 'code'>('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(true);
  const [challengeId, setChallengeId] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (localStorage.getItem('admin_authenticated') === 'true' && localStorage.getItem('panel_access_token')) {
      navigate({ to: '/admin', replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const finishLogin = (data: any) => {
    localStorage.setItem('panel_access_token', data.access);
    localStorage.setItem('panel_refresh_token', data.refresh);
    localStorage.setItem('admin_authenticated', 'true');
    if (data.device_token) localStorage.setItem(DEVICE_KEY, data.device_token);
    toast({ title: 'Signed in', description: 'Opening the admin dashboard...' });
    navigate({ to: '/admin' });
  };

  const errorText = (error: any, fallback: string) => {
    const status = error?.response?.status;
    if (error?.response?.data?.error) return error.response.data.error;
    if (error?.response?.data?.detail) return error.response.data.detail;
    if (status === 429) return 'Too many tries. Please wait a little and try again.';
    if (!error?.response) return 'Could not reach the server. It may be waking up, try again in 30 seconds.';
    return fallback;
  };

  const requestCode = async () => {
    const { data } = await api.post('/auth/admin/login/', {
      username: username.trim(),
      password,
      device_token: localStorage.getItem(DEVICE_KEY) || '',
    });
    if (!data.otp_required) {
      finishLogin(data);
      return;
    }
    setChallengeId(data.challenge_id);
    setEmailHint(data.email_hint || 'your admin email');
    setResendIn(data.resend_after_seconds || 45);
    setCode('');
    setStep('code');
    toast({ title: 'Code sent', description: `We emailed a 6-digit code to ${data.email_hint || 'your admin email'}.` });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    localStorage.removeItem('admin_authenticated');
    try {
      await requestCode();
    } catch (error: any) {
      toast({ title: 'Sign-in failed', description: errorText(error, 'Wrong username or password.'), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    try {
      await requestCode();
    } catch (error: any) {
      const wait = error?.response?.data?.retry_after;
      if (wait) setResendIn(wait);
      toast({ title: 'Could not resend', description: errorText(error, 'Please try again.'), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data } = await api.post('/auth/admin/verify-otp/', {
        challenge_id: challengeId,
        code: code.trim(),
        remember_device: remember,
      });
      finishLogin(data);
    } catch (error: any) {
      const msg = errorText(error, 'That code did not work.');
      toast({ title: 'Code not accepted', description: msg, variant: 'destructive' });
      if (/sign in again/i.test(msg)) {
        setStep('password');
        setCode('');
      }
      setIsLoading(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <LoadingSpinner className="w-12 h-12 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Admin Panel Access</CardTitle>
          <CardDescription>
            {step === 'password' ? 'Step 1 of 2: sign in with your admin account.' : 'Step 2 of 2: enter the code from your email.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin" autoComplete="username" required className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type={showPassword ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                    autoComplete="current-password" required className="pl-10" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="show-password" checked={showPassword} onCheckedChange={(v) => setShowPassword(v === true)} />
                <Label htmlFor="show-password" className="text-sm font-normal">Show Password</Label>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Checking...' : 'Continue'}
              </Button>
              <div className="text-center">
                <Button variant="link" asChild>
                  <Link to="/"><Home className="w-4 h-4 mr-2" />Go to Main Site</Link>
                </Button>
              </div>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                <MailCheck className="mt-0.5 h-5 w-5 shrink-0" />
                <span>We sent a 6-digit code to <strong>{emailHint}</strong>. It expires in 10 minutes. Check spam if you can't see it.</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="otp">Email code</Label>
                <Input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456" required autoFocus className="text-center text-2xl tracking-[0.5em] font-semibold" />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="remember-device" checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
                <Label htmlFor="remember-device" className="text-sm font-normal">
                  Remember this device for 30 days (don't ask for a code here)
                </Label>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || code.length !== 6}>
                {isLoading ? 'Verifying...' : 'Verify and sign in'}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <Button variant="link" type="button" className="px-0" onClick={() => { setStep('password'); setCode(''); }}>
                  <ArrowLeft className="w-4 h-4 mr-1" />Back
                </Button>
                <Button variant="link" type="button" className="px-0" disabled={resendIn > 0 || isLoading} onClick={handleResend}>
                  {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
