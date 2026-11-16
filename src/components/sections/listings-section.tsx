
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { Listing, RoommateProfile, ListingType, FilterState, Inquiry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { PropertyCard } from "@/components/shared/property-card";
import { RoommateCard } from "@/components/shared/roommate-card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { AutocompleteInput } from '@/components/shared/autocomplete-input';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { indianStates } from '@/lib/states';
import { allIndianCities, indianCitiesByState, City } from '@/lib/cities';
import { indianAreas } from '@/lib/areas';
import { Heart, Filter, LayoutGrid, List, Bell, Layers } from 'lucide-react';
import { SwipeDeck } from '@/components/shared/swipe-deck';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn, listingCode } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { formatDistanceToNow } from 'date-fns';

// Top of the budget slider = no upper limit, so listings above ₹1 lakh/month are still shown
const BUDGET_NO_LIMIT = 100000;

interface ListingsSectionProps {
  /**
   * The type of listing to display.
   */
  type: 'pg' | 'rentals' | 'roommate'; // Corrected type to match usage
  /**
   * An array of listings and roommate profiles to display.
   */
  listings: (Listing | RoommateProfile)[];
  /**
   * Callback function to view details of a listing or roommate profile.
   */
  onViewDetails: (item: Listing | RoommateProfile, type: 'listing' | 'roommate') => void;
  /**
   * Initial search filters to apply.
   */
  initialSearchFilters: Partial<FilterState> | null;
  /** My Properties: show each listing's review status and its listing ID under the card */
  showOwnerStatus?: boolean;
  likedItemIds: Set<string>;
  onToggleLike: (itemId: string) => void;
  unlockedIds: Set<string>;
  pageTitle?: string;
  inquiries?: Inquiry[];
}

const initialFilters: FilterState = {
  budget: 100000,
  amenities: [],
  furnishedStatus: 'any',
  propertyType: 'any',
  roomType: 'any',
  state: '',
  city: '',
  locality: '',
  gender: "any",
  brokerStatus: "any",
};

// Same names the "List your property" form saves, so ticking a feature finds the listings that have it.
const featuresByType: Record<ListingType, { value: string; label: string }[]> = {
  rentals: [
    { value: 'AC', label: 'AC' }, { value: 'Wi-Fi', label: 'Wi-Fi' }, { value: 'Parking', label: 'Parking' },
    { value: 'Gymnasium', label: 'Gym' }, { value: 'Lift/Elevator', label: 'Lift' }, { value: 'Security', label: 'Security' },
    { value: 'Balcony', label: 'Balcony' }, { value: 'Power Backup', label: 'Power Backup' },
  ],
  pg: [
    { value: 'AC', label: 'AC' }, { value: 'Wi-Fi', label: 'Wi-Fi' }, { value: 'In-house Mess', label: 'Meals / Mess' },
    { value: 'Washing Machine (Private/Common)', label: 'Washing Machine' }, { value: 'Lift/Elevator', label: 'Lift' },
    { value: 'Security', label: 'Security' }, { value: 'Power Backup', label: 'Power Backup' }, { value: 'Refrigerator', label: 'Fridge' },
  ],
  roommate: [
    { value: 'Non-Smoker', label: 'Non-Smoker' }, { value: 'Vegetarian', label: 'Vegetarian' }, { value: 'Pet-Friendly', label: 'Pet-Friendly' },
    { value: 'Wi-Fi', label: 'Wi-Fi' }, { value: 'AC', label: 'AC' }, { value: 'Attached Bathroom', label: 'Attached Bathroom' },
    { value: 'Lift/Elevator', label: 'Lift' }, { value: 'Reserved Parking', label: 'Parking' },
  ],
};

