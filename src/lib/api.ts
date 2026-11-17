import axios from 'axios';
import { Listing, RoommateProfile } from './types'; 
import { DEMO_MODE, demoAdapter } from './demo-backend';

// Changed to localhost to match your Google OAuth fix!
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  ...(DEMO_MODE ? { adapter: demoAdapter } : {}),
});

// TEMPORARY: also answer plain axios calls (e.g. payment verification) in demo mode.
if (DEMO_MODE) axios.defaults.adapter = demoAdapter;

// --- 🔐 WHICH LOGIN TO USE ---
// The admin/staff panels keep their login separate from the main site's login.
// (Before, signing in to the admin panel silently turned the main site into the
// "admin" account in that browser, so listings and likes were saved to the wrong account.)
export const isPanelPage = () =>
  typeof window !== 'undefined' && /^\/(admin|staff)(\/|$)/.test(window.location.pathname);
export const accessKey = () => (isPanelPage() ? 'panel_access_token' : 'access_token');
export const refreshKey = () => (isPanelPage() ? 'panel_refresh_token' : 'refresh_token');
type Slot = 'panel' | 'site';
const slotKeys = (slot: Slot) => slot === 'panel'
  ? { access: 'panel_access_token', refresh: 'panel_refresh_token' }
  : { access: 'access_token', refresh: 'refresh_token' };

// --- 🔐 AUTHENTICATION INTERCEPTOR ---
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      // A request may pin its login slot ('panel' or 'site'); otherwise it follows the current page.
      // Remember which login this request used, so a renewal is saved back to that same login
      // (even if the page changed meanwhile, e.g. admin panel -> main site).
      const slot: Slot = ((config as any)._slot as Slot) || ((config as any).authSlot as Slot) || (isPanelPage() ? 'panel' : 'site');
      (config as any)._slot = slot;
      const token = localStorage.getItem(slotKeys(slot).access);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- ADAPTERS ---
const adaptPropertyToListing = (data: any): Listing => {
  const rawType = (data.property_type || '').toUpperCase();
  let mappedType = 'PG';
  if (rawType === 'RENTAL') mappedType = 'Rental';
  if (rawType === 'ROOMMATE') mappedType = 'Roommate';

  const rawImages = Array.isArray(data.images) ? data.images : [];
  const videoObj = rawImages.find((img: any) => typeof img === 'object' && img?.is_video);
  const videoUrl = videoObj ? videoObj.image_url : (data.video_url || undefined);
  const imageUrls = rawImages.map((img: any) => typeof img === 'string' ? img : img.image_url).filter(Boolean);

  return {
    id: data.id.toString(),
    propertyType: mappedType as any, 
    title: data.title,
    rent: data.rent,
    area: data.sq_ft || 0,
    city: data.city,
    locality: data.area,
    state: data.state || 'Maharashtra',
    completeAddress: data.address,
    partialAddress: data.area,
    ownerName: data.owner_name || 'Owner',
    contactPhonePrimary: data.phone_primary || 'Hidden',
    contactPhoneSecondary: data.phone_secondary || undefined,
    description: data.description,
    furnishedStatus: data.furnishing || 'Unfurnished',
    bhk: data.bhk || undefined,
    roomType: data.occupancy_type || undefined,
    genderPreference: data.gender_preference || undefined,
    
    // 👇 FIX: Regex strips the [, ], and " characters from the corrupted database strings
    amenities: data.amenities ? data.amenities.map((a: any) => typeof a === 'string' ? a.replace(/[\[\]"]/g, '').trim() : (a.name || '').replace(/[\[\]"]/g, '').trim()).filter(Boolean) : [],
    
    size: data.sq_ft ? `${data.sq_ft} sq ft` : 'N/A',
    images: imageUrls,
    videoUrl: videoUrl,
    views: 0,
    ownerId: data.owner?.toString() || '1',
    brokerStatus: data.is_broker ? 'With Broker' : 'Without Broker', 
    vendorNumber: data.vendor_number || data.vendorNumber || undefined,
    age: data.age ? Number(data.age) : undefined,
    sharingStatus: data.sharing_status || undefined,

    aadhaarCardUrl: data.document_aadhaar || undefined,
    electricityBillUrl: data.document_electricity || undefined,
    nocUrl: data.document_noc || undefined,
    
    lastAvailabilityCheck: data.created_at,
    submittedAt: data.created_at,
    status: data.status === 'APPROVED' ? 'approved' : data.status === 'REJECTED' ? 'rejected' : 'pending',
  };
};

