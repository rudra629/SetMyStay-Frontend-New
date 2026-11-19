import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
    head: () => ({
        meta: [
            { title: "Admin Dashboard — SetMyStay" },
            { name: "description", content: "SetMyStay admin dashboard for managing listings, staff, coupons and advertisements." },
            { property: "og:title", content: "Admin Dashboard — SetMyStay" },
            { property: "og:description", content: "SetMyStay admin dashboard for managing listings, staff, coupons and advertisements." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary_large_image" },
        ],
    }),
    component: AdminDashboard,
});

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from "@tanstack/react-router";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Eye, Building, Users, LockOpen, Home, X as XIcon, HelpCircle, CheckCircle, Trash2, ChevronLeft, ChevronRight, LogOut, XCircle, PlusCircle, Edit, ImageIcon, Ticket, Settings, KeyRound, ShieldQuestion, Mail, Phone, MapPin, FileCheck, Search, Filter, Calendar as CalendarIcon, FileText, Bell, UserPlus, Clock, User as UserIcon, Star, MessageSquare, Briefcase, Info } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
    getAdminProperties, updatePropertyStatus, deleteProperty,
    getCoupons, createCoupon, updateCoupon, deleteCoupon,
    getAdvertisements, createAdvertisement, updateAdvertisement, deleteAdvertisement,
    getStaff, createStaff, updateStaff, deleteStaff,
    getAllPurchasesAdmin, // 👈 Added the new API call
    listingToRoommateProfile,
    getPropertyById
} from '@/lib/api'; // Or '@/lib/apis' depending on your file name

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api, { getProperties } from '@/lib/api';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/icons';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { Advertisement, Coupon, StaffMember, Rating, Listing, RoommateProfile, AnyListing, Inquiry, PricingData } from '@/lib/types';
import { dummyCoupons, dummyProperties, dummyRoommates, dummyStaff, defaultPricing } from '@/lib/data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfWeek, addDays, getWeek, formatDistanceToNow, differenceInHours } from 'date-fns';
import { cn, isVideoUrl, whatsappLink, listingCode, matchesListingCode } from '@/lib/utils';
import { ListingIdLookup } from '@/components/admin/listing-id-lookup';
import { getFromLocalStorage, saveToLocalStorage } from '@/lib/storage';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ThemeCustomizer, DemoDataCard } from '@/components/admin/theme-customizer';
import { UserProfilesTable } from '@/components/admin/user-profiles-table';
import { VendorsPanel } from '@/components/admin/vendors-panel';
import { HeroAdsManager } from '@/components/admin/hero-ads-manager';
import { EditedTag, ListingChanges, ChangedInline } from '@/components/admin/listing-changes';
import { RoommateAnswers } from '@/components/shared/roommate-answers';
import { NotificationsPanel, useEditNotificationCount, type EditNotification } from '@/components/admin/notifications-panel';
import { loadSettings, saveSettings } from '@/lib/app-settings';

// Default credentials sourced from environment variables with safe fallbacks
// Admin sign-in is checked by the Django server; no passwords are stored in the website code.
const DEFAULT_ADMIN_PASSWORD = '';
const DEFAULT_ADMIN_OTP = '';
const DEFAULT_ADMIN_QUESTION = '';
const DEFAULT_ADMIN_ANSWER = '';
const DEFAULT_ADMIN_EMAIL = 'setmystay02@gmail.com';
const DEFAULT_ADMIN_PHONE = '+91 79771 69550';
const DEFAULT_ADMIN_ADDRESS = 'Office no. 01, Neelsidhi Splendour, Sector 15, CBD Belapur, Navi Mumbai, Maharashtra 400614';

// Chart data generation functions
const generateHourlyData = (date: Date) => {
    return Array.from({ length: 24 }, (_, i) => ({
        name: `${i.toString().padStart(2, '0')}:00`,
        views: Math.floor(Math.random() * 50) + (i > 8 && i < 22 ? 20 : 5),
    }));
};
const generateDailyData = (date: Date) => {
    const start = startOfWeek(date);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map((day, i) => ({
        name: `${day} (${format(addDays(start, i), 'd')})`,
        views: Math.floor(Math.random() * 200) + 100,
    }));
};
const generateWeeklyData = (year: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let weeklyData: { name: string, views: number }[] = [];
    months.forEach((month) => {
        for (let week = 1; week <= 4; week++) {
            weeklyData.push({
                name: `W${week} (${month})`,
                views: Math.floor(Math.random() * 500) + 800,
            });
        }
    });
    return weeklyData.slice(0, 52); // Cap at 52 weeks
};
const generateMonthlyData = (year: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map(month => ({
        name: month,
        views: Math.floor(Math.random() * 4000) + 1000 + (year - 2022) * 500
    }));
};
const generateYearlyData = () => {
    const years = [2022, 2023, 2024];
    return years.map(year => ({
        name: year.toString(),
        views: Math.floor(Math.random() * 30000) + 20000 + (year - 2022) * 15000
    }));
};

// How long listings waited before this staff member reviewed them, e.g. "18 h 28 min (1 listing)".
const formatReviewWait = (s: any): string => {
    let mins: number | null = typeof s?.avg_review_wait_minutes === 'number' ? s.avg_review_wait_minutes : null;
    if (mins === null && typeof s?.avg_processing_hours === 'number') mins = Math.round(s.avg_processing_hours * 60);
    if (mins === null) return 'No reviews yet';
    let text: string;
    if (mins < 1) text = 'under 1 min';
    else if (mins < 60) text = `${mins} min`;
    else if (mins < 48 * 60) text = `${Math.floor(mins / 60)} h${mins % 60 ? ` ${mins % 60} min` : ''}`;
    else text = `${Math.round(mins / (24 * 60))} days`;
    const n = s?.reviews_count;
    return typeof n === 'number' ? `${text} (${n} ${n === 1 ? 'listing' : 'listings'})` : text;
};

const PasswordChangeForm = ({ currentPassword, onSave, onClose }: { currentPassword: string; onSave: (newPassword: string) => void; onClose: () => void; }) => {
    const { toast } = useToast();
    const [passwords, setPasswords] = useState({
        current: '',
        newPass: '',
        confirmPass: ''
    });

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswords(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmitPasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.newPass !== passwords.confirmPass) {
            toast({ title: 'Error', description: 'New passwords do not match.', variant: 'destructive' });
            return;
        }
        if (passwords.newPass.length < 8) {
            toast({ title: 'Error', description: 'New password must be at least 8 characters.', variant: 'destructive' });
            return;
        }
        try {
            // Changes the real admin password on the server
            await api.post('/auth/change-password/', { old_password: passwords.current, new_password: passwords.newPass });
            toast({ title: 'Success!', description: 'Your password has been changed. Use it next time you sign in.' });
            onClose();
        } catch (err: any) {
            const msg = err?.response?.data?.error || 'Could not change the password.';
            toast({ title: 'Error', description: msg, variant: 'destructive' });
        }
    };

    return (
        <form onSubmit={handleSubmitPasswordChange} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" name="current" type="password" value={passwords.current} onChange={handlePasswordChange} required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" name="newPass" type="password" value={passwords.newPass} onChange={handlePasswordChange} required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" name="confirmPass" type="password" value={passwords.confirmPass} onChange={handlePasswordChange} required />
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit">Update Password</Button>
            </DialogFooter>
        </form>
    );
};

const PinChangeForm = ({ currentPin, onSave, onClose }: { currentPin: string; onSave: (newPin: string) => void; onClose: () => void; }) => {
    const { toast } = useToast();
    const [pins, setPins] = useState({
        current: '',
        newPin: '',
    });

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPins(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmitPinChange = (e: React.FormEvent) => {
        e.preventDefault();
        if (pins.current !== currentPin) {
            toast({ title: 'Error', description: 'Current PIN is not correct.', variant: 'destructive' });
            return;
        }
        if (!/^\d{8}$/.test(pins.newPin)) {
            toast({ title: 'Error', description: 'New PIN must be exactly 8 digits.', variant: 'destructive' });
            return;
        }
        onSave(pins.newPin);
        toast({ title: 'Success!', description: 'Your PIN has been changed.' });
        onClose();
    };

    return (
        <form onSubmit={handleSubmitPinChange} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="current-pin">Current PIN</Label>
                <Input id="current-pin" name="current" type="password" value={pins.current} onChange={handlePinChange} required maxLength={8} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="new-pin">New PIN (8 digits)</Label>
                <Input id="new-pin" name="newPin" type="password" value={pins.newPin} onChange={handlePinChange} required maxLength={8} />
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit">Update PIN</Button>
            </DialogFooter>
        </form>
    );
};

const SecurityQuestionChangeForm = ({ currentQuestion, currentAnswer, onSave, onClose }: { currentQuestion: string; currentAnswer: string, onSave: (newQuestion: string, newAnswer: string) => void, onClose: () => void; }) => {
    const { toast } = useToast();
    const [security, setSecurity] = useState({
        current: '',
        newQuestion: currentQuestion,
        newAnswer: ''
    });

    const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSecurity(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmitSecurityChange = (e: React.FormEvent) => {
        e.preventDefault();
        if (security.current.toLowerCase() !== currentAnswer.toLowerCase()) {
            toast({ title: 'Error', description: 'Your current security answer is not correct.', variant: 'destructive' });
            return;
        }
        if (!security.newQuestion || !security.newAnswer) {
            toast({ title: 'Error', description: 'New question and answer cannot be empty.', variant: 'destructive' });
            return;
        }
        onSave(security.newQuestion, security.newAnswer);
        toast({ title: 'Success!', description: 'Your security question and answer have been updated.' });
        onClose();
    };

    return (
        <form onSubmit={handleSubmitSecurityChange} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="current-answer">Current Security Answer (for: "{currentQuestion}")</Label>
                <Input id="current-answer" name="current" type="text" value={security.current} onChange={handleSecurityChange} required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="new-question">New Security Question</Label>
                <Input id="new-question" name="newQuestion" type="text" value={security.newQuestion} onChange={handleSecurityChange} required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="new-answer">New Security Answer</Label>
                <Input id="new-answer" name="newAnswer" type="text" value={security.newAnswer} onChange={handleSecurityChange} required />
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit">Update Security Question</Button>
            </DialogFooter>
        </form>
    );
};

const ContactInfoChangeForm = ({ currentEmail, currentPhone, currentAddress, onSave, onClose }: { currentEmail: string; currentPhone: string; currentAddress: string; onSave: (info: { email: string, phone: string, address: string }) => void; onClose: () => void; }) => {
    const { toast } = useToast();
    const [info, setInfo] = useState({
        email: currentEmail,
        phone: currentPhone,
        address: currentAddress
    });

    const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setInfo(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!info.email || !info.phone || !info.address) {
            toast({ title: 'Error', description: 'All fields are required.', variant: 'destructive' });
            return;
        }
        onSave(info); // the save handler shows success or the server's error
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" name="email" type="email" value={info.email} onChange={handleInfoChange} required className="pl-10" />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="phone" name="phone" type="tel" value={info.phone} onChange={handleInfoChange} required className="pl-10" />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="address">Office Address</Label>
                <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea id="address" name="address" value={info.address} onChange={handleInfoChange} required className="pl-10" />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit">Update Information</Button>
            </DialogFooter>
        </form>
    );
};

interface AdFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (ad: Omit<Advertisement, 'id'>, file: File | null) => void;
    ad: Advertisement | null;
    coupons: Coupon[];
}

