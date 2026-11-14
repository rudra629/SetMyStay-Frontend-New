import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SetMyStay — Find Your Perfect Living Space" },
      { name: "description", content: "Browse PGs, rentals and roommate listings. Unlock owner contact details, list your property, and find your perfect living space with SetMyStay." },
      { property: "og:title", content: "SetMyStay — Find Your Perfect Living Space" },
      { property: "og:description", content: "Browse PGs, rentals and roommate listings. Unlock owner contact details, list your property, and find your perfect living space with SetMyStay." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

import React, { useState, useEffect, useCallback } from "react";
import type { Listing, RoommateProfile, Page, ListingType, UnlockPlan, Bed, Advertisement, Coupon, Purchase, AnyListing, PricingData } from "@/lib/types";
import { defaultPricing, dummyProperties, dummyRoommates } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { getProperties, getRoommates, toggleFavoriteProperty, getCoupons, getAdvertisements, createListing, listingToRoommateProfile } from "@/lib/api";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HomeSection } from "@/components/sections/home-section";
import { ListingsSection } from "@/components/sections/listings-section";

import { PropertyDetails } from "@/components/modals/property-details";
import { RoommateDetails } from "@/components/modals/roommate-details";
import { UnlockDetailsModal } from "@/components/modals/unlock-details-modal";
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

function Home() {
  const [activePage, setActivePage] = useState<Page>("home");
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [allRoommates, setAllRoommates] = useState<RoommateProfile[]>([]);
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [featuredProperties, setFeaturedProperties] = useState<Listing[]>([]);
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

  const [adToShow, setAdToShow] = useState<Advertisement | null>(null);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);

  const [isPaymentConfirmationOpen, setIsPaymentConfirmationOpen] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{ planName: string; amount: number; onConfirm: () => void; } | null>(null);

  const [isSlotMachineModalOpen, setIsSlotMachineModalOpen] = useState(false);
  const [isUnlockConfirmationOpen, setUnlockConfirmationOpen] = useState(false);
  const [activeCoupons, setActiveCoupons] = useState<Coupon[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

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

          const shuffledListings = [...(realProperties.length > 0 ? realProperties : dummyProperties)].sort(() => 0.5 - Math.random());
          const shuffledRoommates = [...realRoommates].sort(() => 0.5 - Math.random());
          setFeaturedProperties(shuffledListings.slice(0, 3));

          const withProp = shuffledRoommates.filter(r => r.hasProperty);
          setFeaturedRoommates(withProp.length > 0 ? withProp.slice(0, 6) : shuffledRoommates.slice(0, 6));

          const liveCoupons = await getCoupons();
          setActiveCoupons(liveCoupons);

          const liveAds = await getAdvertisements();
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
      
      const allUserData: any = getFromLocalStorage('setmystay_user_data', {});
      const userData = loggedInStatus ? (allUserData.defaultUser || defaultUserState) : defaultUserState;
      
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

      setUnlocks({
          count: userData.unlocks?.count || 0,
          isUnlimited: isUnlimited,
          unlimitedExpiresAt: unlimitedExpiresAt,
          unlockedIds: new Set(userData.unlocks?.unlockedIds || []),
      });
      
      const currentLikedIds = new Set<string>(userData.likedItemIds || []);
      setLikedItemIds(currentLikedIds);
    }
  }, [isClient]);

  const saveUserData = useCallback(() => {
    if (isLoggedIn && isClient) {
      const allUserData: any = getFromLocalStorage('setmystay_user_data', {});
      const currentUserData = allUserData.defaultUser || {};
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
      saveToLocalStorage('setmystay_user_data', { defaultUser: updatedData });
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
    }
  }, [authActionRequired, toast]);

  useEffect(() => {
    const allAvailableItems = [...allListings, ...allRoommates];
    const newlyLikedItems = allAvailableItems.filter(item => likedItemIds.has(item.id));
    setLikedItems(newlyLikedItems);
  }, [likedItemIds, allListings, allRoommates]);

  const handleNavigate = (page: Page) => {
    setActivePage(page);
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    (window as unknown as { __lenis?: { scrollTo: (t: number, o: object) => void } }).__lenis?.scrollTo(0, { immediate: true });
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

    // Save directly to localStorage immediately so it persists and is live across the app
    try {
      const allUserData: any = getFromLocalStorage('setmystay_user_data', {});
      const currentUserData = allUserData.defaultUser || {};
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
        defaultUser: {
          ...currentUserData,
          unlocks: updatedUnlocks,
        }
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
  }, [toast, itemToUnlock]);

  const handleViewDetails = (item: AnyListing, type: 'listing' | 'roommate') => {
    setSelectedItem({ type, data: item });
  };
  
  const handleConfirmUnlock = () => {
    if (selectedItem?.data.id) {
      if (useUnlock(selectedItem.data.id)) {
        handleViewDetails(selectedItem.data, selectedItem.type);
      }
    }
    setUnlockConfirmationOpen(false);
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
    
    setLikedItemIds(currentSet => {
        const newSet = new Set(currentSet);
        if (newSet.has(itemId)) {
            newSet.delete(itemId);
        } else {
            newSet.add(itemId);
        }
        return newSet;
    });

    try {
        await toggleFavoriteProperty(itemId);
    } catch (error) {
        toast({ title: "Error", description: "Failed to save favorite.", variant: "destructive" });
        setLikedItemIds(currentSet => {
            const newSet = new Set(currentSet);
            newSet.has(itemId) ? newSet.delete(itemId) : newSet.add(itemId);
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
      setActivePage('list');
      sessionStorage.removeItem('setmystay_intended_page');
    }
    window.location.reload();
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    saveToLocalStorage('setmystay_isLoggedIn', false);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_phone');
    localStorage.removeItem('user_address');
    localStorage.removeItem('user_pic');
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
          window.location.href = '/list-property'; 
          return;
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

  if (isLoading || !isClient) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
        <LoadingSpinner className="w-16 h-16 text-primary" />
        <p className="mt-4 text-lg font-semibold text-foreground">Loading SetMyStay...</p>
      </div>
    );
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
      
      <main key={activePage} className={`flex-grow animate-page-in ${activePage === "home" ? "" : "pt-24"}`}>
        {activePage === 'home' && (
          <HomeSection 
            featuredProperties={featuredProperties} 
            featuredRoommates={featuredRoommates} 
            allRoommates={allRoommates}
            onViewDetails={handleViewDetails}
            onNavigate={handleNavigationWithAuth}
            likedItemIds={likedItemIds}
            onToggleLike={handleToggleLike}
            unlockedIds={unlocks.unlockedIds}
          />
        )}
        {(['pg', 'rentals', 'roommates', 'my-properties', 'liked-properties'].includes(activePage)) && (
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
            />
        )}
      </main>

      <Footer onNavigate={handleNavigate} />
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
        onNavigateToListProperty={() => {
          setUnlockModalOpen(false);
          handleNavigationWithAuth('list');
        }}
        pricing={pricing}
      />
      <ListPropertyPaymentModal
        isOpen={isListPaymentModalOpen}
        onClose={() => setListPaymentModalOpen(false)}
        propertyId={pendingListingData?.id || ''}
        amount={feeFor(pendingListingData && 'propertyType' in pendingListingData ? pendingListingData.propertyType : 'ROOMMATE')}
        onProceedToPayment={handleListProperty}
        pricing={pricing}
      />
      <WelcomeProfileModal isLoggedIn={isLoggedIn} />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
            setAuthModalOpen(false);
            setAuthActionRequired(null);
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
    </div>
  );
}