export const listingToRoommateProfile = (listing: Listing): RoommateProfile => {
  const isLookingForProperty =
    listing.sharingStatus === 'Moving soon' ||
    listing.sharingStatus === 'Looking for property' ||
    (listing as any).has_property === false ||
    (listing as any).hasProperty === false;

  return {
    id: listing.id,
    propertyType: 'Roommate',
    ownerName: listing.ownerName || listing.title,
    age: listing.age || (listing as any).age || undefined, // no made-up age when the person didn't give one
    rent: listing.rent,
    city: listing.city,
    locality: listing.locality,
    state: listing.state || 'Maharashtra',
    completeAddress: listing.completeAddress || listing.partialAddress || '',
    partialAddress: listing.partialAddress || listing.completeAddress || '',
    contactPhonePrimary: listing.contactPhonePrimary,
    contactPhoneSecondary: listing.contactPhoneSecondary,
    contactEmail: listing.contactEmail,
    description: listing.description || `Looking for roommate in ${listing.locality}`,
    preferences: listing.amenities || [],
    gender: (listing as any).genderPreference || (listing as any).gender_preference || 'Any',
    images: listing.images?.length ? listing.images : ['https://placehold.co/400x400'],
    videoUrl: listing.videoUrl,
    views: listing.views || 0,
    ownerId: listing.ownerId || '1',
    vendorNumber: listing.vendorNumber,
    aadhaarCardUrl: listing.aadhaarCardUrl,
    electricityBillUrl: listing.electricityBillUrl,
    nocUrl: listing.nocUrl,
    hasProperty: isLookingForProperty ? false : true,
    status: listing.status as any,
    submittedAt: listing.submittedAt,
  };
};

const adaptRoommateToProfile = (data: any): RoommateProfile => {
  return {
    id: data.id.toString(),
    propertyType: 'Roommate',
    ownerName: data.user_name || data.owner_name || 'User',
    age: data.age || undefined,
    rent: data.budget || data.rent || 0,
    city: data.city || data.location_preference || '',
    locality: data.location_preference || data.area || '',
    state: data.state || 'Maharashtra',
    completeAddress: data.location_preference || data.address || '',
    partialAddress: data.location_preference || data.area || '',
    contactPhonePrimary: data.phone_primary || 'Hidden',
    contactPhoneSecondary: data.phone_secondary || undefined,
    description: data.bio || data.description || `Looking for roommate in ${data.location_preference || data.area || ''}`,
    preferences: data.preferences || [
        data.is_smoker ? 'Smoker' : 'Non-Smoker', 
        data.has_pets ? 'Has Pets' : 'No Pets'
    ],
    gender: data.gender || data.gender_preference || 'Any',
    images: Array.isArray(data.images) ? data.images.map((img: any) => typeof img === 'string' ? img : img.image_url) : [data.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2e?w=800&q=80'],
    videoUrl: data.video_url || undefined,
    views: 0,
    ownerId: data.user?.toString() || data.owner?.toString() || '1',
    vendorNumber: data.vendor_number || undefined,
    aadhaarCardUrl: data.document_aadhaar || data.aadhaarCardUrl || undefined,
    electricityBillUrl: data.document_electricity || data.electricityBillUrl || undefined,
    nocUrl: data.document_noc || data.nocUrl || undefined,
    hasProperty: !!data.has_property,
    submittedAt: data.created_at || '2025-01-01',
    status: data.status === 'APPROVED' ? 'approved' : data.status === 'REJECTED' ? 'rejected' : 'pending',
  };
};

// --- API CALLS ---
/**
 * The backend returns lists in pages (10 items by default). This fetches every page,
 * so no listing, coupon, purchase, etc. is silently left out.
 */
export async function getAllPages(path: string): Promise<any[]> {
  const sep = path.includes('?') ? '&' : '?';
  const all: any[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data } = await api.get(`${path}${sep}page=${page}&page_size=100`);
    if (Array.isArray(data)) return data; // endpoint is not paginated
    all.push(...(data?.results || []));
    if (!data?.next) break;
  }
  return all;
}

export const getProperties = async (): Promise<Listing[]> => {
  try {
    const rawData = await getAllPages('/properties/');
    return rawData.map(adaptPropertyToListing);
  } catch (error) {
    console.error("Failed to fetch properties:", error);
    return [];
  }
};

/** Fetch one listing again (e.g. right after unlocking, to receive the owner's contact details). */
export const getPropertyById = async (id: string): Promise<Listing | null> => {
  try {
    const response = await api.get(`/properties/${id}/`);
    return adaptPropertyToListing(response.data);
  } catch (error) {
    console.warn("Failed to refresh property:", error);
    return null;
  }
};

export const getAdminProperties = async (): Promise<Listing[]> => {
  try {
    const rawData = await getAllPages('/properties/?admin=true');
    return rawData.map(adaptPropertyToListing);
  } catch (error) {
    console.error("Failed to fetch admin properties:", error);
    return [];
  }
};