// Purchases grouped by plan ("Property Listing Fee × 17 · ₹25,442"), with the full list one tap away.
const PlanSummary = ({ plans }: { plans: { plan: string; price: number | string }[] }) => {
    const [showAll, setShowAll] = useState(false);
    const groups = useMemo(() => {
        const m = new Map<string, { count: number; total: number }>();
        plans.forEach((p) => {
            const g = m.get(p.plan) || { count: 0, total: 0 };
            g.count += 1; g.total += Number(p.price) || 0;
            m.set(p.plan, g);
        });
        return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
    }, [plans]);
    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                {groups.map(([name, g]) => (
                    <span key={name} className="inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-2.5 py-1 text-xs font-medium">
                        <span>{name}</span>
                        {g.count > 1 && <span className="text-muted-foreground">× {g.count}</span>}
                        <span className="font-semibold text-primary">₹{g.total.toLocaleString()}</span>
                    </span>
                ))}
            </div>
            {plans.length > groups.length && (
                <button type="button" onClick={() => setShowAll((v) => !v)} className="text-xs font-medium text-primary hover:underline">
                    {showAll ? 'Hide individual purchases' : `Show all ${plans.length} purchases`}
                </button>
            )}
            {showAll && (
                <div className="flex flex-wrap gap-1.5">
                    {plans.map((p, i) => (
                        <span key={i} className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{p.plan} · ₹{p.price}</span>
                    ))}
                </div>
            )}
        </div>
    );
};

