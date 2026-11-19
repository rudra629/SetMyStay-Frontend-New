"use client";

import React, { useRef, useState } from 'react';
import type { RoommateProfile } from '@/lib/types';
import { DetailsModalWrapper } from './details-modal-wrapper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, IndianRupee, User, Eye, Cake, ChevronLeft, ChevronRight, Lock, MessageSquare, Phone, Sparkles, CigaretteOff, Leaf, Drumstick, Utensils, PawPrint } from 'lucide-react';
import { isVideoUrl, whatsappLink, cdnImage } from '@/lib/utils';
import { RoommateAnswers } from '@/components/shared/roommate-answers';

interface RoommateDetailsProps {
  profile: RoommateProfile | null;
  onClose: () => void;
  isUnlocked: boolean;
  onUnlock: () => void;
  onChat: () => void;
}

const preferenceIcons: { [key: string]: React.ReactNode } = {
  'Non-Smoker': '🚭',
  'Vegetarian': '🥗',
  'Non-Vegetarian': '🍗',
  'Clean': '✨',
  'Drinker': '🍻',
  'Pet-Friendly': '🐾',
};

const MediaGallery = ({ profile }: { profile: RoommateProfile }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const media = Array.from(new Set([...(profile.images || []), ...(profile.videoUrl ? [profile.videoUrl] : [])]));
  
    const nextMedia = () => setCurrentIndex((prev) => (prev + 1) % media.length);
    const prevMedia = () => setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);

    // Swipe left/right on phones to change photo
    const touchStart = useRef<{ x: number; y: number } | null>(null);
    const onTouchStart = (e: React.TouchEvent) => {
      if ((e.target as HTMLElement).closest("video, button")) { touchStart.current = null; return; }
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY };
    };
    const onTouchEnd = (e: React.TouchEvent) => {
      const start = touchStart.current;
      touchStart.current = null;
      if (!start || media.length < 2) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) nextMedia(); else prevMedia();
      }
    };
  
    if (media.length === 0) {
      return (
        <div className="w-full h-80 bg-muted rounded-lg flex items-center justify-center">
            <User className="w-16 h-16 text-muted-foreground" />
        </div>
      );
    }
  
    return (
      <div className="relative w-full h-80 bg-muted rounded-lg overflow-hidden touch-pan-y select-none" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {media.map((src, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-300 isolate ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'}`}
          >
            {/* Cloud Video Support */}
            {isVideoUrl(src) ? (
                 <video 
                   key={src as string}
                   src={src as string} 
                   controls 
                   playsInline 
                   controlsList="nodownload" 
                   autoPlay={index === currentIndex}
                   ref={(el) => {
                     if (el) {
                       if (index === currentIndex) {
                         el.play().catch(() => {});
                       } else {
                         el.pause();
                       }
                     }
                   }}
                   className="w-full h-full object-contain bg-black" 
                 />
             ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/10 dark:bg-black/40 overflow-hidden">
                  <img 
                    src={cdnImage(src as string, 400)} 
                    alt="" 
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover filter blur-md opacity-30 scale-110 pointer-events-none select-none" 
                  />
                  <img 
                    src={cdnImage(src as string, 1600)} 
                    alt={`${profile.ownerName} media ${index + 1}`} 
                    className="relative z-10 max-h-full max-w-full object-contain" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2e?w=800&q=80";
                    }}
                  />
                </div>
             )}
          </div>
        ))}
        {media.length > 1 && (
          <>
            <Button size="icon" variant="ghost" aria-label="Previous photo" className="absolute left-2 top-1/2 -translate-y-1/2 z-30 rounded-full text-white bg-black/40 hover:bg-black/60 hover:text-white" onClick={prevMedia}>
              <ChevronLeft />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Next photo" className="absolute right-2 top-1/2 -translate-y-1/2 z-30 rounded-full text-white bg-black/40 hover:bg-black/60 hover:text-white" onClick={nextMedia}>
              <ChevronRight />
            </Button>
            <div className="absolute top-2 right-2 z-30 rounded-full bg-black/50 px-2.5 py-0.5 text-xs font-medium text-white pointer-events-none">{currentIndex + 1} / {media.length}</div>
          </>
        )}
      </div>
    );
  };
  