export const getRoommateProperties = async (): Promise<Listing[]> => {
  try {
    const rawData = await getAllPages('/properties/?property_type=ROOMMATE');
    return rawData.map(adaptPropertyToListing);
  } catch (error) {
    console.error("Failed to fetch roommate properties:", error);
    return [];
  }
};

export const getRoommates = async (): Promise<RoommateProfile[]> => {
  try {
    const rawData = await getAllPages('/roommates/');
    return rawData.map(adaptRoommateToProfile);
  } catch (error) {
    console.error("Failed to fetch roommates:", error);
    return [];
  }
};

export const createListing = async (formData: FormData) => {
  const response = await api.post('/properties/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const loginUser = async (credentials: { username: string; password: string }) => {
    const response = await api.post('/auth/login/', credentials);
    if (response.data.access) {
      localStorage.setItem(accessKey(), response.data.access);
      localStorage.setItem(refreshKey(), response.data.refresh);
    }
    return response.data;
};

export const toggleFavoriteProperty = async (propertyId: string) => {
  try {
    const response = await api.post(`/properties/${propertyId}/toggle_favorite/`);
    return response.data;
  } catch (error) {
    console.error("Failed to toggle favorite:", error);
    throw error;
  }
};

/** IDs of listings the logged-in user liked (stored on the server). */
export const getMyFavoriteIds = async (): Promise<string[]> => {
  const { data } = await api.get('/my-favorites/');
  return (data?.ids || []).map(String);
};

/** Like / unlike a listing. Sends the exact state so repeated clicks can't get out of sync. */
export const setFavorite = async (propertyId: string, liked: boolean) => {
  const { data } = await api.post(`/properties/${propertyId}/toggle_favorite/`, { liked });
  return data;
};

export const getMyProperties = async (): Promise<Listing[]> => {
  try {
    const rawData = await getAllPages('/my-properties/');
    return rawData.map(adaptPropertyToListing);
  } catch (error) {
    console.error("Failed to fetch my properties:", error);
    return [];
  }
};

// --- STAFF PROPERTY & ROOMMATE MANAGEMENT ---
export const updatePropertyStatus = async (id: string, newStatus: string) => {
  try {
    const response = await api.post(`/properties/${id}/update_status/?admin=true`, { status: newStatus.toUpperCase() });
    return response.data;
  } catch (error) {
    console.error("Failed to update property status:", error);
    throw error;
  }
};

export const deleteProperty = async (id: string) => {
  try {
    const response = await api.delete(`/properties/${id}/?admin=true`);
    return response.data;
  } catch (error) {
    console.error("Failed to delete property:", error);
    throw error;
  }
};

export const updateRoommateStatus = async (id: string, newStatus: string) => {
  try {
    const response = await api.post(`/properties/${id}/update_status/?admin=true`, { status: newStatus.toUpperCase() });
    return response.data;
  } catch (error) {
    try {
      const fallback = await api.patch(`/roommates/${id}/`, { status: newStatus.toUpperCase() });
      return fallback.data;
    } catch {}
    console.error("Failed to update roommate status:", error);
    throw error;
  }
};

export const deleteRoommate = async (id: string) => {
  try {
    const response = await api.delete(`/properties/${id}/?admin=true`);
    return response.data;
  } catch (error) {
    try {
      const fallback = await api.delete(`/roommates/${id}/`);
      return fallback.data;
    } catch {}
    console.error("Failed to delete roommate:", error);
    throw error;
  }
};

// --- RESPONSE INTERCEPTOR (WITH AUTO-REFRESH) ---
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 Unauthorized, and we haven't tried to refresh yet
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const slot: Slot = originalRequest._slot || (isPanelPage() ? 'panel' : 'site');
      const keys = slotKeys(slot);
      try {
        const refreshToken = localStorage.getItem(keys.refresh);
        if (refreshToken) {
          // Request a new access token using standard axios (to avoid infinite interceptor loops)
          const refreshResponse = await axios.post(`${API_URL}/auth/refresh/`, {
            refresh: refreshToken,
          });

          const newAccessToken = refreshResponse.data.access;
          
          // Save the new token
          localStorage.setItem(keys.access, newAccessToken);
          
          // If the backend also rotated the refresh token, save that too
          if (refreshResponse.data.refresh) {
             localStorage.setItem(keys.refresh, refreshResponse.data.refresh);
          }

          // Update the failed request's header with the new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          
          // Retry the original request seamlessly
          return api(originalRequest);
        }
      } catch (refreshError) {
        // If the refresh token is ALSO expired, force a hard logout
        if (typeof window !== 'undefined') {
          const onAdminPage = isPanelPage();
          localStorage.removeItem(keys.access);
          localStorage.removeItem(keys.refresh);
          if (slot === 'panel' && !onAdminPage) {
            // A panel request finished after leaving the panel: sign out of the panel quietly
            localStorage.removeItem('admin_authenticated');
            localStorage.removeItem('staff_authenticated');
          } else if (onAdminPage) {
            localStorage.removeItem('admin_authenticated');
            localStorage.removeItem('staff_authenticated');
            window.location.href = window.location.pathname.startsWith('/staff') ? '/staff/login' : '/admin/login';
          } else {
            // Normal users: log out cleanly and stay on the main site
            localStorage.removeItem('setmystay_isLoggedIn');
            ['user_email', 'user_name', 'user_phone', 'user_address', 'user_pic',
             'setmystay_user_data', 'setmystay_purchase_history'].forEach((k) => localStorage.removeItem(k));
            window.location.href = '/';
          }
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// --- COUPON API ---
export const getCoupons = async () => {
  const raw = await getAllPages('/coupons/');
  return raw.map((c: any) => ({ ...c, discountPercentage: c.discount_percentage, isActive: c.is_active }));
};
export const createCoupon = async (data: any) => await api.post('/coupons/', { code: data.code, discount_percentage: data.discountPercentage, is_active: data.isActive });
export const updateCoupon = async (id: string, data: any) => await api.patch(`/coupons/${id}/`, { code: data.code, discount_percentage: data.discountPercentage, is_active: data.isActive });
export const deleteCoupon = async (id: string) => await api.delete(`/coupons/${id}/`);

// --- ADVERTISEMENT API ---
export const getAdvertisements = async () => {
  const raw = await getAllPages('/advertisements/');
  return raw.map((a: any) => ({
    ...a,
    isActive: a.is_active,
    couponCodes: String(a.coupon_codes || '').split(',').map((c: string) => c.trim()).filter(Boolean),
  }));
};
export const createAdvertisement = async (formData: FormData) => await api.post('/advertisements/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateAdvertisement = async (id: string, formData: FormData) => await api.patch(`/advertisements/${id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteAdvertisement = async (id: string) => await api.delete(`/advertisements/${id}/`);

// --- STAFF API ---
export const getStaff = async () => {
  const raw = await getAllPages('/staff/');
  return raw.map((s: any) => ({
    id: s.id.toString(),
    name: s.first_name || s.username, // Fallback to username if name is empty
    userId: s.username,
    approved_count: s.approved_count,
    rejected_count: s.rejected_count,
    avg_processing_hours: s.avg_processing_hours,
  }));
};
export const createStaff = async (data: any) => {
    return await api.post('/staff/', { first_name: data.name, username: data.userId, password: data.password });
};
export const updateStaff = async (id: string, data: any) => {
    return await api.patch(`/staff/${id}/`, { first_name: data.name, username: data.userId, password: data.password });
};
export const deleteStaff = async (id: string) => {
    return await api.delete(`/staff/${id}/`);
};

export interface PurchaseRecord {
  id: string;
  user_name: string;
  user_email: string;
  plan_name: string;
  amount: string;
  razorpay_payment_id: string;
  created_at: string;
  status: string;
}

export const getMyPurchases = async (): Promise<PurchaseRecord[]> => {
  return getAllPages('/payments/my-history/');
};

export const getAllPurchasesAdmin = async (): Promise<PurchaseRecord[]> => {
  return getAllPages('/payments/all-history/');
};

export const getUserUnlocks = async (): Promise<string[]> => {
  try {
    const response = await api.get('/payments/my-unlocks/');
    return response.data?.unlocked_ids || [];
  } catch (e) {
    console.warn("Could not fetch remote unlocks:", e);
    return [];
  }
};

export interface MyPlan {
  credits_bought: number;
  credits_used: number;
  credits_left: number;
  is_unlimited: boolean;
  unlimited_expires_at: string | null;
  unlocked_ids: string[];
}

/** Credits left, Ultimate status and unlocked listings, straight from the database. */
export const getMyPlan = async (): Promise<MyPlan> => {
  const response = await api.get('/payments/my-plan/');
  return response.data;
};

/**
 * Unlocks a listing on the server. Throws an error with `noCredits = true`
 * when the account has no credits left (HTTP 402).
 */
export const unlockListingApi = async (propertyId: string): Promise<MyPlan | null> => {
  try {
    const response = await api.post('/payments/unlock-listing/', { property_id: propertyId });
    return response.data?.plan || null;
  } catch (e: any) {
    if (e?.response?.status === 402) {
      const err: any = new Error('No unlock credits left');
      err.noCredits = true;
      err.plan = e.response.data?.plan || null;
      throw err;
    }
    throw e;
  }
};

export const getPricingConfig = async () => {
  const response = await api.get('/pricing/');
  return response.data;
};

export const updatePricingConfig = async (pricingData: any) => {
  const response = await api.post('/pricing/', pricingData);
  return response.data;
};

export default api;