const AdFormDialog = ({ isOpen, onClose, onSave, ad, coupons }: AdFormDialogProps) => {
    const { toast } = useToast();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isActive, setIsActive] = useState(false);
    const [couponCodes, setCouponCodes] = useState<string[]>([]);

    useEffect(() => {
        setCouponCodes(ad?.couponCodes || []);
        if (ad) {
            setTitle(ad.title);
            setDescription(ad.description);
            setImagePreview(ad.imageUrl);
            setImageFile(null);
            setIsActive(ad.isActive);
        } else {
            setTitle('');
            setDescription('');
            setImageFile(null);
            setImagePreview(null);
            setIsActive(false);
        }
    }, [ad, isOpen]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!imagePreview) {
            toast({ title: "Image required", description: "Please upload an image.", variant: "destructive" });
            return;
        }
        onSave({ title, description, imageUrl: imagePreview, isActive, couponCodes }, imageFile);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{ad ? 'Edit' : 'Add'} Advertisement</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="ad-title">Title</Label>
                        <Input id="ad-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                    </div>
                    <div>
                        <Label htmlFor="ad-description">Description</Label>
                        <Textarea id="ad-description" value={description} onChange={(e) => setDescription(e.target.value)} required />
                    </div>
                    <div>
                        <Label htmlFor="ad-image-upload">Image</Label>
                        <div
                            className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md cursor-pointer hover:border-primary"
                            onClick={() => document.getElementById('ad-image-upload')?.click()}
                        >
                            <div className="space-y-1 text-center">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="mx-auto h-24 object-contain rounded-md" />
                                ) : (
                                    <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                                )}
                                <div className="flex text-sm text-muted-foreground justify-center">
                                    <p className="pl-1">{imageFile ? 'Click to change' : 'Click to upload'}</p>
                                </div>
                                <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
                            </div>
                        </div>
                        <Input
                            id="ad-image-upload"
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageChange}
                        />
                    </div>
                    <div>
                        <Label>Coupons to show (visitors can copy them)</Label>
                        {coupons.length === 0 ? (
                            <p className="mt-1 text-sm text-muted-foreground">No coupons yet. Create one under Management.</p>
                        ) : (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {coupons.map((c) => {
                                    const on = couponCodes.includes(c.code);
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => setCouponCodes(on ? couponCodes.filter((x) => x !== c.code) : [...couponCodes, c.code])}
                                            className={cn("rounded-full border px-3 py-1 font-mono text-xs transition-colors",
                                                on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                                                !c.isActive && "opacity-60")}
                                            title={c.isActive ? `${c.discountPercentage}% off` : "This coupon is turned off, so it won't show"}
                                        >
                                            {c.code} · {c.discountPercentage}%{!c.isActive && " (off)"}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch id="ad-is-active" checked={isActive} onCheckedChange={setIsActive} />
                        <Label htmlFor="ad-is-active">Set as active Pop-up</Label>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Save</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

interface CouponFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (coupon: Omit<Coupon, 'id'>) => void;
    coupon: Coupon | null;
    defaultScope?: 'plans' | 'listings';
}

const CouponFormDialog = ({ isOpen, onClose, onSave, coupon, defaultScope = 'plans' }: CouponFormDialogProps) => {
    const [code, setCode] = useState('');
    const [discountPercentage, setDiscountPercentage] = useState(0);
    const [isActive, setIsActive] = useState(true);
    const [scope, setScope] = useState<'plans' | 'listings'>('plans');

    useEffect(() => {
        if (coupon) {
            setCode(coupon.code);
            setDiscountPercentage(coupon.discountPercentage);
            setIsActive(coupon.isActive);
            setScope(coupon.scope || 'plans');
        } else {
            setCode('');
            setDiscountPercentage(0);
            setIsActive(true);
            setScope(defaultScope);
        }
    }, [coupon, isOpen, defaultScope]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ code: code.toUpperCase(), discountPercentage, isActive, scope });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{coupon ? 'Edit' : 'Add'} Coupon</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="coupon-code">Coupon Code</Label>
                        <Input id="coupon-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
                    </div>
                    <div>
                        <Label htmlFor="coupon-discount">Discount Percentage (%)</Label>
                        <Input id="coupon-discount" type="number" min={1} max={90} value={discountPercentage} onChange={(e) => setDiscountPercentage(parseInt(e.target.value, 10))} required />
                    </div>
                    <div>
                        <Label>Use for</Label>
                        <Select value={scope} onValueChange={(v) => setScope(v as 'plans' | 'listings')}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="plans">Unlock plans only</SelectItem>
                                <SelectItem value="listings">Listing fees only (PG, rental, roommate)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch id="coupon-is-active" checked={isActive} onCheckedChange={setIsActive} />
                        <Label htmlFor="coupon-is-active">Active</Label>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Save Coupon</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

interface StaffFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (staff: Omit<StaffMember, 'id'>) => void;
    staffMember: StaffMember | null;
}

const StaffFormDialog = ({ isOpen, onClose, onSave, staffMember }: StaffFormDialogProps) => {
    const [name, setName] = useState('');
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (staffMember) {
            setName(staffMember.name);
            setUserId(staffMember.userId);
            setPassword(staffMember.password || '');
        } else {
            setName('');
            setUserId('');
            setPassword('');
        }
        setShowPassword(false);
    }, [staffMember, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, userId, password });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{staffMember ? 'Edit' : 'Add'} Staff Member</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="staff-name">Name</Label>
                        <Input id="staff-name" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div>
                        <Label htmlFor="staff-userid">User ID</Label>
                        <Input id="staff-userid" value={userId} onChange={(e) => setUserId(e.target.value)} required />
                    </div>
                    <div>
                        <Label htmlFor="staff-password">{staffMember ? 'Reset Password' : 'Password'}</Label>
                        <Input
                            id="staff-password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Enter new password"
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="show-staff-password" onCheckedChange={() => setShowPassword(!showPassword)} />
                        <Label htmlFor="show-staff-password">Show Password</Label>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit">{staffMember ? 'Update Staff' : 'Add Staff'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const StaffActivityDialog = ({ isOpen, onClose, details }: { isOpen: boolean; onClose: () => void; details: { staffName: string; activityType: string; listings: AnyListing[] } | null }) => {
    if (!details) return null;

    const { staffName, activityType, listings } = details;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{staffName}'s {activityType} Listings</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    {listings.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {listings.map(listing => (
                                    <TableRow key={listing.id}>
                                        <TableCell className="font-medium">{'title' in listing ? listing.title : listing.ownerName}</TableCell>
                                        <TableCell>{listing.propertyType || 'Roommate'}</TableCell>
                                        <TableCell>{listing.verificationTimestamp ? format(new Date(listing.verificationTimestamp), 'dd MMM yyyy') : 'N/A'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">No {activityType.toLowerCase()} listings found for {staffName}.</p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

interface VendorDetails {
    vendorNumber: string;
    properties: { propertyId: string; propertyTitle: string; }[];
}

const VendorDetailsDialog = ({ isOpen, onClose, details }: { isOpen: boolean; onClose: () => void; details: VendorDetails | null; }) => {
    if (!details) return null;

    const { vendorNumber, properties } = details;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Properties for Vendor: {vendorNumber}</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    {properties.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Property ID</TableHead>
                                    <TableHead>Property Title</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {properties.map(prop => (
                                    <TableRow key={prop.propertyId}>
                                        <TableCell>{prop.propertyId}</TableCell>
                                        <TableCell className="font-medium">{prop.propertyTitle}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">No properties assigned to this vendor number.</p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const CreateVendorDialog = ({ isOpen, onClose, onCreate }: { isOpen: boolean; onClose: () => void; onCreate: (vendorNumber: string) => void; }) => {
    const { toast } = useToast();
    const [vendorNumber, setVendorNumber] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!vendorNumber.trim()) {
            toast({ title: 'Error', description: 'Vendor number cannot be empty.', variant: 'destructive' });
            return;
        }
        onCreate(vendorNumber);
        setVendorNumber('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Custom Vendor Number</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="vendor-number">Vendor Number</Label>
                        <Input
                            id="vendor-number"
                            value={vendorNumber}
                            onChange={(e) => setVendorNumber(e.target.value)}
                            placeholder="e.g., Shreyansh2310"
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Create Vendor</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

interface AnalyticsData {
    totalPageViews: number;
    totalUnlocks: number;
    lastUpdated: string;
}

function AdminDashboard() {
    const navigate = useNavigate();
    const { toast } = useToast();

    // Auth and loading state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
    const [isPinModalOpen, setPinModalOpen] = useState(false);
    const [isSecurityQuestionModalOpen, setSecurityQuestionModalOpen] = useState(false);

    // Dynamic admin credentials state
    const [adminPassword, setAdminPassword] = useState('');
    const [adminOtp, setAdminOtp] = useState('');
    const [adminQuestion, setAdminQuestion] = useState('');
    const [adminAnswer, setAdminAnswer] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPhone, setAdminPhone] = useState('');
    const [adminAddress, setAdminAddress] = useState('');

    // State management
    const [properties, setProperties] = useState<Listing[]>([]);
    const [roommates, setRoommates] = useState<RoommateProfile[]>([]);
    const [pricing, setPricing] = useState<PricingData | null>(null);
    const [swipeLimit, setSwipeLimit] = useState<number>(25);
    const [slotCooldownHours, setSlotCooldownHours] = useState<number>(24);
    const [swipeResetHours, setSwipeResetHours] = useState<number>(24);
    useEffect(() => {
        const s = loadSettings();
        setSwipeLimit(s.swipeLimit);
        setSlotCooldownHours(s.slotCooldownHours || 24);
        setSwipeResetHours(s.swipeResetHours || 24);
    }, []);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [availabilityInquiries, setAvailabilityInquiries] = useState<Inquiry[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [ratings, setRatings] = useState<Rating[]>([]);
    const [explicitVendors, setExplicitVendors] = useState<string[]>([]);
    const [allPurchases, setAllPurchases] = useState<any[]>([]); // 👈 Added Purchase State

    const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<AnyListing | null>(null);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

    const [isAdFormModalOpen, setAdFormModalOpen] = useState(false);
    const [editingAd, setEditingAd] = useState<Advertisement | null>(null);

    const [isCouponFormModalOpen, setCouponFormModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

    const [isStaffFormModalOpen, setStaffFormModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

    const [isStaffActivityModalOpen, setStaffActivityModalOpen] = useState(false);
    const [staffActivityDetails, setStaffActivityDetails] = useState<{ staffName: string; activityType: string; listings: AnyListing[] } | null>(null);

    const [isVendorDetailsModalOpen, setVendorDetailsModalOpen] = useState(false);
    const [vendorDetails, setVendorDetails] = useState<VendorDetails | null>(null);

    const [isCreateVendorModalOpen, setCreateVendorModalOpen] = useState(false);

    const [activeSettingsDialog, setActiveSettingsDialog] = useState<null | 'password' | 'pin' | 'security' | 'contact'>(null);

    const [propertySearchTerm, setPropertySearchTerm] = useState('');
    const [vendorSearchTerm, setVendorSearchTerm] = useState('');
    const [propertyTypeFilter, setPropertyTypeFilter] = useState('all');

    const [chartView, setChartView] = useState('monthly');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // Chart logic
    const chartData = useMemo(() => {
        const allItems = [...properties, ...roommates];

        if (chartView === 'hourly' && selectedDate) {
            const data = Array.from({ length: 24 }, (_, i) => ({ name: `${i.toString().padStart(2, '0')}:00`, listings: 0 }));
            allItems.forEach(item => {
                if (!item.submittedAt) return;
                const d = new Date(item.submittedAt);
                if (d.toDateString() === selectedDate.toDateString()) {
                    data[d.getHours()].listings += 1;
                }
            });
            return data;
        }

        if (chartView === 'daily' && selectedDate) {
            const start = startOfWeek(selectedDate);
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const data = days.map((day, i) => ({ name: `${day} (${format(addDays(start, i), 'd')})`, listings: 0 }));
            allItems.forEach(item => {
                if (!item.submittedAt) return;
                const d = new Date(item.submittedAt);
                if (getWeek(d) === getWeek(selectedDate) && d.getFullYear() === selectedDate.getFullYear()) {
                    data[d.getDay()].listings += 1;
                }
            });
            return data;
        }

        if (chartView === 'monthly') {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const data = months.map(m => ({ name: m, listings: 0 }));
            allItems.forEach(item => {
                if (!item.submittedAt) return;
                const d = new Date(item.submittedAt);
                if (d.getFullYear() === selectedYear) {
                    data[d.getMonth()].listings += 1;
                }
            });
            return data;
        }

        if (chartView === 'yearly') {
            const yearsMap: { [key: string]: number } = { [new Date().getFullYear().toString()]: 0 };
            allItems.forEach(item => {
                if (!item.submittedAt) return;
                const y = new Date(item.submittedAt).getFullYear().toString();
                yearsMap[y] = (yearsMap[y] || 0) + 1;
            });
            return Object.keys(yearsMap).sort().map(y => ({ name: y, listings: yearsMap[y] }));
        }

        return [];
    }, [chartView, selectedYear, selectedDate, properties, roommates]);

    const years = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];

    useEffect(() => {
        let isMounted = true;
        const checkAuth = async () => {
            // Only check while we're actually on the admin panel (not while leaving it for the main site)
            if (!window.location.pathname.startsWith('/admin')) return;
            const authStatus = localStorage.getItem('admin_authenticated');
            const token = localStorage.getItem('panel_access_token');
            if (authStatus !== 'true' || !token) {
                localStorage.removeItem('admin_authenticated');
                navigate({ to: '/admin/login', replace: true });
                return;
            }
            try {
                await api.get('/auth/verify-admin/', { authSlot: 'panel' } as any);
                if (isMounted) {
                    setIsAuthenticated(true);
                    setIsLoading(false);
                }
            } catch (err) {
                if (!isMounted || !window.location.pathname.startsWith('/admin')) return;
                console.error("Admin verification failed:", err);
                localStorage.removeItem('admin_authenticated');
                localStorage.removeItem('panel_access_token');
                navigate({ to: '/admin/login', replace: true });
            }
        };
        checkAuth();
        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            setAdminPassword(getFromLocalStorage('admin_password', DEFAULT_ADMIN_PASSWORD));
            setAdminOtp(getFromLocalStorage('admin_otp', DEFAULT_ADMIN_OTP));
            setAdminQuestion(getFromLocalStorage('admin_question', DEFAULT_ADMIN_QUESTION));
            setAdminAnswer(getFromLocalStorage('admin_answer', DEFAULT_ADMIN_ANSWER));
            setAdminEmail(DEFAULT_ADMIN_EMAIL);
            setAdminPhone(DEFAULT_ADMIN_PHONE);
            setAdminAddress(DEFAULT_ADMIN_ADDRESS);
            api.get('/site-contact/').then(({ data }) => {
                if (data?.email) setAdminEmail(data.email);
                if (data?.phone) setAdminPhone(data.phone);
                if (data?.address) setAdminAddress(data.address);
            }).catch(() => {});

            setSelectedDate(new Date());

            const fetchAdminData = async () => {
                try {
                    const allData = await getAdminProperties();

                    const realProperties = allData.filter(p => (p.propertyType as string) !== 'Roommate');
                    const rawRoommates = allData.filter(p => (p.propertyType as string) === 'Roommate');

                    const realRoommates: RoommateProfile[] = rawRoommates.map(listingToRoommateProfile);

                    setProperties(realProperties);
                    setRoommates(realRoommates);

                    const dbCoupons = await getCoupons();
                    setCoupons(dbCoupons);

                    const dbAds = await getAdvertisements();
                    setAdvertisements(dbAds);

                    const dbStaff = await getStaff();
                    setStaff(dbStaff);

                    // 👈 Fetch Purchases
                    const dbPurchases = await getAllPurchasesAdmin();
                    setAllPurchases(dbPurchases);

                } catch (error: any) {
                    console.error("Failed to load admin data", error);

                    if (error.response?.status === 403) {
                        toast({
                            title: 'Permission Denied',
                            description: 'Your account lacks Django Admin (is_staff) privileges.',
                            variant: 'destructive'
                        });
                    } else if (error.response?.status === 401) {
                        toast({
                            title: 'Session Expired',
                            description: 'Please log in again.',
                            variant: 'destructive'
                        });
                        handleLogout();
                    } else {
                        toast({
                            title: 'Error',
                            description: 'Could not connect to database.',
                            variant: 'destructive'
                        });
                    }
                }
            };

            fetchAdminData();

            // Vendor numbers live on the server; move any that were saved only in this browser up once.
            (async () => {
                const local: string[] = getFromLocalStorage('explicitVendors', []) || [];
                try {
                    let { data } = await api.get('/vendor-numbers/');
                    let numbers: string[] = data?.numbers || [];
                    for (const v of local) {
                        if (!numbers.includes(v)) {
                            try { ({ data } = await api.post('/vendor-numbers/', { vendor_number: v })); numbers = data?.numbers || numbers; } catch { /* already used on a listing */ }
                        }
                    }
                    if (local.length) localStorage.removeItem('explicitVendors');
                    setExplicitVendors(numbers);
                } catch {
                    setExplicitVendors(local);
                }
            })();
            api.get('/pricing/').then((res: any) => {
                if (res.data && res.data.listings) {
                    setPricing(res.data);
                    saveToLocalStorage('pricing', res.data);
                    const st = res.data.settings;
                    if (st) {
                        setSwipeLimit(Number(st.swipe_limit) || 25);
                        setSlotCooldownHours(Number(st.slot_cooldown_hours) || 24);
                        setSwipeResetHours(Number(st.swipe_reset_hours) || 24);
                    }
                } else {
                    setPricing(getFromLocalStorage('pricing', defaultPricing));
                }
            }).catch(() => {
                setPricing(getFromLocalStorage('pricing', defaultPricing));
            });
        }
    }, [isAuthenticated]);

    // 👈 Group purchases by User for the Financials View
    const groupedPurchases = useMemo(() => {
        const groups: { [key: string]: { name: string, email: string, plans: any[], totalSpend: number } } = {};

        allPurchases.forEach(purchase => {
            const userEmail = (purchase.user_email || '').trim();
            const userName = (purchase.user_name || '').trim();
            const groupKey = userEmail ? userEmail.toLowerCase() : (userName ? userName.toLowerCase() : `purchase_${purchase.id || Math.random()}`);

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    name: userName || 'Customer',
                    email: userEmail || 'Not Provided',
                    plans: [],
                    totalSpend: 0
                };
            }
            const price = parseFloat(purchase.amount) || 0;
            groups[groupKey].plans.push({
                plan: purchase.plan_name || 'Plan',
                price: price,
                date: purchase.created_at
            });
            groups[groupKey].totalSpend += price;
        });

        return Object.values(groups).sort((a, b) => b.totalSpend - a.totalSpend); // Sort by highest spend
    }, [allPurchases]);

    const staffStats = useMemo(() => {
        const allListings = [...properties, ...roommates];
        return staff.map(s => {
            const verifiedListings = allListings.filter(l => l.verifiedBy === s.id && l.status !== 'pending');
            const approvedListings = verifiedListings.filter(l => l.status === 'approved');
            const rejectedListings = verifiedListings.filter(l => l.status === 'rejected');

            const processingTimes = verifiedListings
                .map(l => l.verificationTimestamp && l.submittedAt ? differenceInHours(new Date(l.verificationTimestamp), new Date(l.submittedAt)) : -1)
                .filter(t => t >= 0);

            const avgProcessingTime = processingTimes.length > 0
                ? (processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length).toFixed(1)
                : 'N/A';

            return {
                ...s,
                stats: {
                    approved: approvedListings,
                    rejected: rejectedListings,
                    avgProcessingTime
                }
            };
        });
    }, [staff, properties, roommates]);

    const averageRating = useMemo(() => {
        if (!ratings || ratings.length === 0) return 0;
        const total = ratings.reduce((sum, r) => sum + r.rating, 0);
        return (total / ratings.length);
    }, [ratings]);

    const vendorNumbers = useMemo(() => {
        const vendorData: { [key: string]: { propertyId: string; propertyTitle: string }[] } = (explicitVendors || []).reduce((acc, vendorNumber) => {
            acc[vendorNumber] = [];
            return acc;
        }, {} as { [key: string]: { propertyId: string; propertyTitle: string }[] });

        (properties || [])
            .filter(p => p.vendorNumber)
            .forEach(p => {
                if (!vendorData[p.vendorNumber!]) {
                    vendorData[p.vendorNumber!] = [];
                }
                if (p.id && p.title) {
                    vendorData[p.vendorNumber!].push({ propertyId: p.id, propertyTitle: p.title });
                }
            });

        return Object.entries(vendorData).map(([vendorNumber, properties]) => ({
            vendorNumber,
            properties
        }));
    }, [properties, explicitVendors]);

    const filteredVendorNumbers = useMemo(() => {
        if (!vendorSearchTerm) return vendorNumbers;
        return vendorNumbers.filter(v =>
            v.vendorNumber.toLowerCase().includes(vendorSearchTerm.toLowerCase())
        );
    }, [vendorNumbers, vendorSearchTerm]);

    const handleGenerateVendorNumber = () => {
        const newVendorNumber = `Admin${Math.floor(1000 + Math.random() * 9000)}`;
        navigator.clipboard.writeText(newVendorNumber);
        toast({
            title: "Vendor Number Generated",
            description: `${newVendorNumber} has been copied to your clipboard.`,
        });
    };

    const handleCreateVendor = async (vendorNumber: string) => {
        if ((explicitVendors || []).includes(vendorNumber) || vendorNumbers.some(v => v.vendorNumber === vendorNumber)) {
            toast({ title: 'Error', description: 'This vendor number already exists.', variant: 'destructive' });
            return;
        }
        try {
            const { data } = await api.post('/vendor-numbers/', { vendor_number: vendorNumber });
            setExplicitVendors(data?.numbers || [...(explicitVendors || []), vendorNumber]);
            toast({ title: 'Success', description: `Vendor "${vendorNumber}" has been created.` });
            setCreateVendorModalOpen(false);
        } catch (e: any) {
            toast({ title: 'Not saved', description: e?.response?.data?.error || 'Could not reach the server. Nothing was changed.', variant: 'destructive' });
        }
    };

    const handleLogout = () => {
        // Remove the admin's login completely (the remembered-device mark stays, if it was ticked)
        localStorage.removeItem('admin_authenticated');
        localStorage.removeItem('panel_access_token');
        localStorage.removeItem('panel_refresh_token');
        navigate({ to: '/admin/login', replace: true });
    };

    // Turn off "remember this device" for this browser only: the next sign-in here asks for the email code.
    const handleRequireCodeOnThisDevice = async () => {
        const deviceToken = localStorage.getItem('setmystay_admin_device');
        if (!deviceToken) {
            toast({ title: 'Already required', description: 'This device already asks for the email verification code at sign-in.' });
            return;
        }
        try {
            await api.post('/auth/admin/forget-this-device/', { device_token: deviceToken });
            localStorage.removeItem('setmystay_admin_device');
            toast({ title: 'Verification required', description: 'This device will ask for the email code the next time you sign in.' });
        } catch {
            toast({ title: 'Error', description: 'Could not reach the server. Nothing was changed.', variant: 'destructive' });
        }
    };

    const handleForgetDevices = async () => {
        try {
            const { data } = await api.post('/auth/admin/forget-devices/');
            localStorage.removeItem('setmystay_admin_device');
            toast({ title: 'Devices forgotten', description: `${data?.removed ?? 0} remembered device(s) will need the email code again.` });
        } catch {
            toast({ title: 'Error', description: 'Could not reach the server.', variant: 'destructive' });
        }
    };

    const pendingListings = useMemo(() => {
        if (!properties.length && !roommates.length) return [];
        return [
            ...properties.filter(p => p.status === 'pending'),
            ...roommates.filter(r => r.status === 'pending')
        ];
    }, [properties, roommates]);

    const filteredProperties = useMemo(() => {
        return properties.filter(p => {
            const matchesSearch = propertySearchTerm === '' || matchesListingCode(propertySearchTerm, p.id) || (p.title && p.title.toLowerCase().includes(propertySearchTerm.toLowerCase()));
            const matchesType = propertyTypeFilter === 'all' || p.propertyType === propertyTypeFilter;
            return matchesSearch && matchesType;
        });
    }, [properties, propertySearchTerm, propertyTypeFilter]);

    const handleViewDetails = (item: AnyListing) => {
        setCurrentItem(item);
        setCurrentMediaIndex(0);
        setDetailsModalOpen(true);
    };

    // Notifications: open the listing as it is now, with the owner's changes shown
    const editCount = useEditNotificationCount(isAuthenticated);
    const openFromNotification = async (n: EditNotification) => {
        const fresh = await getPropertyById(n.property_id);
        if (!fresh) {
            toast({ title: 'Listing not found', description: 'It may have been deleted.' });
            return;
        }
        const item: any = String(fresh.propertyType).toLowerCase() === 'roommate' ? listingToRoommateProfile(fresh) : fresh;
        if (!item.pendingEdits || !item.pendingEdits.length) item.pendingEdits = n.changes;
        if (!item.editedAt) item.editedAt = n.created_at;
        handleViewDetails(item as AnyListing);
    };

    const handleUpdateStatus = async (id: string, type: 'PG' | 'Rental' | 'Roommate', status: 'approved' | 'rejected') => {
        try {
            const backendStatus = status === 'approved' ? 'APPROVED' : 'REJECTED';
            await updatePropertyStatus(id, backendStatus);

            const updateState = (items: any[]) => items.map(item =>
                String(item.id) === String(id) ? { ...item, status: status } : item
            );

            if (type === 'Roommate') {
                setRoommates(prev => updateState(prev));
            } else {
                setProperties(prev => updateState(prev));
            }

            setDetailsModalOpen(false);
            toast({ title: "Success", description: `Property has been ${status}.` });
        } catch (error) {
            toast({ title: "Error", description: "Failed to update status on server.", variant: "destructive" });
        }
    };

    const handleDeleteItem = async (id: string, type: 'PG' | 'Rental' | 'Roommate') => {
        try {
            await deleteProperty(id);

            if (type === 'Roommate') {
                setRoommates(prev => prev.filter(r => String(r.id) !== String(id)));
            } else {
                setProperties(prev => prev.filter(p => String(p.id) !== String(id)));
            }

            setDetailsModalOpen(false);
            toast({ title: "Deleted", description: "Property removed from database.", variant: 'destructive' });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete from server.", variant: "destructive" });
        }
    };

    const handlePriceChange = (category: 'unlocks' | 'listings', plan: string, value: number) => {
        if (!pricing) return;
        setPricing(prev => {
            if (!prev) return null;
            const newPricing = { ...prev };
            (newPricing[category] as any)[plan] = value;
            return newPricing;
        });
    };

    const handleSavePricing = async () => {
        if (!swipeLimit || swipeLimit < 1) { toast({ title: "Invalid swipe limit", description: "Enter 1 or more.", variant: "destructive" }); return; }
        if (!slotCooldownHours || slotCooldownHours < 1) { toast({ title: "Invalid slot timeout", description: "Enter 1 hour or more.", variant: "destructive" }); return; }
        if (!swipeResetHours || swipeResetHours < 1) { toast({ title: "Invalid swipe reset time", description: "Enter 1 hour or more.", variant: "destructive" }); return; }
        const payload = {
            ...pricing,
            settings: { swipe_limit: swipeLimit, slot_cooldown_hours: slotCooldownHours, swipe_reset_hours: swipeResetHours },
        };
        try {
            const { data } = await api.post('/pricing/', payload);
            saveToLocalStorage('pricing', data || payload);
            saveSettings({ swipeLimit, slotCooldownHours, swipeResetHours });
            toast({ title: "Pricing Updated", description: "Prices and swipe/slot settings are saved for all users." });
        } catch (e: any) {
            toast({ title: "Not saved", description: e?.response?.data?.error || "Could not reach the server. Nothing was changed.", variant: "destructive" });
        }
    };
    const handleUpdatePassword = (newPass: string) => {
        saveToLocalStorage('admin_password', newPass);
        setAdminPassword(newPass);
    };
    const handleUpdatePin = (newPin: string) => {
        saveToLocalStorage('admin_otp', newPin);
        setAdminOtp(newPin);
    };
    const handleUpdateSecurityQuestion = (newQuestion: string, newAnswer: string) => {
        saveToLocalStorage('admin_question', newQuestion);
        saveToLocalStorage('admin_answer', newAnswer);
        setAdminQuestion(newQuestion);
        setAdminAnswer(newAnswer);
    };
    const handleOpenAdForm = (ad: Advertisement | null) => {
        setEditingAd(ad);
        setAdFormModalOpen(true);
    };

    const handleSaveAd = async (adData: Omit<Advertisement, 'id'>, file: File | null) => {
        try {
            const formData = new FormData();
            formData.append('title', adData.title);
            formData.append('description', adData.description);
            formData.append('is_active', adData.isActive ? 'true' : 'false');
            formData.append('coupon_codes', (adData.couponCodes || []).join(','));
            if (file) formData.append('image', file);

            if (editingAd) {
                await updateAdvertisement(editingAd.id, formData);
                toast({ title: "Advertisement Updated" });
            } else {
                await createAdvertisement(formData);
                toast({ title: "Advertisement Added" });
            }

            setAdvertisements(await getAdvertisements());
            setAdFormModalOpen(false);
            setEditingAd(null);
        } catch (error) {
            toast({ title: "Error saving Ad", variant: "destructive" });
        }
    };
    const handleDeleteAd = async (adId: string) => {
        try {
            await deleteAdvertisement(adId);
            setAdvertisements(prev => prev.filter(a => a.id !== adId));
            toast({ title: "Advertisement Deleted", variant: 'destructive' });
        } catch (error) {
            toast({ title: "Error deleting Ad", variant: "destructive" });
        }
    };

    const [newCouponScope, setNewCouponScope] = useState<'plans' | 'listings'>('plans');
    const handleOpenCouponForm = (coupon: Coupon | null, scope: 'plans' | 'listings' = 'plans') => {
        setEditingCoupon(coupon);
        setNewCouponScope(coupon?.scope || scope);
        setCouponFormModalOpen(true);
    };

    const handleSaveCoupon = async (couponData: Omit<Coupon, 'id'>) => {
        try {
            if (editingCoupon) {
                await updateCoupon(editingCoupon.id, couponData);
                toast({ title: "Coupon Updated" });
            } else {
                await createCoupon(couponData);
                toast({ title: "Coupon Added" });
            }
            setCoupons(await getCoupons());
            setCouponFormModalOpen(false);
            setEditingCoupon(null);
        } catch (error) {
            toast({ title: "Error saving Coupon. Code might already exist.", variant: "destructive" });
        }
    };

    const handleDeleteCoupon = async (couponId: string) => {
        try {
            await deleteCoupon(couponId);
            setCoupons(prev => prev.filter(c => c.id !== couponId));
            toast({ title: "Coupon Deleted", variant: 'destructive' });
        } catch (error) {
            toast({ title: "Error deleting Coupon", variant: "destructive" });
        }
    };
    const handleOpenStaffForm = (staffMember: StaffMember | null) => {
        setEditingStaff(staffMember);
        setStaffFormModalOpen(true);
    };

    const handleSaveStaff = async (staffData: Omit<StaffMember, 'id'>) => {
        try {
            if (editingStaff) {
                await updateStaff(editingStaff.id, staffData);
                toast({ title: "Staff Updated" });
            } else {
                await createStaff(staffData);
                toast({ title: "Staff Added" });
            }
            setStaff(await getStaff());
            setStaffFormModalOpen(false);
            setEditingStaff(null);
        } catch (error) {
            toast({ title: "Error", description: "Could not save staff. Username might be taken.", variant: "destructive" });
        }
    };

    const handleDeleteStaff = async (staffId: string) => {
        try {
            await deleteStaff(staffId);
            setStaff(prev => prev.filter(s => s.id !== staffId));
            toast({ title: "Staff Deleted", variant: "destructive" });
        } catch (error) {
            toast({ title: "Error", description: "Could not delete staff.", variant: "destructive" });
        }
    };

    const handleViewStaffActivity = (staffName: string, activityType: string, listings: AnyListing[]) => {
        setStaffActivityDetails({ staffName, activityType, listings });
        setStaffActivityModalOpen(true);
    };

    const handleViewVendorDetails = (vendorData: VendorDetails) => {
        setVendorDetails(vendorData);
        setVendorDetailsModalOpen(true);
    };

    const handleSaveContactInfo = async (info: { email: string, phone: string, address: string }) => {
        try {
            // Saved on the server so the footer shows it to every visitor
            const { data } = await api.post('/site-contact/', info);
            setAdminEmail(data.email);
            setAdminPhone(data.phone);
            setAdminAddress(data.address);
            toast({ title: 'Contact info saved', description: 'The website footer now shows the new details.' });
        } catch (e: any) {
            toast({ title: 'Not saved', description: e?.response?.data?.error || 'Could not reach the server.', variant: 'destructive' });
        }
    };

    const StatusBadge = ({ status }: { status?: 'pending' | 'approved' | 'rejected' | boolean }) => {
        const isBoolean = typeof status === 'boolean';
        const currentStatus = isBoolean ? (status ? 'active' : 'inactive') : status;
        if (!currentStatus) return null;

        const baseClasses = "px-3 py-1 rounded-full text-xs font-semibold capitalize";
        const statusClasses: { [key: string]: string } = {
            pending: "bg-yellow-200 text-yellow-800",
            approved: "bg-green-200 text-green-800",
            rejected: "bg-red-200 text-red-800",
            active: "bg-blue-200 text-blue-800",
            inactive: "bg-slate-200 text-slate-800",
        };
        return <span className={`${baseClasses} ${statusClasses[currentStatus]}`}>{currentStatus}</span>;
    };

    if (isLoading || !isAuthenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100">
                <LoadingSpinner className="w-12 h-12 text-primary" />
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-screen">
            <header className="bg-white shadow-sm">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4 sm:py-2">
                    <h1 className="text-2xl font-bold text-slate-800">SetMyStay Admin</h1>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button asChild>
                            <a href="/">
                                <Home className="w-4 h-4 mr-2" />
                                Go to Main Site
                            </a>
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <Settings className="w-4 h-4 mr-2" />
                                    Security Settings
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>Admin Account Security</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setPasswordModalOpen(true)}>Change Password</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleRequireCodeOnThisDevice}>Require verification code on this device</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleForgetDevices}>Forget all remembered devices</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="outline" onClick={handleLogout}>
                            <LogOut className="w-4 h-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Tabs defaultValue="dashboard">
                    <div className="overflow-x-auto">
                        <TabsList className="mb-8 whitespace-nowrap">
                            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                            <TabsTrigger value="listings">Listings</TabsTrigger>
                            <TabsTrigger value="notifications">Notifications{editCount > 0 && <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">{editCount}</span>}</TabsTrigger>
                            <TabsTrigger value="management">Management</TabsTrigger>
                            <TabsTrigger value="staff">Staff</TabsTrigger>
                            {/* 👇 New Purchases Tab 👇 */}
                            <TabsTrigger value="vendors">Vendors</TabsTrigger>
                            <TabsTrigger value="purchases">Purchases</TabsTrigger>
                            <TabsTrigger value="users">Users</TabsTrigger>
                            <TabsTrigger value="appearance">Appearance</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="dashboard">
                        <Card className="mb-8">
                            <CardHeader>
                                <CardTitle className="text-2xl">Platform Overview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between">
                                        <div><p className="text-sm font-medium text-blue-700">Total Properties</p><p className="text-2xl font-bold text-blue-900">{properties.length}</p></div>
                                        <Building className="text-3xl text-blue-400 w-8 h-8" />
                                    </div>
                                    <div className="bg-purple-50 p-4 rounded-lg flex items-center justify-between">
                                        <div><p className="text-sm font-medium text-purple-700">Total Roommates</p><p className="text-2xl font-bold text-purple-900">{roommates.length}</p></div>
                                        <Users className="text-3xl text-purple-400 w-8 h-8" />
                                    </div>
                                    <div className="bg-yellow-50 p-4 rounded-lg flex items-center justify-between">
                                        <div><p className="text-sm font-medium text-yellow-700">Pending Approvals</p><p className="text-2xl font-bold text-yellow-900">{pendingListings.length}</p></div>
                                        <Clock className="text-3xl text-yellow-400 w-8 h-8" />
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-lg flex items-center justify-between">
                                        <div><p className="text-sm font-medium text-green-700">Live Listings</p><p className="text-2xl font-bold text-green-900">{properties.filter(p => p.status === 'approved').length + roommates.filter(r => r.status === 'approved').length}</p></div>
                                        <CheckCircle className="text-3xl text-green-400 w-8 h-8" />
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <Tabs value={chartView} onValueChange={setChartView} className="w-full">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                                            <h3 className="text-xl font-semibold text-slate-800">New Listings Over Time</h3>
                                            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                                                {(chartView === 'daily' || chartView === 'hourly') && (
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant={"outline"}
                                                                className={cn("w-full sm:w-[240px] justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                                                            >
                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0 z-50" align="start">
                                                            <Calendar mode="single" selected={selectedDate ?? undefined} onSelect={(d) => setSelectedDate(d ?? null)} initialFocus />
                                                        </PopoverContent>
                                                    </Popover>
                                                )}
                                                {(chartView === 'monthly' || chartView === 'weekly') && (
                                                    <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                                                        <SelectTrigger className="w-full sm:w-[120px]">
                                                            <SelectValue placeholder="Select year" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {years.map(year => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                                <div className="overflow-x-auto">
                                                    <TabsList className="whitespace-nowrap">
                                                        <TabsTrigger value="hourly">Hourly</TabsTrigger>
                                                        <TabsTrigger value="daily">Daily</TabsTrigger>
                                                        <TabsTrigger value="monthly">Monthly</TabsTrigger>
                                                        <TabsTrigger value="yearly">Yearly</TabsTrigger>
                                                    </TabsList>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="h-80">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={chartData}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="name" />
                                                    <YAxis allowDecimals={false} />
                                                    <Tooltip formatter={(value) => [value, 'New Listings']} />
                                                    <Bar dataKey="listings" fill="#4582EF" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Tabs>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="notifications">
                        <NotificationsPanel onOpen={openFromNotification} />
                    </TabsContent>
                    <TabsContent value="listings">
                        <div className="mb-8">
                            <ListingIdLookup items={[...properties, ...roommates] as AnyListing[]} onOpen={handleViewDetails} />
                        </div>
                        <Card className="mb-8">
                            <CardHeader><CardTitle className="text-2xl">Pending Listings</CardTitle></CardHeader>
                            <CardContent>
                                {pendingListings.length > 0 ? (
                                    pendingListings.map(item => (
                                        <div key={item.id} className="border-l-4 border-yellow-400 bg-slate-50 p-4 rounded-md mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                            <div className="w-full">
                                                <p className="font-semibold">{'title' in item ? item.title : item.ownerName} <span className="text-xs font-medium text-slate-500">({item.propertyType})</span></p>
                                                <p className="text-sm text-slate-600">{item.locality}</p>
                                            </div>
                                            <Button onClick={() => handleViewDetails(item)} className="w-full sm:w-auto">View Details</Button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-slate-500">No pending listings.</p>
                                )}
                            </CardContent>
                        </Card>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            <Card>
                                <CardHeader>
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div>
                                            <CardTitle className="text-2xl">All Properties</CardTitle>
                                            <CardDescription>Filter all properties by type. To find one listing, use Find by listing ID above.</CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2 w-full sm:w-auto sm:justify-end">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="icon">
                                                        <Filter className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onSelect={() => setPropertyTypeFilter('all')}>All</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => setPropertyTypeFilter('PG')}>PG</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => setPropertyTypeFilter('Rental')}>Rental</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>ID</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Vendor #</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredProperties.map(p => (
                                                <TableRow key={p.id}>
                                                    <TableCell className="font-mono text-xs whitespace-nowrap">{listingCode(p.id)}</TableCell>
                                                    <TableCell className="font-medium">{p.title}</TableCell>
                                                    <TableCell>{p.propertyType}</TableCell>
                                                    <TableCell>{p.vendorNumber || 'N/A'}</TableCell>
                                                    <TableCell><StatusBadge status={p.status} /></TableCell>
                                                    <TableCell><Button variant="outline" size="sm" onClick={() => handleViewDetails(p)}>View</Button></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle className="text-2xl">All Roommates</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Budget</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {roommates.map(r => (
                                                <TableRow key={r.id}>
                                                    <TableCell className="font-mono text-xs whitespace-nowrap">{listingCode(r.id)}</TableCell>
                                                    <TableCell className="font-medium">{r.ownerName}</TableCell>
                                                    <TableCell>₹{r.rent.toLocaleString()}</TableCell>
                                                    <TableCell><StatusBadge status={r.status} /></TableCell>
                                                    <TableCell><Button variant="outline" size="sm" onClick={() => handleViewDetails(r)}>View</Button></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="management">
                        <div className="mb-8"><HeroAdsManager /></div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-8">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-2xl">Pricing Management</CardTitle>
                                        <CardDescription>Update the pricing for unlocks and listings. Changes will reflect on the main site immediately.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {pricing && (
                                            <div className="space-y-6">
                                                <div>
                                                    <h4 className="font-semibold mb-4 text-lg">Unlock Plans</h4>
                                                    <div className="space-y-4">
                                                        {Object.entries(pricing.unlocks).map(([plan, price]) => (
                                                            <div key={plan} className="flex items-center gap-4">
                                                                <Label htmlFor={`price-unlock-${plan}`} className="w-28 capitalize">{plan} Unlock{plan !== '1' && plan !== 'unlimited' ? 's' : ''}</Label>
                                                                <Input id={`price-unlock-${plan}`} type="number" value={price} onChange={(e) => handlePriceChange('unlocks', plan, parseInt(e.target.value))} className="max-w-xs" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold mb-4 text-lg">Listing Plans</h4>
                                                    <div className="space-y-4">
                                                        {Object.entries(pricing.listings).map(([plan, price]) => (
                                                            <div key={plan} className="flex items-center gap-4">
                                                                <Label htmlFor={`price-listing-${plan}`} className="w-28 capitalize">{plan} Listing</Label>
                                                                <Input id={`price-listing-${plan}`} type="number" value={price} onChange={(e) => handlePriceChange('listings', plan, parseInt(e.target.value))} className="max-w-xs" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold mb-4 text-lg">Roommate Swipes</h4>
                                                    <div className="flex items-center gap-4">
                                                        <Label htmlFor="swipe-limit" className="w-28">Swipes per account</Label>
                                                        <Input id="swipe-limit" type="number" min={1} value={swipeLimit} onChange={(e) => setSwipeLimit(parseInt(e.target.value))} className="max-w-xs" />
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-3">
                                                        <Label htmlFor="slot-cooldown" className="w-28">Slot Timeout (Hours)</Label>
                                                        <Input id="slot-cooldown" type="number" min={1} value={slotCooldownHours} onChange={(e) => setSlotCooldownHours(parseInt(e.target.value) || 24)} className="max-w-xs" />
                                                    </div>
                                                    <p className="mt-3 text-sm text-muted-foreground">Swipes reset to this number for every user at 12:00 AM (India time) every day.</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="mt-6 flex justify-end">
                                            <Button onClick={handleSavePricing}>Save Prices</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div>
                                            <CardTitle className="text-2xl">Contact Information</CardTitle>
                                            <CardDescription>This info is displayed in the website footer.</CardDescription>
                                        </div>
                                        <Button onClick={() => setActiveSettingsDialog('contact')}>
                                            <Edit className="mr-2 h-4 w-4" /> Edit
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 text-sm">
                                            <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /> {adminEmail}</p>
                                            <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /> {adminPhone}</p>
                                            <p className="flex items-start gap-2"><MapPin className="w-4 h-4 text-muted-foreground mt-1" /> {adminAddress}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="space-y-8">
                                <Card>
                                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div>
                                            <CardTitle className="text-2xl">Plan Coupons</CardTitle>
                                            <CardDescription>Discounts for unlock plans (Single, Value, Pro, Ultimate). They cannot be used for listing fees.</CardDescription>
                                        </div>
                                        <Button onClick={() => handleOpenCouponForm(null, 'plans')} className="w-full sm:w-auto">
                                            <PlusCircle className="mr-2 h-4 w-4" /> Add
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        {coupons.filter(c => (c.scope || 'plans') === 'plans').length === 0 ? (
                                            <p className="py-4 text-center text-sm text-muted-foreground">No coupons yet.</p>
                                        ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Code</TableHead><TableHead>Discount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {coupons.filter(c => (c.scope || 'plans') === 'plans').map(coupon => (
                                                    <TableRow key={coupon.id}>
                                                        <TableCell className="font-medium">{coupon.code}</TableCell>
                                                        <TableCell>{coupon.discountPercentage}%</TableCell>
                                                        <TableCell><StatusBadge status={coupon.isActive} /></TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="icon" onClick={() => handleOpenCouponForm(coupon)}><Edit className="h-4 w-4" /></Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Coupon?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the coupon.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteCoupon(coupon.id)}>Confirm</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                                            </AlertDialog>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        )}
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div>
                                            <CardTitle className="text-2xl">Listing Coupons</CardTitle>
                                            <CardDescription>Discounts for listing fees (PG, rental, roommate). They cannot be used for unlock plans.</CardDescription>
                                        </div>
                                        <Button onClick={() => handleOpenCouponForm(null, 'listings')} className="w-full sm:w-auto">
                                            <PlusCircle className="mr-2 h-4 w-4" /> Add
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        {coupons.filter(c => (c.scope || 'plans') === 'listings').length === 0 ? (
                                            <p className="py-4 text-center text-sm text-muted-foreground">No coupons yet.</p>
                                        ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Code</TableHead><TableHead>Discount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {coupons.filter(c => (c.scope || 'plans') === 'listings').map(coupon => (
                                                    <TableRow key={coupon.id}>
                                                        <TableCell className="font-medium">{coupon.code}</TableCell>
                                                        <TableCell>{coupon.discountPercentage}%</TableCell>
                                                        <TableCell><StatusBadge status={coupon.isActive} /></TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="icon" onClick={() => handleOpenCouponForm(coupon)}><Edit className="h-4 w-4" /></Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Coupon?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the coupon.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteCoupon(coupon.id)}>Confirm</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                                            </AlertDialog>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        )}
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div>
                                            <CardTitle className="text-2xl">Pop-up Ads</CardTitle>
                                            <CardDescription>Manage pop-up advertisements.</CardDescription>
                                        </div>
                                        <Button onClick={() => handleOpenAdForm(null)} className="w-full sm:w-auto">
                                            <PlusCircle className="mr-2 h-4 w-4" /> Add New
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Title</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {advertisements.map(ad => (
                                                    <TableRow key={ad.id}>
                                                        <TableCell className="font-medium">{ad.title}</TableCell>
                                                        <TableCell><StatusBadge status={ad.isActive} /></TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="icon" onClick={() => handleOpenAdForm(ad)}><Edit className="h-4 w-4" /></Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Ad?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this advertisement.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteAd(ad.id)}>Confirm</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                                            </AlertDialog>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="staff">
                        <Card>
                            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-2xl">Staff Management</CardTitle>
                                    <CardDescription>Add, edit, and monitor staff performance.</CardDescription>
                                </div>
                                <Button onClick={() => handleOpenStaffForm(null)} className="w-full sm:w-auto">
                                    <UserPlus className="mr-2 h-4 w-4" /> Add New Staff
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>User ID</TableHead>
                                                <TableHead>Approved</TableHead>
                                                <TableHead>Rejected</TableHead>
                                                <TableHead title="Average time a listing waited between being submitted and this staff member approving or rejecting it. It is not time spent online.">Avg. Time to Review</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {staff.map((s: any) => (
                                                <TableRow key={s.id}>
                                                    <TableCell className="font-medium">{s.name}</TableCell>
                                                    <TableCell>{s.userId}</TableCell>
                                                    <TableCell className="text-green-600 font-semibold">
                                                        {s.approved_count || 0}
                                                    </TableCell>
                                                    <TableCell className="text-red-600 font-semibold">
                                                        {s.rejected_count || 0}
                                                    </TableCell>
                                                    <TableCell>
                                                        {formatReviewWait(s)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenStaffForm(s)}><Edit className="h-4 w-4" /></Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader><AlertDialogTitle>Delete Staff Member?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the staff member's account.</AlertDialogDescription></AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDeleteStaff(s.id)}>Confirm</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="users">
                        <UserProfilesTable />
                    </TabsContent>

                    <TabsContent value="appearance">
                        <ThemeCustomizer />
                        <DemoDataCard />
                    </TabsContent>

                    {/* 👇 NEW PURCHASES TAB CONTENT 👇 */}
                    <TabsContent value="vendors">
                        <VendorsPanel
                            canCreate
                            onOpenListing={(id) => {
                                const hit = [...properties, ...roommates].find((x: any) => String(x.id) === String(id));
                                if (hit) handleViewDetails(hit as AnyListing);
                                else toast({ title: 'Listing not loaded', description: 'Refresh the page and try again.' });
                            }}
                        />
                    </TabsContent>
                    <TabsContent value="purchases">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-2xl">Financial Overview & User Spend</CardTitle>
                                <CardDescription>Track all plan purchases, grouped by user, including lifetime expenditure.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {groupedPurchases.length === 0 ? (
                                    <p className="py-8 text-center text-muted-foreground">No purchases recorded yet.</p>
                                ) : (
                                    <>
                                        {/* Phones: one card per user */}
                                        <div className="space-y-3 md:hidden">
                                            {groupedPurchases.map((user, idx) => (
                                                <div key={idx} className="rounded-xl border p-4">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="font-semibold truncate">{user.name}</p>
                                                            <p className="text-xs text-muted-foreground break-all">{user.email}</p>
                                                        </div>
                                                        <p className="shrink-0 text-lg font-bold text-primary">₹{user.totalSpend.toLocaleString()}</p>
                                                    </div>
                                                    <div className="mt-3"><PlanSummary plans={user.plans} /></div>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Larger screens: table */}
                                        <div className="hidden md:block overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>User</TableHead>
                                                        <TableHead>Email</TableHead>
                                                        <TableHead>Plans Bought</TableHead>
                                                        <TableHead className="text-right">Total Lifetime Spend</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {groupedPurchases.map((user, idx) => (
                                                        <TableRow key={idx}>
                                                            <TableCell className="font-medium align-top">{user.name}</TableCell>
                                                            <TableCell className="align-top">{user.email}</TableCell>
                                                            <TableCell className="align-top"><PlanSummary plans={user.plans} /></TableCell>
                                                            <TableCell className="text-right font-bold text-primary text-lg align-top">
                                                                ₹{user.totalSpend.toLocaleString()}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>

            {/* Ad Form Modal */}
            <AdFormDialog
                isOpen={isAdFormModalOpen}
                onClose={() => setAdFormModalOpen(false)}
                onSave={handleSaveAd}
                ad={editingAd}
                coupons={coupons}
            />

            {/* Coupon Form Modal */}
            <CouponFormDialog
                isOpen={isCouponFormModalOpen}
                onClose={() => setCouponFormModalOpen(false)}
                onSave={handleSaveCoupon}
                coupon={editingCoupon}
                defaultScope={newCouponScope}
            />

            {/* Staff Form Modal */}
            <StaffFormDialog
                isOpen={isStaffFormModalOpen}
                onClose={() => setStaffFormModalOpen(false)}
                onSave={handleSaveStaff}
                staffMember={editingStaff}
            />

            {/* Staff Activity Modal */}
            <StaffActivityDialog
                isOpen={isStaffActivityModalOpen}
                onClose={() => setStaffActivityModalOpen(false)}
                details={staffActivityDetails}
            />

            {/* Vendor Details Modal */}
            <VendorDetailsDialog
                isOpen={isVendorDetailsModalOpen}
                onClose={() => setVendorDetailsModalOpen(false)}
                details={vendorDetails}
            />

            <CreateVendorDialog
                isOpen={isCreateVendorModalOpen}
                onClose={() => setCreateVendorModalOpen(false)}
                onCreate={handleCreateVendor}
            />

            {/* Details Modal */}
            <Dialog open={isDetailsModalOpen} onOpenChange={setDetailsModalOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{currentItem && ('title' in currentItem ? currentItem.title : currentItem?.ownerName)}</DialogTitle>
                        {currentItem && <p className="font-mono text-xs text-muted-foreground">Listing ID: <span className="font-semibold text-foreground">{listingCode(currentItem.id)}</span></p>}
                        {currentItem && (currentItem as any).editedAt && <div><EditedTag editedAt={(currentItem as any).editedAt} /></div>}
                    </DialogHeader>
                    {currentItem && (
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
                            <ListingChanges changes={(currentItem as any).pendingEdits} />
                            {Array.isArray(currentItem.images) && currentItem.images.length > 0 && (
                                <div className="relative w-full h-64 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
                                    {isVideoUrl(currentItem.images[currentMediaIndex]) ? (
                                        <video
                                            key={currentItem.images[currentMediaIndex]}
                                            src={currentItem.images[currentMediaIndex]}
                                            controls
                                            playsInline
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <img
                                            src={currentItem.images[currentMediaIndex]}
                                            alt="Listing Media"
                                            className="absolute inset-0 h-full w-full object-contain p-2"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80";
                                            }}
                                        />
                                    )}
                                    {currentItem.images.length > 1 && (
                                        <>
                                            <Button size="icon" variant="ghost" className="absolute left-2 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 z-10" onClick={() => setCurrentMediaIndex(i => Math.max(0, i - 1))} disabled={currentMediaIndex === 0}><ChevronLeft /></Button>
                                            <Button size="icon" variant="ghost" className="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 z-10" onClick={() => setCurrentMediaIndex(i => Math.min(currentItem.images.length - 1, i + 1))} disabled={currentMediaIndex === currentItem.images.length - 1}><ChevronRight /></Button>
                                        </>
                                    )}
                                </div>
                            )}

                            {Boolean(
                                currentItem.aadhaarCardUrl ||
                                currentItem.electricityBillUrl ||
                                currentItem.nocUrl ||
                                (currentItem as any).document_aadhaar ||
                                (currentItem as any).document_electricity ||
                                (currentItem as any).document_noc
                            ) && (
                                    <div className="border rounded-lg p-4 bg-blue-50">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold text-base flex items-center gap-2">
                                                <FileCheck className="w-5 h-5 text-blue-700" />
                                                Verification Documents
                                            </h4>
                                            {currentItem.propertyType === 'Roommate' && ('age' in currentItem && currentItem.age) && (
                                                <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-semibold border border-blue-200">
                                                    Age: {currentItem.age}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-4">
                                            {(currentItem.aadhaarCardUrl || (currentItem as any).document_aadhaar) && (
                                                <div className="flex flex-col items-center gap-2">
                                                    <FileText className="w-8 h-8 text-blue-600" />
                                                    <p className="text-sm font-medium">Aadhaar Card</p>
                                                    <Button asChild variant="outline" size="sm">
                                                        <a href={currentItem.aadhaarCardUrl || (currentItem as any).document_aadhaar} target="_blank" rel="noopener noreferrer">View</a>
                                                    </Button>
                                                </div>
                                            )}
                                            {(currentItem.electricityBillUrl || (currentItem as any).document_electricity) && (
                                                <div className="flex flex-col items-center gap-2">
                                                    <FileText className="w-8 h-8 text-blue-600" />
                                                    <p className="text-sm font-medium">Electricity Bill</p>
                                                    <Button asChild variant="outline" size="sm">
                                                        <a href={currentItem.electricityBillUrl || (currentItem as any).document_electricity} target="_blank" rel="noopener noreferrer">View</a>
                                                    </Button>
                                                </div>
                                            )}
                                            {(currentItem.nocUrl || (currentItem as any).document_noc) && (
                                                <div className="flex flex-col items-center gap-2">
                                                    <FileText className="w-8 h-8 text-blue-600" />
                                                    <p className="text-sm font-medium">NOC</p>
                                                    <Button asChild variant="outline" size="sm">
                                                        <a href={currentItem.nocUrl || (currentItem as any).document_noc} target="_blank" rel="noopener noreferrer">View</a>
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="p-3 bg-slate-50 rounded-md space-y-1">
                                    <strong className="block text-sm font-medium text-muted-foreground">ID</strong>
                                    <div>{currentItem.id}</div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-md space-y-1">
                                    <strong className="block text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> Vendor Number</strong>
                                    <div className="font-mono">{'vendorNumber' in currentItem ? currentItem.vendorNumber || 'N/A' : 'N/A'}</div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-md space-y-1">
                                    <strong className="block text-sm font-medium text-muted-foreground">Type</strong>
                                    <div className="capitalize">{currentItem.propertyType}</div>
                                </div>
                                {currentItem.propertyType === 'Roommate' && (
                                    <div className="p-3 bg-slate-50 rounded-md space-y-1">
                                        <strong className="block text-sm font-medium text-muted-foreground">Age</strong>
                                        <div className="font-semibold">{('age' in currentItem && currentItem.age) ? currentItem.age : 'N/A'}</div>
                                    </div>
                                )}
                                <div className="p-3 bg-slate-50 rounded-md space-y-1">
                                    <strong className="block text-sm font-medium text-muted-foreground">Locality</strong>
                                    <div><ChangedInline changes={(currentItem as any).pendingEdits} field="area">{currentItem.locality}</ChangedInline></div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-md space-y-1">
                                    <strong className="block text-sm font-medium text-muted-foreground">Status</strong>
                                    <StatusBadge status={currentItem.status} />
                                </div>

                                <div className="p-3 bg-slate-50 rounded-md space-y-1">
                                    <strong className="block text-sm font-medium text-muted-foreground flex items-center gap-1.5"><UserIcon className="w-4 h-4" /> Owner/User Name</strong>
                                    <div><ChangedInline changes={(currentItem as any).pendingEdits} field="owner_name">{currentItem.ownerName}</ChangedInline></div>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-md space-y-1">
                                    <strong className="block text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Phone className="w-4 h-4" /> Phone Number</strong>
                                    <div className="font-medium text-primary">
                                        <ChangedInline changes={(currentItem as any).pendingEdits} field="phone_primary">{currentItem.contactPhonePrimary !== 'Hidden' && currentItem.contactPhonePrimary ? currentItem.contactPhonePrimary : 'Not Provided'}</ChangedInline>
                                    </div>
                                </div>

                                <div className="md:col-span-2 p-3 bg-slate-50 rounded-md space-y-1">
                                    <strong className="block text-sm font-medium text-muted-foreground flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Full Address</strong>
                                    <div><ChangedInline changes={(currentItem as any).pendingEdits} field="address">{currentItem.completeAddress || currentItem.partialAddress || 'Not Provided'}</ChangedInline></div>
                                </div>

                                {/* Description */}
                                <div className="md:col-span-2 p-3 bg-slate-50 rounded-md space-y-1">
                                    <strong className="block text-sm font-medium text-muted-foreground">Description</strong>
                                    <div><ChangedInline changes={(currentItem as any).pendingEdits} field="description">{('description' in currentItem && currentItem.description) ? currentItem.description : 'No description provided.'}</ChangedInline></div>
                                </div>

                                {(currentItem as any).roommateDetails && (
                                    <div className="md:col-span-2 p-3 bg-slate-50 rounded-md space-y-3">
                                        <strong className="block text-sm font-medium text-muted-foreground">Roommate questionnaire</strong>
                                        <RoommateAnswers details={(currentItem as any).roommateDetails} showHidden />
                                    </div>
                                )}

                                {/* NEW BULLETPROOF AMENITIES BLOCK */}
                                {('amenities' in currentItem) && (
                                    <div className="md:col-span-2 p-3 bg-slate-50 rounded-md space-y-1">
                                        <strong className="block text-sm font-medium text-muted-foreground">Amenities</strong>
                                        {Array.isArray(currentItem.amenities) && currentItem.amenities.length > 0 ? (
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {currentItem.amenities.map((amenity: string, index: number) => (
                                                    <span key={index} className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-medium border border-slate-300">
                                                        {amenity}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : typeof (currentItem.amenities as unknown) === 'string' && (currentItem.amenities as unknown as string).length > 0 ? (
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {(currentItem.amenities as unknown as string).split(',').map((amenity: string, index: number) => (
                                                    <span key={index} className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-medium border border-slate-300">
                                                        {amenity.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-500 italic">No specific amenities listed.</p>
                                        )}
                                    </div>
                                )}

                                {/* NEW WHATSAPP & CALL BUTTONS FOR ADMIN */}
                                {currentItem.contactPhonePrimary && !currentItem.contactPhonePrimary.includes('Hidden') && (
                                    <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 pt-2">
                                        <Button className="h-11 w-full sm:w-auto sm:flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white shadow-sm" asChild>
                                            <a href={whatsappLink(currentItem.contactPhonePrimary)} target="_blank" rel="noopener noreferrer">
                                                Chat on WhatsApp
                                            </a>
                                        </Button>
                                        <Button variant="outline" className="h-11 w-full sm:w-auto sm:flex-1 shadow-sm border-blue-200 text-blue-700 hover:bg-blue-50" asChild>
                                            <a href={`tel:${currentItem.contactPhonePrimary.replace(/\D/g, '')}`}>
                                                Call Owner
                                            </a>
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end space-x-2 pt-4">
                                <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>Close</Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive"><Trash2 className="w-4 h-4 mr-2" /> Delete</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the item.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteItem(currentItem.id, currentItem.propertyType)}>Confirm Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                {currentItem.status !== 'rejected' && <Button variant="secondary" onClick={() => handleUpdateStatus(currentItem.id, currentItem.propertyType, 'rejected')}><XCircle className="w-4 h-4 mr-2" />Reject</Button>}
                                {currentItem.status !== 'approved' && <Button onClick={() => handleUpdateStatus(currentItem.id, currentItem.propertyType, 'approved')}><CheckCircle className="w-4 h-4 mr-2" />Approve</Button>}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Settings Modals */}
            <Dialog open={activeSettingsDialog === 'password'} onOpenChange={() => setActiveSettingsDialog(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
                    <PasswordChangeForm currentPassword={adminPassword} onSave={handleUpdatePassword} onClose={() => setActiveSettingsDialog(null)} />
                </DialogContent>
            </Dialog>
            <Dialog open={activeSettingsDialog === 'pin'} onOpenChange={() => setActiveSettingsDialog(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Change PIN</DialogTitle></DialogHeader>
                    <PinChangeForm currentPin={adminOtp} onSave={handleUpdatePin} onClose={() => setActiveSettingsDialog(null)} />
                </DialogContent>
            </Dialog>
            <Dialog open={activeSettingsDialog === 'security'} onOpenChange={() => setActiveSettingsDialog(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Change Security Question</DialogTitle></DialogHeader>
                    <SecurityQuestionChangeForm
                        currentQuestion={adminQuestion}
                        currentAnswer={adminAnswer}
                        onSave={handleUpdateSecurityQuestion}
                        onClose={() => setActiveSettingsDialog(null)} />
                </DialogContent>
            </Dialog>
            <Dialog open={activeSettingsDialog === 'contact'} onOpenChange={() => setActiveSettingsDialog(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Change Contact Information</DialogTitle></DialogHeader>
                    <ContactInfoChangeForm
                        currentEmail={adminEmail}
                        currentPhone={adminPhone}
                        currentAddress={adminAddress}
                        onSave={handleSaveContactInfo}
                        onClose={() => setActiveSettingsDialog(null)}
                    />
                </DialogContent>
            </Dialog>

            {/* Security Setting Modals (Header Menu) */}
            <Dialog open={isPasswordModalOpen} onOpenChange={setPasswordModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Change Admin Password</DialogTitle></DialogHeader>
                    <PasswordChangeForm currentPassword={adminPassword} onSave={handleUpdatePassword} onClose={() => setPasswordModalOpen(false)} />
                </DialogContent>
            </Dialog>

            <Dialog open={isPinModalOpen} onOpenChange={setPinModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Change Admin PIN</DialogTitle></DialogHeader>
                    <PinChangeForm currentPin={adminOtp} onSave={handleUpdatePin} onClose={() => setPinModalOpen(false)} />
                </DialogContent>
            </Dialog>

            <Dialog open={isSecurityQuestionModalOpen} onOpenChange={setSecurityQuestionModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Change Security Question</DialogTitle></DialogHeader>
                    <SecurityQuestionChangeForm currentQuestion={adminQuestion} currentAnswer={adminAnswer} onSave={handleUpdateSecurityQuestion} onClose={() => setSecurityQuestionModalOpen(false)} />
                </DialogContent>
            </Dialog>
        </div>
    );
}