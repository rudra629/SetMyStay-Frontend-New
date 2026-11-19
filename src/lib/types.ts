

export type Page = 'home' | 'pg' | 'rentals' | 'roommates' | 'list' | 'for-sale' | 'my-properties' | 'liked-properties';

export type ListingType = 'pg' | 'rentals' | 'roommate';

export interface Bed {
  id: string;
  status: 'vacant' | 'occupied';
}

export interface Advertisement {
  id:string;
  title: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  couponCodes?: string[];   // coupons shown on the pop-up with a Copy button
}

export interface Coupon {
    id: string;
    code: string;
    discountPercentage: number;
    isActive: boolean;
}

export interface Listing {
  id: string;
  bhk?: string;            // e.g. "2 BHK" (rentals)
  roomType?: string;       // e.g. "Double Sharing" (PG)
  genderPreference?: string;
  propertyType: 'PG' | 'Rental' | 'Roommate';
  title: string;
  rent: number;
  area: number;
  city: string;
  locality: string;
  sector?: string;
  state: string;
  completeAddress: string;
  partialAddress: string;
  ownerName: string;
  contactPhonePrimary: string;
  contactPhoneSecondary?: string;
  contactEmail?: string;
  description: string;
  furnishedStatus: 'Furnished' | 'Semi-Furnished' | 'Unfurnished';
  amenities: string[];
  size: string; // e.g., '1 BHK', 'Single Room'
  images: string[];
  videoUrl?: string;
  views: number;
  ownerId: string;
  brokerStatus: 'With Broker' | 'Without Broker';
  vendorNumber?: string;
  age?: number;
  sharingStatus?: string;
  aadhaarCardUrl?: string;
  electricityBillUrl?: string;
  nocUrl?: string;
  beds?: Bed[];
  lastAvailabilityCheck: string;
  status?: 'pending' | 'approved' | 'rejected';
  verifiedBy?: string; // Staff ID
  submittedAt: string;
  verificationTimestamp?: string;
}

export interface RoommateProfile {
  id: string;
  propertyType: 'Roommate'; // To distinguish from listings
  ownerName: string;
  age: number;
  rent: number; // Budget
  area?: number; // Preferred area
  city: string;
  locality: string;
  sector?: string;
  state: string;
  completeAddress: string;
  partialAddress: string;
  contactPhonePrimary: string;
  contactPhoneSecondary?: string;
  contactEmail?: string;
  description: string;
  preferences: string[];
  gender: string;
  images: string[];
  views: number;
  ownerId: string;
  vendorNumber?: string;
  aadhaarCardUrl?: string;
  electricityBillUrl?: string;
  nocUrl?: string;
  videoUrl?: string;
  hasProperty: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  verifiedBy?: string; // Staff ID
  submittedAt: string;
  verificationTimestamp?: string;
}

export type AnyListing = Listing | RoommateProfile;

export type UnlockPlan = 1 | 5 | 10 | 'unlimited';

export type FilterState = {
  budget: number;
  amenities: string[];
  furnishedStatus: string;
  propertyType: string;
  state: string;
  city: string;
  locality: string;
  roomType: string;
  gender: string;
  brokerStatus: string;
};

export interface Purchase {
    id: string;
    planName: string;
    amount: number;
    date: Date;
}

export interface StaffMember {
    id: string;
    name: string;
    userId: string;
    password?: string;
}

export interface Inquiry {
    id: string;
    propertyId: string;
    propertyTitle: string;
    userName: string;
    time: Date;
}

export interface Rating {
    id: string;
    rating: number;
    feedback?: string;
    date: Date;
}

export interface PricingData {
  unlocks: {
    '1': number;
    '5': number;
    '10': number;
    unlimited: number;
  };
  listings: {
    roommate: number;
    pg: number;
    rental: number;
  };
}


// Add ToggleGroup to components/ui
export interface ToggleGroupProps
  extends React.ForwardRefExoticComponent<Omit<any, "ref"> & React.RefAttributes<HTMLElement>> {
  Item: React.ForwardRefExoticComponent<Omit<any, "ref"> & React.RefAttributes<HTMLButtonElement>>;
}