// Other names owners may have picked that mean the same feature.
const featureAliases: Record<string, string[]> = {
  'wi-fi': ['wifi', 'broadband internet'],
  'parking': ['reserved parking', 'car parking', 'two-wheeler parking', 'visitor parking'],
  'reserved parking': ['parking', 'car parking'],
  'gymnasium': ['gym', 'health club'],
  'lift/elevator': ['lift', 'elevator'],
  'security': ['gated security', '24x7 security guard', 'cctv surveillance', 'cctv cameras'],
  'power backup': ['electricity backup', 'generator backup'],
  'in-house mess': ['meals', 'breakfast/lunch/dinner', 'tiffin service'],
  'washing machine (private/common)': ['laundry', 'laundry service'],
  'balcony': ['sit-out area'],
};
const norm = (v?: string) => (v || '').toString().trim().toLowerCase();
const hasFeature = (itemFeatures: string[] | undefined, wanted: string) => {
  const names = new Set((itemFeatures || []).map(norm));
  const w = norm(wanted);
  return names.has(w) || (featureAliases[w] || []).some((a) => names.has(a));
};

// Turn whatever was saved ("Semi", "1BHK", "Single"...) into the filter's options.
const furnishingOf = (raw?: string) => {
  const v = norm(raw);
  if (!v) return '';
  if (v.startsWith('semi')) return 'Semi-Furnished';
  if (v.startsWith('un') || v === 'no') return 'Unfurnished';
  if (v.startsWith('full') || v === 'yes' || v === 'furnished') return 'Furnished';
  return '';
};
const bhkOf = (raw?: string) => {
  const v = norm(raw);
  if (!v) return '';
  if (/\brk\b|^\d*\s*rk$/.test(v)) return '1 RK';
  const n = parseInt(v, 10);
  if (!n) return '';
  return n >= 4 ? '4+ BHK' : `${n} BHK`;
};
const roomTypeOf = (raw?: string) => {
  const v = norm(raw);
  if (v.startsWith('single')) return 'Single Room';
  if (v.startsWith('double')) return 'Double Sharing';
  if (v.startsWith('triple')) return 'Triple Sharing';
  return '';
};


