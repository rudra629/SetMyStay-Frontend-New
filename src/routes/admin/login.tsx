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
import { Lock, User, Home } from 'lucide-react';
import { LoadingSpinner } from '@/components/icons';
import api, { loginUser } from '@/lib/api';

/**
 * Admin sign-in. The username and password are checked by the Django server
 * (the same account used at /admin on the backend). Nothing secret lives in this file.
 */
function AdminLoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (localStorage.getItem('admin_authenticated') === 'true' && localStorage.getItem('access_token')) {
      navigate({ to: '/admin', replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await loginUser({ username: username.trim(), password });
      const { data } = await api.get('/auth/verify-admin/');
      if (!data?.is_superuser) {
        throw Object.assign(new Error('not admin'), { notAdmin: true });
      }
      localStorage.setItem('admin_authenticated', 'true');
      toast({ title: 'Signed in', description: 'Opening the admin dashboard...' });
      navigate({ to: '/admin' });
    } catch (error: any) {
      localStorage.removeItem('admin_authenticated');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      const status = error?.response?.status;
      toast({
        title: 'Sign-in failed',
        description: error?.notAdmin || status === 403
          ? 'This account is not an admin account.'
          : status === 401
            ? 'Wrong username or password.'
            : 'Could not reach the server. Please try again in a minute.',
        variant: 'destructive',
      });
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
          <CardDescription>Sign in with your admin account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Checkbox id="show-password" onCheckedChange={() => setShowPassword(!showPassword)} />
              <Label htmlFor="show-password" className="text-sm font-normal">Show Password</Label>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
            <div className="text-center">
              <Button variant="link" asChild>
                <Link to="/"><Home className="w-4 h-4 mr-2" />Go to Main Site</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