export function RoommateDetails({ profile, onClose, isUnlocked, onUnlock, onChat }: RoommateDetailsProps) {
  if (!profile) return null;

  // 👇 Robust parsing to fix the ["Amenities"] formatting bug
  let preferencesList: string[] = [];
  if (profile.preferences) {
      if (Array.isArray(profile.preferences)) {
          // If Django sent an array containing a single stringified JSON array
          if (profile.preferences.length === 1 && typeof profile.preferences[0] === 'string' && profile.preferences[0].startsWith('[')) {
              try {
                  preferencesList = JSON.parse(profile.preferences[0]);
              } catch (e) {
                  preferencesList = profile.preferences;
              }
          } else {
              preferencesList = profile.preferences;
          }
      } else if (typeof (profile.preferences as unknown) === 'string') {
          try {
              const prefsStr = profile.preferences as unknown as string;
              if (prefsStr.startsWith('[')) {
                  preferencesList = JSON.parse(prefsStr);
              } else {
                  preferencesList = prefsStr.split(',').map((s: string) => s.trim());
              }
          } catch (e) {
              preferencesList = (profile.preferences as unknown as string).split(',').map((s: string) => s.trim());
          }
      }
  }
  // Fallback cleanup to strip out any remaining quotes or brackets
  preferencesList = preferencesList.map(pref => pref.replace(/["\[\]]/g, '').trim());

  return (
    <DetailsModalWrapper isOpen={!!profile} onClose={onClose} title={`${profile.ownerName}'s Profile`} listingId={profile.id}>
       <div className="space-y-6">
        <MediaGallery profile={profile} />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-muted rounded-lg flex items-center gap-3">
            <IndianRupee className="w-6 h-6 text-primary"/>
            <div>
              <p className="font-semibold text-lg">{profile.rent?.toLocaleString()}</p>
              <p className="text-muted-foreground">{profile.hasProperty ? 'Monthly Rent' : 'Target Budget'}</p>
            </div>
          </div>
          <div className="p-4 bg-muted rounded-lg flex items-center gap-3">
            <Cake className="w-6 h-6 text-primary"/>
            <div>
              <p className="font-semibold text-lg">{profile.age ? `${profile.age} years` : 'Age not shared'}</p>
              <p className="text-muted-foreground">{profile.gender || 'Any'}</p>
            </div>
          </div>
          <div className="p-4 bg-muted rounded-lg flex items-center gap-3">
            <MapPin className="w-6 h-6 text-primary"/>
            <div>
              <p className="font-semibold text-lg">{profile.locality}</p>
              <p className="text-muted-foreground">{profile.city}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">About Me</h3>
          <p className="text-muted-foreground">{profile.description || 'No description provided.'}</p>
        </div>

        {preferencesList.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Lifestyle Preferences</h3>
            <div className="flex flex-wrap gap-2">
              {preferencesList.map(preference => (
                <Badge key={preference} variant="secondary" className="text-sm flex items-center gap-2">
                  <span>{preferenceIcons[preference] || '👍'}</span>
                  <span>{preference}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {profile.roommateDetails?.answers && Object.keys(profile.roommateDetails.answers).length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Living style</h3>
            <RoommateAnswers details={profile.roommateDetails} />
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold mb-2">Contact Details</h3>
          <div className="p-4 border rounded-lg relative bg-card">
            {isUnlocked ? (
              <div className="space-y-2">
                <p><strong>Name:</strong> {profile.ownerName}</p>
                <p><strong>Primary Phone:</strong> {profile.contactPhonePrimary}</p>
                {profile.contactPhoneSecondary && <p><strong>Secondary Phone:</strong> {profile.contactPhoneSecondary}</p>}
                <p><strong>Email:</strong> {profile.contactEmail || 'Not provided'}</p>
                
                {/* 👇 FIX: Show Full Address if they HAVE a property */}
                {profile.hasProperty && profile.completeAddress && (
                    <p><strong>Property Address:</strong> {profile.completeAddress}</p>
                )}
                
                 <p className="text-xs text-muted-foreground pt-2">Contact details are visible for 30 days after unlocking.</p>
              </div>
            ) : (
              <div className="blur-sm select-none">
                <p><strong>Name:</strong> ************</p>
                <p><strong>Primary Phone:</strong> **********</p>
                <p><strong>Secondary Phone:</strong> **********</p>
                <p><strong>Email:</strong> *****@*****.com</p>
                {profile.hasProperty && <p><strong>Property Address:</strong> ********************</p>}
              </div>
            )}
            {!isUnlocked && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                <Button onClick={onUnlock}>
                  <Lock className="w-4 h-4 mr-2" />
                  Unlock Details
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Opens WhatsApp with the person's number (same as the property pop-up) */}
          {isUnlocked && profile.contactPhonePrimary ? (
            <Button asChild size="lg" className="h-12 w-full sm:w-auto sm:flex-1 rounded-xl text-base font-semibold bg-[#25D366] hover:bg-[#128C7E] text-white">
              <a href={whatsappLink(profile.contactPhonePrimary, `Hi ${profile.ownerName || ''}, I saw your roommate profile on SetMyStay.`.replace('Hi ,', 'Hi,'))} target="_blank" rel="noopener noreferrer">
                <MessageSquare className="w-5 h-5 mr-2" /> Chat on WhatsApp
              </a>
            </Button>
          ) : (
            <Button size="lg" className="h-12 w-full sm:w-auto sm:flex-1 rounded-xl text-base font-semibold bg-[#25D366] hover:bg-[#128C7E] text-white" disabled>
              <MessageSquare className="w-5 h-5 mr-2" /> Chat on WhatsApp
            </Button>
          )}
          {isUnlocked && profile.contactPhonePrimary ? (
            <Button asChild size="lg" variant="outline" className="h-12 w-full sm:w-auto sm:flex-1 rounded-xl text-base font-semibold">
              <a href={`tel:${String(profile.contactPhonePrimary).replace(/[^\d+]/g, '')}`}>
                <Phone className="w-5 h-5 mr-2" /> Call
              </a>
            </Button>
          ) : (
            <Button size="lg" variant="outline" className="h-12 w-full sm:w-auto sm:flex-1 rounded-xl text-base font-semibold" disabled>
              <Phone className="w-5 h-5 mr-2" /> Call
            </Button>
          )}
          <Button size="lg" variant="ghost" className="h-12 w-full sm:w-auto sm:flex-1 rounded-xl text-base font-semibold" onClick={onClose}>
                Close
           </Button>
        </div>
      </div>
    </DetailsModalWrapper>
  );
}