const FilterPanel = ({
  filters,
  handleFilterChange,
  handleAmenityChange,
  citySuggestions,
  areaSuggestions,
  type,
}: {
  filters: FilterState;
  handleFilterChange: <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => void;
  handleAmenityChange: (amenity: string, checked: boolean) => void;
  citySuggestions: string[];
  areaSuggestions: string[];
  type: ListingType;
}) => (
  <div className="space-y-6">
    {/* Common Filter: Budget */}
    <div className="space-y-2">
      <Label>Max Budget: {filters.budget >= BUDGET_NO_LIMIT ? 'No limit' : `₹${filters.budget.toLocaleString('en-IN')}`}</Label>
      <Slider
        min={5000} max={BUDGET_NO_LIMIT} step={1000}
        value={[filters.budget]}
        onValueChange={([val]) => handleFilterChange('budget', val)}
      />
    </div>
    
    {/* Common Geographic Filters */}
    <div className="space-y-4">
        <SearchableSelect 
          placeholder="Filter by State"
          searchPlaceholder="Search State..."
          emptyText="No state found."
          value={filters.state}
          onChange={(val) => handleFilterChange('state', val === "All States" ? "" : val)}
          options={["All States", ...indianStates]}
        />
        <SearchableSelect 
          placeholder="Filter by City"
          searchPlaceholder="Search City..."
          emptyText="No city found."
          value={filters.city}
          onChange={(val) => handleFilterChange('city', val === "All Cities" ? "" : val)}
          options={["All Cities", ...citySuggestions]}
          disabled={!filters.state}
        />
        <AutocompleteInput 
          placeholder="Enter Area / Locality"
          value={filters.locality}
          onChange={(val) => handleFilterChange('locality', val)}
          suggestions={areaSuggestions}
        />
    </div>

    <div className="space-y-4">
      {type === 'rentals' && (
        <>
          <Select value={filters.propertyType} onValueChange={(val) => handleFilterChange('propertyType', val)}>
            <SelectTrigger><SelectValue placeholder="Property Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any BHK</SelectItem>
              <SelectItem value="1 RK">1 RK</SelectItem>
              <SelectItem value="1 BHK">1 BHK</SelectItem>
              <SelectItem value="2 BHK">2 BHK</SelectItem>
              <SelectItem value="3 BHK">3 BHK</SelectItem>
              <SelectItem value="4+ BHK">4+ BHK</SelectItem>
            </SelectContent>
          </Select>
          <div className="space-y-2">
            <Label>Contact Type</Label>
            <RadioGroup value={filters.brokerStatus} onValueChange={(val) => handleFilterChange('brokerStatus', val as 'any' | 'With Broker' | 'Without Broker')} className="flex gap-2">
                <Label className="flex-1 p-2 border rounded-md text-center cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary"><RadioGroupItem value="any" className="sr-only"/>Any</Label>
                <Label className="flex-1 p-2 border rounded-md text-center cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary"><RadioGroupItem value="With Broker" className="sr-only"/>Broker</Label>
                <Label className="flex-1 p-2 border rounded-md text-center cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary"><RadioGroupItem value="Without Broker" className="sr-only"/>Owner</Label>
            </RadioGroup>
          </div>
        </>
      )}
      {type === 'pg' && (
        <Select value={filters.roomType} onValueChange={(val) => handleFilterChange('roomType', val)}>
          <SelectTrigger><SelectValue placeholder="Room Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any Type</SelectItem>
            <SelectItem value="Single Room">Single Room</SelectItem>
            <SelectItem value="Double Sharing">Double Sharing</SelectItem>
            <SelectItem value="Triple Sharing">Triple Sharing</SelectItem>
          </SelectContent>
        </Select>
      )}
      
      {type !== 'roommate' && (
      <div className="space-y-2">
          <Label>Furnishing</Label>
          <RadioGroup value={filters.furnishedStatus} onValueChange={(val) => handleFilterChange('furnishedStatus', val as 'any' | 'Furnished' | 'Semi-Furnished' | 'Unfurnished')} className="flex gap-2">
              <Label className="flex-1 p-2 border rounded-md text-center cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary"><RadioGroupItem value="any" className="sr-only"/>Any</Label>
              <Label className="flex-1 p-2 border rounded-md text-center cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary"><RadioGroupItem value="Furnished" className="sr-only"/>Full</Label>
              <Label className="flex-1 p-2 border rounded-md text-center cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary"><RadioGroupItem value="Semi-Furnished" className="sr-only"/>Semi</Label>
              <Label className="flex-1 p-2 border rounded-md text-center cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary"><RadioGroupItem value="Unfurnished" className="sr-only"/>None</Label>
          </RadioGroup>
      </div>
      )}

        {type === 'roommate' && (
          <Select value={filters.gender} onValueChange={(val) => handleFilterChange('gender', val)}>
            <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
            <SelectContent>
                <SelectItem value="any">Any Gender</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        )}
      <div className="space-y-2">
          <Label>{type === 'roommate' ? 'Preferences' : 'Amenities'}</Label>
          <div className="grid grid-cols-2 gap-2">
          {featuresByType[type].map(({ value, label }) => (
              <div key={value} className="flex items-center space-x-2">
              <Checkbox id={`amenity-${type}-${value}`} checked={filters.amenities.includes(value)} onCheckedChange={(checked) => handleAmenityChange(value, !!checked)} />
              <Label htmlFor={`amenity-${type}-${value}`} className="text-sm font-normal">{label}</Label>
              </div>
          ))}
          </div>
      </div>
    </div>
  </div>
);


