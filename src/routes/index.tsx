import { createFileRoute } from "@tanstack/react-router";

// Public address of the site, used for link previews. Set VITE_SITE_URL on Vercel when a custom domain is added.
const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "") || "https://set-my-stay-frontend-new.vercel.app";

const URL_PAGES: Page[] = ['pg', 'rentals', 'roommates', 'list-roommate', 'for-sale', 'my-properties', 'liked-properties'];
function pageFromUrl(): Page {
  if (typeof window === 'undefined') return 'home';
  const p = new URLSearchParams(window.location.search).get('page') as Page | null;
  return p && URL_PAGES.includes(p) ? p : 'home';
}
function urlForPage(page: Page): string {
  return URL_PAGES.includes(page) ? `/?page=${page}` : '/';
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SetMyStay — Find Your Perfect Living Space" },
      { name: "description", content: "Browse PGs, rentals and roommate listings. Unlock owner contact details, list your property, and find your perfect living space with SetMyStay." },
      { property: "og:title", content: "SetMyStay — Find Your Perfect Living Space" },
      { property: "og:description", content: "Browse PGs, rentals and roommate listings. Unlock owner contact details, list your property, and find your perfect living space with SetMyStay." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL + "/" },
      { property: "og:image", content: SITE_URL + "/og-image.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "SetMyStay: PGs, rentals and roommates in one place" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SetMyStay — Find Your Perfect Living Space" },
      { name: "twitter:description", content: "Browse PGs, rentals and roommate listings. Unlock owner contact details, list your property, and find your perfect living space with SetMyStay." },
      { name: "twitter:image", content: SITE_URL + "/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/" }],
  }),
  component: Home,
});

import React, { useState, useEffect, useCallback, useRef } from "react";
import { scrollPageToTop } from "@/components/smooth-scroll";
import { HomeStaticShell } from "@/components/sections/home-static-shell";
import type { Listing, RoommateProfile, Page, ListingType, UnlockPlan, Bed, Advertisement, Coupon, Purchase, AnyListing, PricingData } from "@/lib/types";
import { defaultPricing, dummyProperties, dummyRoommates } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import api, { getProperties, getRoommates, toggleFavoriteProperty, getCoupons, getAdvertisements, createListing, listingToRoommateProfile, getMyPurchases, getMyPlan, unlockListingApi, getPropertyById, getMyFavoriteIds, setFavorite, getMyProperties } from "@/lib/api";
import type { MyPlan } from "@/lib/api";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HomeSection } from "@/components/sections/home-section";
import { ListingsSection } from "@/components/sections/listings-section";

import { PropertyDetails } from "@/components/modals/property-details";
import { RoommateDetails } from "@/components/modals/roommate-details";
import { ForSaleSection } from "@/components/sections/for-sale-section";
import { ListRoommateSection } from "@/components/sections/list-roommate-section";
import { EditListingDialog } from "@/components/modals/edit-listing-dialog";
import { UnlockDetailsModal, PENDING_PURCHASE_KEY } from "@/components/modals/unlock-details-modal";
import { ListPropertyPaymentModal } from "@/components/modals/list-property-payment-modal";
import { feeFor, fetchAndCachePricing } from "@/lib/app-settings";
import { WelcomeProfileModal } from "@/components/modals/welcome-profile-modal";
import { AuthModal } from "@/components/modals/auth-modal";
import { ChatModal } from "@/components/modals/chat-modal";
import { LoadingSpinner } from "@/components/icons";
import { RateUsModal } from "@/components/modals/rate-us-modal";
import { BookingInquiryModal } from "@/components/modals/booking-inquiry-modal";
import { FloatingCta } from "@/components/shared/floating-cta";
import { AdvertisementModal } from "@/components/modals/advertisement-modal";
import { PaymentConfirmationModal } from "@/components/modals/payment-confirmation-modal";
import { SlotMachineModal } from "@/components/modals/slot-machine-modal";
import { ContactFab } from "@/components/shared/contact-fab";
import { HistoryModal } from "@/components/modals/history-modal";
import { PolicyModal, type PolicyTab } from "@/components/modals/policy-modal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getFromLocalStorage, saveToLocalStorage } from "@/lib/storage";

function getSubscriptionRemainingText(expiresAt?: string | null): string {
  if (!expiresAt) return "30 days";
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return "0 days (expired)";
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'}${diffHours > 0 ? ` and ${diffHours} hr${diffHours === 1 ? '' : 's'}` : ''}`;
  }
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (diffHours > 0) {
    return `${diffHours} hr${diffHours === 1 ? '' : 's'} ${diffMinutes} min`;
  }
  return `${Math.max(1, diffMinutes)} min`;
}

const defaultUserState = {
  unlocks: { 
    count: 0, 
    isUnlimited: false, 
    unlimitedExpiresAt: null as string | null,
    unlockedIds: new Set<string>() 
  },
  purchaseHistory: [] as Purchase[],
  likedItemIds: new Set<string>(),
};

function getUserStorageKey(): string {
  if (typeof window === 'undefined') return 'guest';
  const email = localStorage.getItem('user_email');
  if (email && email.trim()) return email.trim().toLowerCase();
  const name = localStorage.getItem('user_name');
  if (name && name.trim()) return name.trim().toLowerCase();
  return 'defaultUser';
}