const STATUS_STYLE: Record<string, { label: string; className: string; hint: string }> = {
  approved: { label: 'Live', className: 'bg-emerald-100 text-emerald-800 border-emerald-200', hint: 'Visible to everyone on SetMyStay.' },
  pending: { label: 'Under review', className: 'bg-amber-100 text-amber-800 border-amber-200', hint: 'Our team is checking your listing. It goes live once approved.' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800 border-red-200', hint: 'Not approved. Call us with your listing ID to know why.' },
};

function OwnerStatusBar({ id, status }: { id: string; status?: string }) {
  const st = STATUS_STYLE[status || 'pending'] || STATUS_STYLE.pending;
  const code = listingCode(id);
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border bg-card px-3 py-2 text-sm" title={st.hint}>
      <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-semibold', st.className)}>{st.label}</span>
      <button
        type="button"
        className="font-mono text-xs text-muted-foreground hover:text-foreground"
        title="Copy listing ID"
        onClick={() => { navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}
      >
        {copied ? 'Copied!' : <>ID: <span className="font-semibold text-foreground">{code}</span></>}
      </button>
    </div>
  );
}

export function ListingsSection({ 
  type, 
  listings, 
  onViewDetails, 
  initialSearchFilters,
  likedItemIds,
  onToggleLike,
  unlockedIds,
  pageTitle: customPageTitle,
  inquiries,
  showOwnerStatus = false,
}: ListingsSectionProps) {
  const [filters, setFilters] = useState<FilterState>({ ...initialFilters, ...initialSearchFilters });
  const [pageTitle, setPageTitle] = useState('');
  const [pageDescription, setPageDescription] = useState('');
  
  useEffect(() => {
    if (initialSearchFilters) {
      setFilters(prev => ({ ...prev, ...initialSearchFilters }));
    }

    const pageConfig = {
      pg: { title: 'PG & Co-living Spaces', description: 'Explore the best PG and co-living spaces in your city. We offer a variety of options, from single private rooms to shared accommodations, complete with modern amenities for a hassle-free living experience. Filter by budget and location to find your perfect spot.' },
      rentals: { title: 'Find Your Next Home', description: "Find your next home from our curated selection of rental properties. Whether you're looking for a cozy studio or a spacious family house, our verified listings provide all the details you need. Use the filters to narrow down by price, location, amenities, and more to find a space that feels like it was made for you." },
      roommate: { title: 'Find Your Ideal Roommate', description: "Discover your next great roommate with SetMyStay. Browse through detailed profiles to find people who match your lifestyle, budget, and living preferences. Our platform makes it easy to connect with compatible individuals to start your shared living adventure." }
    };
    
    let config = { title: 'Our Listings', description: 'Browse our collection of properties and roommate profiles to find your perfect match.' };
    if (type === 'pg' || type === 'rentals' || type === 'roommate') {
      config = pageConfig[type];
    }

    setPageTitle(customPageTitle || config.title);
    setPageDescription(config.description);

  }, [initialSearchFilters, type, customPageTitle]);

  
  const handleFilterChange = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => {
      const newState = { ...prev, [key]: value };
      if (key === 'state') {
        newState.city = '';
        newState.locality = '';
      }
      if (key === 'city') {
        newState.locality = '';
      }
      return newState;
    });
  };

  const handleAmenityChange = (amenity: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      amenities: checked 
        ? [...prev.amenities, amenity]
        : prev.amenities.filter(a => a !== amenity)
    }));
  };

  const citySuggestions = filters.state ? indianCitiesByState[filters.state] || [] : allIndianCities;
  const areaSuggestions = filters.city ? indianAreas[filters.city] || [] : [];


  const filteredListings = useMemo(() => {
    return listings.filter(item => {
      // Common filters
      if (filters.budget < BUDGET_NO_LIMIT && item.rent > filters.budget) return false;
      if (filters.state && filters.state !== 'All States' && norm(item.state) !== norm(filters.state)) return false;
      if (filters.city && !norm(item.city).includes(norm(filters.city))) return false;
      if (filters.locality && !norm(item.locality).includes(norm(filters.locality))) return false;

      // Type-specific filters
      if (item.propertyType !== 'Roommate') { // Is a Listing
          const l = item as Listing;
          if (filters.furnishedStatus !== 'any' && furnishingOf(l.furnishedStatus) !== filters.furnishedStatus) return false;
          if (type === 'rentals' && filters.brokerStatus !== 'any' && filters.brokerStatus !== l.brokerStatus) return false;
          if (type === 'rentals' && filters.propertyType !== 'any' && bhkOf(l.bhk) !== filters.propertyType) return false;
          if (type === 'pg' && filters.roomType !== 'any' && roomTypeOf(l.roomType) !== filters.roomType) return false;
          if (filters.amenities.length > 0 && !filters.amenities.every(a => hasFeature(l.amenities, a))) return false;
      } else { // Is a RoommateProfile
          const r = item as RoommateProfile;
          if (filters.gender !== 'any' && norm(r.gender) !== norm(filters.gender)) return false;
          if (filters.amenities.length > 0 && !filters.amenities.every(a => hasFeature(r.preferences, a))) return false;
      }

      return true;
    });
  }, [listings, filters, type]);

  const filtersActive = JSON.stringify({ ...filters, amenities: [...filters.amenities].sort() }) !== JSON.stringify(initialFilters);
  const clearFilters = () => setFilters({ ...initialFilters });

  const filterPanelProps = {
    filters,
    handleFilterChange,
    handleAmenityChange,
    citySuggestions,
    areaSuggestions,
    type,
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <h1 className="font-display text-5xl font-light tracking-tight">{pageTitle}</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">{pageDescription}</p>
      </div>

      {inquiries && (
        <Card className="mb-8">
            <CardHeader>
                <CardTitle className="text-2xl">Availability Inquiries</CardTitle>
                <CardDescription>Recent inquiries from users about property availability.</CardDescription>
            </CardHeader>
            <CardContent>
                {inquiries.length > 0 ? (
                    <div className="space-y-4">
                        {inquiries.map(inquiry => (
                            <div key={inquiry.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                                <div className="flex items-center gap-4">
                                    <Bell className="w-6 h-6 text-blue-500" />
                                    <div>
                                        <p><strong className="font-semibold">{inquiry.userName}</strong> inquired about <strong className="font-semibold">{inquiry.propertyTitle}</strong></p>
                                        <p className="text-sm text-muted-foreground">{formatDistanceToNow(inquiry.time, { addSuffix: true })}</p>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => onViewDetails(listings.find(l => l.id === inquiry.propertyId) as Listing, 'listing')}>View Property</Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-500 text-center py-4">No new availability inquiries.</p>
                )}
            </CardContent>
        </Card>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="hidden md:block md:w-1/3 lg:w-1/4">
            <div className="sticky top-24">
              <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
                <div className="p-4 bg-card rounded-xl shadow-sm space-y-6">
                  <h3 className="text-xl font-semibold">Filters</h3>
                  <FilterPanel {...filterPanelProps} />
                </div>
              </ScrollArea>
            </div>
          </aside>

        <main className={'md:w-2/3 lg:w-3/4'}>
           <div className="flex justify-between items-center mb-6">
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0">
                  <ScrollArea className="h-full p-6">
                    <h3 className="text-xl font-semibold mb-6">Filters</h3>
                    <FilterPanel {...filterPanelProps} />
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <p className="text-sm text-muted-foreground">{filteredListings.length} {filteredListings.length === 1 ? 'result' : 'results'} found</p>
              {filtersActive && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>
              )}
            </div>
                      </div>
          {type === 'roommate' && filteredListings.length > 0 && (
            <SwipeDeck items={filteredListings} likedItemIds={likedItemIds} onToggleLike={onToggleLike} onViewDetails={(i, t) => onViewDetails(i, t)} className="py-6" />
          )}
          <div className={cn(
            "grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3", type === 'roommate' && "hidden"
          )}>
            {filteredListings.map(item => {
              const itemType = item.propertyType === 'Roommate' ? 'roommate' : 'listing';
              const isUnlocked = unlockedIds.has(item.id);
              const card = itemType === 'roommate' 
                ? <RoommateCard key={item.id} profile={item as RoommateProfile} onViewDetails={(i) => onViewDetails(i, 'roommate')} isLiked={likedItemIds.has(item.id)} onToggleLike={() => onToggleLike(item.id)} isUnlocked={isUnlocked} />
                : <PropertyCard key={item.id} listing={item as Listing} onViewDetails={(i) => onViewDetails(i, 'listing')} isLiked={likedItemIds.has(item.id)} onToggleLike={() => onToggleLike(item.id)} isUnlocked={isUnlocked} />;
              if (!showOwnerStatus) return card;
              return (
                <div key={item.id} className="flex flex-col gap-2">
                  <OwnerStatusBar id={item.id} status={(item as any).status} />
                  {card}
                </div>
              );
            })}
          </div>
          {filteredListings.length === 0 && (
            <div className="text-center py-16 bg-card rounded-xl">
                <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="text-xl font-semibold mt-4">No results found</h3>
                <p className="text-muted-foreground mt-2">Try adjusting your filters to find what you're looking for.</p>
                {filtersActive && <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear filters</Button>}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