function Home() {
  const isLoggingOutRef = useRef(false);
  const [activePage, setActivePage] = useState<Page>(() => pageFromUrl());
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [allRoommates, setAllRoommates] = useState<RoommateProfile[]>([]);
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // The page-change fade only plays after the first page change (not on first load)
  const [hasNavigated, setHasNavigated] = useState(false);
  const prevPageRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevPageRef.current !== null && prevPageRef.current !== activePage) setHasNavigated(true);
    prevPageRef.current = activePage;
  }, [activePage]);
  const [featuredProperties, setFeaturedProperties] = useState<Listing[]>([]);
  const [featuredPGs, setFeaturedPGs] = useState<Listing[]>([]);
  const [featuredRoommates, setFeaturedRoommates] = useState<RoommateProfile[]>([]);
  const [isClient, setIsClient] = useState(false);

  const [selectedItem, setSelectedItem] = useState<{ type: 'listing' | 'roommate'; data: AnyListing } | null>(null);
  const [itemToUnlock, setItemToUnlock] = useState<{ type: 'listing' | 'roommate'; data: AnyListing } | null>(null);
  const [isUnlockModalOpen, setUnlockModalOpen] = useState(false);
  const [isListPaymentModalOpen, setListPaymentModalOpen] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [isChatModalOpen, setChatModalOpen] = useState(false);
  const [isRateUsModalOpen, setRateUsModalOpen] = useState(false);
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
  const [chattingWith, setChattingWith] = useState<string | null>(null);

  const [unlocks, setUnlocks] = useState(defaultUserState.unlocks);
  const [purchaseHistory, setPurchaseHistory] = useState<Purchase[]>([]);
  const [likedItemIds, setLikedItemIds] = useState<Set<string>>(new Set());
  const [likedItems, setLikedItems] = useState<(Listing | RoommateProfile)[]>([]);
  const [myProperties, setMyProperties] = useState<(Listing | RoommateProfile)[]>([]);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [inquiryData, setInquiryData] = useState<{ listing: Listing; bed: Bed } | null>(null);
  const [pendingListingData, setPendingListingData] = useState<any>(null);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authActionRequired, setAuthActionRequired] = useState<string | null>(null);
  const [autoPurchase, setAutoPurchase] = useState<{ title: string; amount: number } | null>(null);
  // My Properties > Edit: roommate profiles open the roommate form, PG / rentals open the edit dialog
  const [editingRoommateId, setEditingRoommateId] = useState<string | null>(null);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);

  const [adToShow, setAdToShow] = useState<Advertisement | null>(null);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);

  const [isPaymentConfirmationOpen, setIsPaymentConfirmationOpen] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{ planName: string; amount: number; onConfirm: () => void; } | null>(null);

  const [isSlotMachineModalOpen, setIsSlotMachineModalOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [policyModalTab, setPolicyModalTab] = useState<PolicyTab>('refund');
  const [isUnlockConfirmationOpen, setUnlockConfirmationOpen] = useState(false);
  const [activeCoupons, setActiveCoupons] = useState<Coupon[]>([]);

  const { toast } = useToast();

  // The database is the single source of truth for credits / Ultimate / unlocked listings.
  const applyServerPlan = useCallback((plan: MyPlan | null) => {
    if (!plan) return;
    setUnlocks({
      count: plan.credits_left,
      isUnlimited: plan.is_unlimited,
      unlimitedExpiresAt: plan.unlimited_expires_at,
      unlockedIds: new Set((plan.unlocked_ids || []).map(String)),
    });
  }, []);

  const syncPlanFromServer = useCallback(async () => {
    if (!localStorage.getItem('access_token')) return null;
    try {
      const plan = await getMyPlan();
      applyServerPlan(plan);
      return plan;
    } catch (e) {
      console.warn("Could not load plan from server:", e);
      return null;
    }
  }, [applyServerPlan]);

  // Likes and "My Properties" come from the server, so they survive logout and clearing cookies.
  const syncUserListsFromServer = useCallback(async () => {
    if (!localStorage.getItem('access_token')) return;
    try {
      const ids = await getMyFavoriteIds();
      setLikedItemIds(new Set(ids));
    } catch (e) {
      console.warn("Could not load likes from server:", e);
    }
    try {
      const mine = await getMyProperties();
      setMyProperties(mine.map((p) =>
        (p.propertyType as string)?.toLowerCase() === 'roommate' ? listingToRoommateProfile(p) : p
      ));
    } catch (e) {
      console.warn("Could not load my properties:", e);
    }
  }, []);

  // After an unlock the server starts sending the owner's phone/address for that listing,
  // so fetch the listing again and swap it in everywhere it is shown.
  const refreshUnlockedItem = useCallback(async (id: string, type: 'listing' | 'roommate') => {
    const fresh = await getPropertyById(String(id));
    if (!fresh) return null;
    const isRoommate = (fresh.propertyType as string)?.toLowerCase() === 'roommate';
    if (isRoommate) {
      const mate = listingToRoommateProfile(fresh);
      const swap = (arr: RoommateProfile[]) => arr.map((r) => (String(r.id) === String(id) ? { ...r, ...mate } : r));
      setAllRoommates(swap);
      setFeaturedRoommates(swap);
      return { type, data: mate as AnyListing };
    }
    const swap = (arr: Listing[]) => arr.map((l) => (String(l.id) === String(id) ? { ...l, ...fresh } : l));
    setAllListings(swap);
    setFeaturedProperties(swap);
    setFeaturedPGs(swap);
    return { type, data: fresh as AnyListing };
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    if (!localStorage.getItem('admin_authenticated') && !localStorage.getItem('staff_authenticated')) return;
    // Checked once per browser session: if the website's login is actually the admin/staff account
    // (it must never be), move it back to the panel and sign the website out.
    if (sessionStorage.getItem('setmystay_panel_login_checked')) return;
    sessionStorage.setItem('setmystay_panel_login_checked', '1');
    const token = localStorage.getItem('access_token');
    if (!token) return;
    api.get('/auth/verify-staff/', { authSlot: 'site' } as any).then(() => {
      if (!localStorage.getItem('panel_access_token')) {
        localStorage.setItem('panel_access_token', token);
        const r = localStorage.getItem('refresh_token');
        if (r) localStorage.setItem('panel_refresh_token', r);
      }
      ['access_token', 'refresh_token', 'setmystay_isLoggedIn', 'user_email', 'user_name', 'user_phone',
       'user_address', 'user_pic', 'setmystay_user_data', 'setmystay_purchase_history', 'is_profile_complete']
        .forEach((k) => localStorage.removeItem(k));
      toast({ title: "Please sign in again", description: "You were signed in to the website with the admin account. Sign in with your own account." });
      setTimeout(() => window.location.reload(), 1500);
    }).catch(() => { /* normal user account: nothing to do */ });
  }, [isClient]);

  useEffect(() => {
    if (isClient) {
      const hasToken = !!localStorage.getItem('access_token');
      const loggedInStatus = getFromLocalStorage('setmystay_isLoggedIn', false) || hasToken;
      setIsLoggedIn(loggedInStatus);
      
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const [allData, directRoommates] = await Promise.all([
            getProperties(),
            getRoommates().catch(() => []),
          ]);

          const realProperties = allData.filter(p => (p.propertyType as string)?.toLowerCase() !== 'roommate');
          const rawRoommates = allData.filter(p => (p.propertyType as string)?.toLowerCase() === 'roommate');

          const realRoommatesFromProps = rawRoommates.map(listingToRoommateProfile);
          const combinedMatesMap = new Map<string, RoommateProfile>();
          [...realRoommatesFromProps, ...directRoommates].forEach(r => {
            if (r && r.id) combinedMatesMap.set(String(r.id), r);
          });
          let realRoommates = Array.from(combinedMatesMap.values());
          if (realRoommates.length === 0) {
            realRoommates = dummyRoommates;
          }

          setAllListings(realProperties.length > 0 ? realProperties : dummyProperties);
          setAllRoommates(realRoommates);

          const realRentals = realProperties.filter(p => (p.propertyType as string)?.toLowerCase() === 'rental');
          const fallbackRentals = dummyProperties.filter(p => (p.propertyType as string)?.toLowerCase() === 'rental');
          const rentalsToUse = realRentals.length > 0 ? realRentals : fallbackRentals;

          const realPGs = realProperties.filter(p => (p.propertyType as string)?.toLowerCase() === 'pg');
          const fallbackPGs = dummyProperties.filter(p => (p.propertyType as string)?.toLowerCase() === 'pg');
          const pgsToUse = realPGs.length > 0 ? realPGs : fallbackPGs;

          const shuffledRentals = [...rentalsToUse].sort(() => 0.5 - Math.random());
          const shuffledPGs = [...pgsToUse].sort(() => 0.5 - Math.random());
          const shuffledRoommates = [...realRoommates].sort(() => 0.5 - Math.random());

          setFeaturedProperties(shuffledRentals.slice(0, 4));
          setFeaturedPGs(shuffledPGs.slice(0, 4));

          const withProp = shuffledRoommates.filter(r => r.hasProperty);
          setFeaturedRoommates(withProp.length > 0 ? withProp.slice(0, 6) : shuffledRoommates.slice(0, 6));

          getCoupons().then(setActiveCoupons).catch(() => {});

          const liveAds = await getAdvertisements().catch(() => [] as Advertisement[]);
          const userKey = (typeof localStorage !== 'undefined' && (localStorage.getItem('user_email') || localStorage.getItem('user_name'))) || 'guest';
          const lastShown = localStorage.getItem(`setmystay_ad_shown_${userKey}`);
          const ONE_DAY_MS = 24 * 60 * 60 * 1000;
          const activeAd = liveAds.find((ad: Advertisement) => ad.isActive);
          
          if (activeAd && (!lastShown || (Date.now() - parseInt(lastShown, 10)) > ONE_DAY_MS)) {
              setAdToShow(activeAd);
              setTimeout(() => {
                setIsAdModalOpen(true);
                localStorage.setItem(`setmystay_ad_shown_${userKey}`, Date.now().toString());
              }, 6000);
          }

          if (loggedInStatus) {
            getMyPurchases().then((serverPurchases) => {
              if (!Array.isArray(serverPurchases) || serverPurchases.length === 0) return;
              setPurchaseHistory((curr) => {
                const merged = [...curr, ...serverPurchases];
                return Array.from(new Map(merged.map((p: any) => [
                  p.razorpay_payment_id || p.id || `${p.plan || p.plan_name}-${p.date || p.created_at}`,
                  { ...p, date: new Date(p.date || p.created_at || Date.now()) }
                ])).values());
              });
            }).catch(() => {});
          }

        } catch (error) {
          console.error("Failed to load data", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchData(); 
      
      fetchAndCachePricing().then((p) => setPricing(p)).catch(() => {
        setPricing(getFromLocalStorage('pricing', defaultPricing));
      });
      
      const userKey = getUserStorageKey();
      const allUserData: any = getFromLocalStorage('setmystay_user_data', {});
      const userData = loggedInStatus ? (allUserData[userKey] || defaultUserState) : defaultUserState;
      
      let localHistory: any[] = [];
      try {
        const raw = localStorage.getItem('setmystay_purchase_history');
        if (raw) localHistory = JSON.parse(raw);
      } catch {}
      const combinedHistory = [...(userData.purchaseHistory || []), ...localHistory];
      const uniqueHistory = Array.from(new Map(combinedHistory.map((p) => [p.id || `${p.plan || p.plan_name}-${p.date || p.created_at}`, p])).values());
      const parsedHistory = uniqueHistory.map((p: any) => ({ ...p, date: new Date(p.date || p.created_at || Date.now()) }));
      setPurchaseHistory(parsedHistory);

      let isUnlimited = userData.unlocks?.isUnlimited || false;
      let unlimitedExpiresAt = userData.unlocks?.unlimitedExpiresAt || null;

      // Auto-detect active unlimited subscription from purchase history (within 30 days)
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const ultimatePurchase = parsedHistory.find((p: any) => {
        const name = (p.plan || p.plan_name || '').toLowerCase();
        return name.includes('ultimate') || name.includes('unlimited');
      });
      if (ultimatePurchase) {
        const pDate = new Date(ultimatePurchase.date).getTime();
        if (Date.now() - pDate < thirtyDaysMs) {
          isUnlimited = true;
          unlimitedExpiresAt = new Date(pDate + thirtyDaysMs).toISOString();
        }
      }

      if (isUnlimited && unlimitedExpiresAt) {
        if (new Date(unlimitedExpiresAt).getTime() <= Date.now()) {
          isUnlimited = false;
          unlimitedExpiresAt = null;
        }
      }

      let count = userData.unlocks?.count || 0;
      if (count === 0 && !isUnlimited) {
        let totalPurchased = 0;
        parsedHistory.forEach((p: any) => {
          const name = (p.plan || p.plan_name || '').toLowerCase();
          if (name.includes('10') || name.includes('pro')) totalPurchased += 10;
          else if (name.includes('5') || name.includes('value')) totalPurchased += 5;
          else if (name.includes('1') || name.includes('starter')) totalPurchased += 1;
        });
        const usedCount = (userData.unlocks?.unlockedIds || []).length;
        if (totalPurchased > usedCount) {
          count = totalPurchased - usedCount;
        }
      }

      setUnlocks({
          count: count,
          isUnlimited: isUnlimited,
          unlimitedExpiresAt: unlimitedExpiresAt,
          unlockedIds: new Set(userData.unlocks?.unlockedIds || []),
      });
      
      const currentLikedIds = new Set<string>(userData.likedItemIds || []);
      setLikedItemIds(currentLikedIds);

      if (loggedInStatus) {
        syncPlanFromServer();
        syncUserListsFromServer();
      }
    }
  }, [isClient]);

  // A plan was chosen (with coupon) before signing in: after Google sign-in, go straight to Razorpay
  useEffect(() => {
    if (!isClient || !isLoggedIn) return;
    let pending: { title?: string; amount?: number; at?: number } | null = null;
    try { pending = JSON.parse(sessionStorage.getItem(PENDING_PURCHASE_KEY) || 'null'); } catch { pending = null; }
    if (!pending) return;
    sessionStorage.removeItem(PENDING_PURCHASE_KEY);
    if (!pending.title || typeof pending.amount !== 'number' || Date.now() - (pending.at || 0) > 30 * 60 * 1000) return;
    const t = setTimeout(() => {
      setAutoPurchase({ title: pending!.title!, amount: pending!.amount! });
      setUnlockModalOpen(true);
    }, 1200); // let the user's current plan load first
    return () => clearTimeout(t);
  }, [isClient, isLoggedIn]);

  const saveUserData = useCallback(() => {
    if (isLoggingOutRef.current) return;
    if (isLoggedIn && isClient) {
      const userKey = getUserStorageKey();
      if (userKey === 'guest') return;

      const allUserData: any = getFromLocalStorage('setmystay_user_data', {});
      const currentUserData = allUserData[userKey] || {};
      const isUnlimitedActive = unlocks.isUnlimited && (!unlocks.unlimitedExpiresAt || new Date(unlocks.unlimitedExpiresAt).getTime() > Date.now());
      const updatedData = { 
        ...currentUserData, 
        unlocks: {
            count: unlocks.count,
            isUnlimited: isUnlimitedActive,
            unlimitedExpiresAt: isUnlimitedActive ? unlocks.unlimitedExpiresAt : null,
            unlockedIds: Array.from(unlocks.unlockedIds),
        },
        purchaseHistory: purchaseHistory,
        likedItemIds: Array.from(likedItemIds),
      };
      saveToLocalStorage('setmystay_user_data', { 
        ...allUserData, 
        [userKey]: updatedData,
      });
    }
  }, [isLoggedIn, isClient, unlocks, purchaseHistory, likedItemIds]);

  useEffect(() => {
    if (isClient) {
      saveUserData();
    }
  }, [isClient, saveUserData]);
  
  useEffect(() => {
    if (authActionRequired) {
      toast({
        title: "Authentication Required",
        description: `Please sign in to ${authActionRequired}.`,
      });
      setAuthModalOpen(true);
      if (authActionRequired === 'list your property') {
        sessionStorage.setItem('setmystay_intended_page', 'list');
      }
      if (authActionRequired === 'list yourself as a roommate') {
        sessionStorage.setItem('setmystay_intended_page', 'list-roommate');
      }
    }
  }, [authActionRequired, toast]);

  useEffect(() => {
    const allAvailableItems = [...allListings, ...allRoommates];
    const newlyLikedItems = allAvailableItems.filter(item => likedItemIds.has(item.id));
    setLikedItems(newlyLikedItems);
  }, [likedItemIds, allListings, allRoommates]);

  // "Edit my profile" on the List as Roommate page
  useEffect(() => {
    const onEdit = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id) { setEditingRoommateId(String(id)); setActivePage('list-roommate'); }
    };
    window.addEventListener('setmystay:edit-roommate', onEdit);
    return () => window.removeEventListener('setmystay:edit-roommate', onEdit);
  }, []);

  const handleNavigate = (page: Page) => {
    setActivePage(page);
  };

  // /list-property sends signed-out visitors here with ?signin=list: open sign-in, then go back to the form
  useEffect(() => {
    if (!isClient) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('signin') === 'list') {
      window.history.replaceState(window.history.state, '', '/');
      if (!localStorage.getItem('access_token')) setAuthActionRequired('list your property');
      else window.location.href = '/list-property';
    }
  }, [isClient]);

  // Each section has its own address (/?page=rentals), so the browser/phone Back button,
  // refresh and shared links all land on the right section.
  const poppingRef = useRef(false);
  useEffect(() => {
    if (!isClient) return;
    const needsLogin = activePage === 'my-properties' || activePage === 'liked-properties' || activePage === 'list-roommate';
    if (activePage !== 'list-roommate' && editingRoommateId) setEditingRoommateId(null);
    if (needsLogin && !localStorage.getItem('access_token')) {
      if (activePage === 'list-roommate') setAuthActionRequired('list yourself as a roommate');
      setActivePage('home');
      return;
    }
    const want = urlForPage(activePage);
    const have = window.location.pathname + window.location.search;
    if (poppingRef.current) { poppingRef.current = false; return; }
    if (want !== have && window.location.pathname === '/') {
      window.history.pushState({ ...(window.history.state || {}), smsPage: activePage }, '', want);
    }
  }, [activePage, isClient]);
  useEffect(() => {
    const onPop = () => { poppingRef.current = true; setActivePage(pageFromUrl()); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    scrollPageToTop();
  }, [activePage]);

  const handleRateUsClose = (rated: boolean) => {
    setRateUsModalOpen(false);
  };
  
  const useUnlock = useCallback((itemId: string) => {
    let success = false;
    let newCount: number | undefined;
    let isUnlimitedActive = false;
    let expiresAt: string | null = null;

    setUnlocks(currentUnlocks => {
        const hasValidUnlimited = currentUnlocks.isUnlimited && 
          (!currentUnlocks.unlimitedExpiresAt || new Date(currentUnlocks.unlimitedExpiresAt).getTime() > Date.now());

        if (hasValidUnlimited) {
            success = true;
            isUnlimitedActive = true;
            expiresAt = currentUnlocks.unlimitedExpiresAt || null;
            return {
                ...currentUnlocks,
                unlockedIds: new Set(currentUnlocks.unlockedIds).add(itemId),
            };
        }
        if (currentUnlocks.count > 0) {
            success = true;
            newCount = currentUnlocks.count - 1;
            return {
                ...currentUnlocks,
                isUnlimited: false,
                unlimitedExpiresAt: null,
                count: newCount,
                unlockedIds: new Set(currentUnlocks.unlockedIds).add(itemId),
            };
        }
        return {
          ...currentUnlocks,
          isUnlimited: false,
          unlimitedExpiresAt: null,
        };
    });
    
    if (success) {
      if (isUnlimitedActive) {
        const remainingTime = getSubscriptionRemainingText(expiresAt);
        toast({
          title: "Details Unlocked!",
          description: `Ultimate Plan: ${remainingTime} left in your subscription month.`,
        });
      } else if (newCount !== undefined) {
        toast({
          title: "Details Unlocked!",
          description: `You have ${newCount} unlock credit${newCount === 1 ? '' : 's'} remaining.`,
        });
      }
    }
    
    return success;
  }, [toast]);
  
  const handleUnlockPurchase = useCallback((plan: UnlockPlan, planName: string, amount: number) => {
    const isUnlimited = plan === 'unlimited';
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30); // Exactly 1 month (30 days)
    const expiryISO = isUnlimited ? expiry.toISOString() : null;

    setUnlocks(currentUnlocks => {
      const newUnlocksState = { ...currentUnlocks };
      if (isUnlimited) {
        newUnlocksState.isUnlimited = true;
        newUnlocksState.unlimitedExpiresAt = expiryISO;
      } else {
        newUnlocksState.count += (typeof plan === 'number' ? plan : 0);
      }
      // If user was unlocking an item, auto-unlock it immediately!
      if (itemToUnlock?.data.id) {
        newUnlocksState.unlockedIds = new Set(newUnlocksState.unlockedIds).add(itemToUnlock.data.id);
      }
      return newUnlocksState;
    });

    // Record the unlock on the server, then take the server's numbers as final
    (async () => {
      if (itemToUnlock?.data.id) {
        try {
          applyServerPlan(await unlockListingApi(String(itemToUnlock.data.id)));
          const refreshed = await refreshUnlockedItem(String(itemToUnlock.data.id), itemToUnlock.type);
          if (refreshed) setSelectedItem((cur) => (cur && String(cur.data.id) === String(itemToUnlock.data.id) ? refreshed : cur));
        } catch (e) {
          console.warn("Unlock after purchase failed:", e);
        }
      }
      await syncPlanFromServer();
    })();

    // Save directly to user-keyed localStorage immediately so it persists across sessions
    try {
      const userKey = getUserStorageKey();
      const allUserData: any = getFromLocalStorage('setmystay_user_data', {});
      const currentUserData = allUserData[userKey] || {};
      const prevUnlocks = currentUserData.unlocks || {};
      const newUnlockedIds = Array.from(new Set([
        ...(prevUnlocks.unlockedIds || []),
        ...(itemToUnlock?.data.id ? [itemToUnlock.data.id] : [])
      ]));

      const updatedUnlocks = {
        count: isUnlimited ? (prevUnlocks.count || 0) : ((prevUnlocks.count || 0) + (typeof plan === 'number' ? plan : 0)),
        isUnlimited: isUnlimited ? true : (prevUnlocks.isUnlimited || false),
        unlimitedExpiresAt: isUnlimited ? expiryISO : (prevUnlocks.unlimitedExpiresAt || null),
        unlockedIds: newUnlockedIds,
      };

      saveToLocalStorage('setmystay_user_data', {
        ...allUserData,
        [userKey]: {
          ...currentUserData,
          unlocks: updatedUnlocks,
        },
      });
    } catch (e) {
      console.error("Failed to save unlocks immediately:", e);
    }

    const newPurchase: Purchase = { id: `purchase_${Date.now()}`, planName, amount, date: new Date() };

    setPurchaseHistory(currentHistory => {
        const updated = [newPurchase, ...currentHistory];
        try {
          localStorage.setItem('setmystay_purchase_history', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return updated;
    });

    toast({
      title: "Purchase Successful!",
      description: isUnlimited ? "You now have unlimited unlocks for 30 days." : `You've added ${plan} unlocks.`,
      variant: "default",
    });

    setTimeout(() => {
        if (itemToUnlock) {
            setSelectedItem(itemToUnlock);
            setItemToUnlock(null);
        } else {
            setRateUsModalOpen(true);
        }
    }, 400);
  }, [toast, itemToUnlock, applyServerPlan, syncPlanFromServer, refreshUnlockedItem]);

  const handleViewDetails = (item: AnyListing, type: 'listing' | 'roommate') => {
    setSelectedItem({ type, data: item });
  };
  
  const handleConfirmUnlock = async () => {
    setUnlockConfirmationOpen(false);
    if (!selectedItem?.data.id) return;
    const item = selectedItem;
    try {
      const plan = await unlockListingApi(String(item.data.id));
      if (plan) {
        applyServerPlan(plan);
        toast({
          title: "Details Unlocked!",
          description: plan.is_unlimited
            ? `Ultimate Plan: ${getSubscriptionRemainingText(plan.unlimited_expires_at)} left in your subscription month.`
            : `You have ${plan.credits_left} unlock credit${plan.credits_left === 1 ? '' : 's'} remaining.`,
        });
      }
      const refreshed = await refreshUnlockedItem(String(item.data.id), item.type);
      setSelectedItem(refreshed || { type: item.type, data: item.data });
    } catch (e: any) {
      if (e?.noCredits) {
        applyServerPlan(e.plan);
        toast({ title: "No unlocks left", description: "Please choose a plan to unlock this listing." });
        setItemToUnlock(item);
        setSelectedItem(null);
        setUnlockModalOpen(true);
      } else {
        toast({ title: "Could not unlock", description: "Please check your internet and try again.", variant: "destructive" });
      }
    }
  };

  const handleUnlockClick = () => {
    if (!isLoggedIn) {
        setAuthActionRequired('unlock details');
        return;
    }
    if (selectedItem) {
        const isUnlimitedActive = unlocks.isUnlimited && 
          (!unlocks.unlimitedExpiresAt || new Date(unlocks.unlimitedExpiresAt).getTime() > Date.now());

        if (isUnlimitedActive || unlocks.count > 0) {
            setUnlockConfirmationOpen(true);
        } else {
            setItemToUnlock(selectedItem);
            setSelectedItem(null); 
            setUnlockModalOpen(true);
        }
    }
  };
  
  const handleToggleLike = async (itemId: string) => {
    if (!isLoggedIn) {
        setAuthActionRequired('like items');
        return;
    }
    
    const wantLiked = !likedItemIds.has(itemId);
    setLikedItemIds(currentSet => {
        const newSet = new Set(currentSet);
        if (wantLiked) newSet.add(itemId); else newSet.delete(itemId);
        return newSet;
    });

    try {
        await setFavorite(itemId, wantLiked);
    } catch (error) {
        toast({ title: "Error", description: "Could not save your like. Please try again.", variant: "destructive" });
        setLikedItemIds(currentSet => {
            const newSet = new Set(currentSet);
            if (wantLiked) newSet.delete(itemId); else newSet.add(itemId);
            return newSet;
        });
    }
  };

  const handleInitiateListing = (data: any) => {
    if (!isLoggedIn) {
        setAuthActionRequired('list a property');
        return;
    }
    setPendingListingData(data);
    setListPaymentModalOpen(true);
  };

  const handleListProperty = async () => {
    if (!pendingListingData) return;
    setListPaymentModalOpen(false);
    
    let partialAddress = `${pendingListingData.locality}, ${pendingListingData.city}`;
    if (pendingListingData.sector) {
      partialAddress = `${pendingListingData.sector}, ${pendingListingData.locality}, ${pendingListingData.city}`;
    }

    try {
        const formData = new FormData();
        formData.append('title', pendingListingData.title || pendingListingData.ownerName);
        formData.append('owner_name', pendingListingData.ownerName);
        formData.append('rent', pendingListingData.rent.toString());
        formData.append('city', pendingListingData.city);
        formData.append('area', pendingListingData.locality);
        formData.append('address', pendingListingData.address);
        formData.append('phone_primary', pendingListingData.phonePrimary);
        
        if (pendingListingData.phoneSecondary) {
            formData.append('phone_secondary', pendingListingData.phoneSecondary);
        }
        if (pendingListingData.description) {
            formData.append('description', pendingListingData.description);
        }

        if ('propertyType' in pendingListingData && pendingListingData.propertyType !== 'Roommate') {
            formData.append('property_type', pendingListingData.propertyType === 'Rental' ? 'RENTAL' : 'PG');
            formData.append('sq_ft', pendingListingData.area?.toString() || '0');
            formData.append('is_broker', pendingListingData.brokerStatus === 'broker' ? 'true' : 'false');
            
            if (pendingListingData.amenities) {
                const amenitiesString = Array.isArray(pendingListingData.amenities) 
                    ? pendingListingData.amenities.join(',') 
                    : pendingListingData.amenities;
                formData.append('amenities_list', amenitiesString);
            }
        } else {
            formData.append('property_type', 'ROOMMATE');
            formData.append('budget', pendingListingData.rent.toString());
            formData.append('location_preference', partialAddress);
        }

        if (pendingListingData.images) {
            pendingListingData.images.forEach((file: File) => {
                formData.append(`uploaded_images`, file);
            });
        }
        if (pendingListingData.aadhaarCard) formData.append('document_aadhaar', pendingListingData.aadhaarCard);
        if (pendingListingData.electricityBill) formData.append('document_electricity', pendingListingData.electricityBill);
        if (pendingListingData.noc) formData.append('document_noc', pendingListingData.noc);

        await createListing(formData);
        syncUserListsFromServer();

        setPendingListingData(null);
        toast({
          title: "Listing Submitted for Review!",
          description: "Your property has been sent to our staff for verification.",
        });
        
        setTimeout(() => setRateUsModalOpen(true), 500);
    } catch (error) {
        console.error("Failed to submit listing to Django:", error);
        toast({
            title: "Submission Failed",
            description: "There was an error connecting to the server. Please try again.",
            variant: "destructive"
        });
    }
  };
  
  const handleChat = (name: string) => {
    setChattingWith(name);
    setSelectedItem(null); 
    setChatModalOpen(true);
  };

  const handleBookInquiry = (listing: Listing, bed: Bed) => {
    setInquiryData({ listing, bed });
    setIsBookingModalOpen(true);
    setSelectedItem(null); 
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setAuthActionRequired(null);
    saveToLocalStorage('setmystay_isLoggedIn', true);
    
    const intendedPage = sessionStorage.getItem('setmystay_intended_page');
    if (intendedPage === 'list') {
      sessionStorage.removeItem('setmystay_intended_page');
      window.location.href = '/list-property';
      return;
    }
    if (intendedPage === 'list-roommate') {
      sessionStorage.removeItem('setmystay_intended_page');
      window.location.href = '/?page=list-roommate';
      return;
    }
    window.location.reload();
  };

  const handleLogout = () => {
    isLoggingOutRef.current = true;
    setIsLoggedIn(false);
    saveToLocalStorage('setmystay_isLoggedIn', false);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_phone');
    localStorage.removeItem('user_address');
    localStorage.removeItem('user_pic');
    localStorage.removeItem('setmystay_purchase_history');
    localStorage.removeItem('setmystay_user_data');
    setUnlocks(defaultUserState.unlocks);
    setLikedItemIds(new Set());
    setActivePage('home');
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    window.location.reload();
  };
  
  const handleOpenConfirmationModal = (planName: string, amount: number, onConfirm: () => void) => {
    setPaymentDetails({ planName, amount, onConfirm });
    setIsPaymentConfirmationOpen(true);
  };

  const handleConfirmPayment = () => {
    if (paymentDetails) {
        paymentDetails.onConfirm();
    }
    setIsPaymentConfirmationOpen(false);
    setPaymentDetails(null);
  };

  const handleCouponWin = (coupon: Coupon) => {
    toast({
        title: "🎉 You Won a Coupon! 🎉",
        description: `Code: ${coupon.code} (${coupon.discountPercentage}% off). It has been copied to your clipboard!`,
    });
    navigator.clipboard.writeText(coupon.code);
  };

  // 👇 FIXED: Directly activates plan without popping up the confirmation modal a second time!
  const handlePlanSelect = (plan: { plan: UnlockPlan, title: string, price: number }) => {
    setUnlockModalOpen(false);
    setIsPaymentConfirmationOpen(false);
    handleUnlockPurchase(plan.plan, plan.title, plan.price);
  };

  const handleNavigationWithAuth = (page: Page) => {
      if (page === 'list') {
          if (!isLoggedIn) { setAuthActionRequired('list your property'); return; }
          window.location.href = '/list-property'; 
          return;
      }
      if (page === 'list-roommate') {
          if (!isLoggedIn) { setAuthActionRequired('list yourself as a roommate'); return; }
          setEditingRoommateId(null);
      }
      handleNavigate(page);
  };
  
  const handleGameClick = () => {
    if (!isLoggedIn) {
      setAuthActionRequired('play the game');
    } else {
      setIsSlotMachineModalOpen(true);
    }
  };

  const handleOpenPolicy = (tab: PolicyTab) => {
    setPolicyModalTab(tab);
    setIsPolicyModalOpen(true);
  };

  if (!isClient) {
    // Server-sent homepage (readable by Google, link previews and AI tools). Replaced by the
    // real, clickable page the moment the browser is ready; listings load in the background.
    return <HomeStaticShell />;
  }
  
  const getListingsForPage = () => {
    switch (activePage) {
        case 'pg':
            return allListings.filter(l => l.propertyType === 'PG');
        case 'rentals':
            return allListings.filter(l => l.propertyType === 'Rental');
        case 'roommates':
            return allRoommates;
        case 'my-properties':
            return myProperties;
        case 'liked-properties':
            return likedItems;
        default:
            return [];
    }
  };
  
  const getPageType = (): ListingType => {
      if (['pg', 'rentals'].includes(activePage)) return activePage as ListingType;
      if (activePage === 'roommates') return 'roommate';
      if (activePage === 'my-properties' || activePage === 'liked-properties') return 'rentals'; 
      return 'rentals';
  };

  return (
    <div className="flex flex-col min-h-screen bg-background font-body text-foreground">
      <Header 
        activePage={activePage} 
        setActivePage={handleNavigationWithAuth} 
        onSignInClick={() => setAuthModalOpen(true)}
        onSubscriptionClick={() => {
          setItemToUnlock(null); 
          setUnlockModalOpen(true);
        }}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        onHistoryClick={() => setHistoryModalOpen(true)}
      />
      
      <main key={activePage} className={`flex-grow ${hasNavigated ? "animate-page-in" : ""} ${activePage === "home" ? "" : "pt-24"}`}>
        {activePage === 'home' && (
          <HomeSection 
            featuredProperties={featuredProperties} 
            featuredPGs={featuredPGs}
            featuredRoommates={featuredRoommates} 
            allRoommates={allRoommates}
            onViewDetails={handleViewDetails}
            onNavigate={handleNavigationWithAuth}
            likedItemIds={likedItemIds}
            onToggleLike={handleToggleLike}
            unlockedIds={unlocks.unlockedIds}
            isLoadingData={isLoading}
          />
        )}
        {activePage === 'for-sale' && <ForSaleSection />}
        {activePage === 'list-roommate' && isLoggedIn && (
          <ListRoommateSection
            key={editingRoommateId || 'new'}
            editId={editingRoommateId}
            onDone={(what) => {
              setEditingRoommateId(null);
              if (what !== 'cancel') syncUserListsFromServer();
              handleNavigate('my-properties');
            }}
          />
        )}
        {isLoading && (['pg', 'rentals', 'roommates', 'my-properties', 'liked-properties'].includes(activePage)) && (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground">
            <LoadingSpinner className="h-10 w-10 text-primary" />
            <p>Loading listings…</p>
          </div>
        )}
        {!isLoading && (['pg', 'rentals', 'roommates', 'my-properties', 'liked-properties'].includes(activePage)) && (
            <ListingsSection
              key={activePage} 
              type={getPageType()}
              listings={getListingsForPage()}
              onViewDetails={handleViewDetails}
              initialSearchFilters={null}
              likedItemIds={likedItemIds}
              onToggleLike={handleToggleLike}
              unlockedIds={unlocks.unlockedIds}
              pageTitle={
                activePage === 'my-properties' ? 'My Properties' :
                activePage === 'liked-properties' ? 'My Liked Properties' :
                undefined
              }
              showOwnerStatus={activePage === 'my-properties'}
              onEditItem={activePage === 'my-properties' ? (item) => {
                if ((item.propertyType as string)?.toLowerCase() === 'roommate') {
                  setEditingRoommateId(String(item.id));
                  handleNavigate('list-roommate');
                } else {
                  setEditingListingId(String(item.id));
                }
              } : undefined}
            />
        )}
      </main>

      <Footer onNavigate={(page) => { handleNavigationWithAuth(page); if (page !== 'list') scrollPageToTop(); }} onOpenPolicy={handleOpenPolicy} />
      <FloatingCta onGameClick={handleGameClick} />
      <ContactFab />
      
      {/* Modals */}
      <PropertyDetails 
        listing={selectedItem?.type === 'listing' ? selectedItem.data as Listing : null}
        onClose={() => setSelectedItem(null)}
        isUnlocked={isLoggedIn && selectedItem?.data ? unlocks.unlockedIds.has(selectedItem.data.id) : false}
        onUnlock={handleUnlockClick}
        onChat={() => handleChat(selectedItem?.data?.ownerName || 'Owner')}
        onBookInquiry={handleBookInquiry}
      />
      <RoommateDetails
        profile={selectedItem?.type === 'roommate' ? selectedItem.data as RoommateProfile : null}
        onClose={() => setSelectedItem(null)}
        isUnlocked={isLoggedIn && selectedItem?.data ? unlocks.unlockedIds.has(selectedItem.data.id) : false}
        onUnlock={handleUnlockClick}
        onChat={() => handleChat(selectedItem?.data?.ownerName || 'Roommate')}
      />
      <AlertDialog open={isUnlockConfirmationOpen} onOpenChange={setUnlockConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Unlock</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-1 text-sm">
              {unlocks.isUnlimited && (!unlocks.unlimitedExpiresAt || new Date(unlocks.unlimitedExpiresAt).getTime() > Date.now()) ? (
                <>
                  <span>You have the <strong>Ultimate Subscription</strong> active with unlimited unlocks.</span>
                  <br />
                  <span className="font-semibold text-primary inline-block mt-1">
                    {getSubscriptionRemainingText(unlocks.unlimitedExpiresAt)} left in your subscription month.
                  </span>
                </>
              ) : (
                <>
                  <span>This will use one of your unlock credits. This action cannot be undone.</span>
                  <br />
                  <span className="font-semibold text-foreground inline-block mt-1">
                    You have {unlocks.count} unlock credit{unlocks.count === 1 ? '' : 's'} remaining.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUnlock}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <UnlockDetailsModal 
        isOpen={isUnlockModalOpen}
        onClose={(proceedingToPayment?: boolean) => {
            setUnlockModalOpen(false);
            if (!proceedingToPayment && itemToUnlock) {
                setSelectedItem(itemToUnlock);
                setItemToUnlock(null);
            }
        }}
        onPlanSelect={handlePlanSelect}
        onNavigateToListProperty={(kind) => {
          setUnlockModalOpen(false);
          handleNavigationWithAuth(kind === 'roommate' ? 'list-roommate' : 'list');
        }}
        pricing={pricing}
        planState={isLoggedIn ? { isUnlimited: !!unlocks.isUnlimited, unlimitedExpiresAt: unlocks.unlimitedExpiresAt ?? null, creditsLeft: unlocks.count || 0 } : undefined}
        onRequireSignIn={() => setAuthActionRequired('buy a plan')}
        autoPurchase={autoPurchase}
        onAutoPurchaseHandled={() => setAutoPurchase(null)}
      />
      <EditListingDialog
        open={!!editingListingId}
        listingId={editingListingId}
        onClose={() => setEditingListingId(null)}
        onSaved={() => { setEditingListingId(null); syncUserListsFromServer(); }}
      />
      <ListPropertyPaymentModal
        isOpen={isListPaymentModalOpen}
        onClose={() => setListPaymentModalOpen(false)}
        propertyId={pendingListingData?.id || ''}
        amount={feeFor(pendingListingData && 'propertyType' in pendingListingData ? pendingListingData.propertyType : 'ROOMMATE')}
        listingType={pendingListingData && 'propertyType' in pendingListingData ? String(pendingListingData.propertyType) : 'ROOMMATE'}
        onProceedToPayment={handleListProperty}
        pricing={pricing}
      />
      <WelcomeProfileModal isLoggedIn={isLoggedIn} />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
            setAuthModalOpen(false);
            setAuthActionRequired(null);
            // Closed without signing in: forget the plan they were about to buy / the page they wanted
            if (!localStorage.getItem('access_token')) {
              sessionStorage.removeItem(PENDING_PURCHASE_KEY);
              sessionStorage.removeItem('setmystay_intended_page');
            }
        }}
        onLoginSuccess={handleLoginSuccess}
      />
      <ChatModal
        isOpen={isChatModalOpen}
        onClose={() => setChatModalOpen(false)}
        contactName={chattingWith}
      />
      <HistoryModal 
        isOpen={isHistoryModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        purchases={purchaseHistory}
      />
      <RateUsModal 
        isOpen={isRateUsModalOpen}
        onClose={handleRateUsClose}
      />
      <BookingInquiryModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        listing={inquiryData?.listing || null}
        bed={inquiryData?.bed || null}
      />
      <AdvertisementModal
        isOpen={isAdModalOpen}
        onClose={() => setIsAdModalOpen(false)}
        title={adToShow?.title || ''}
        description={adToShow?.description || ''}
        imageUrl={adToShow?.imageUrl || ''}
        couponCodes={(adToShow?.couponCodes || []).filter(code => activeCoupons.some(c => c.code === code && c.isActive))}
      />
      <PaymentConfirmationModal
        isOpen={isPaymentConfirmationOpen}
        onClose={() => setIsPaymentConfirmationOpen(false)}
        onConfirm={handleConfirmPayment}
        planName={paymentDetails?.planName || ''}
        amount={paymentDetails?.amount || 0}
        availableCoupons={activeCoupons}
      />
      <SlotMachineModal
        isOpen={isSlotMachineModalOpen}
        onClose={() => setIsSlotMachineModalOpen(false)}
        prizes={activeCoupons.filter(c => c.isActive)}
        onWin={handleCouponWin}
      />
      <PolicyModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        defaultTab={policyModalTab}
      />
    </div>
  );
}