import { useState } from "react";
import { cdnImage } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Copy, Check, X } from "lucide-react";

interface AdvertisementModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  imageUrl: string;
}

export function AdvertisementModal({ isOpen, onClose, title, description, imageUrl }: AdvertisementModalProps) {
  const [copied, setCopied] = useState(false);
  const code = description?.match(/code:?\s*([A-Z0-9]{4,})/i)?.[1];
  const text = code ? description.replace(/\s*Use code:?\s*[A-Z0-9]+\.?/i, "") : description;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2.5rem)] max-w-sm sm:max-w-[420px] max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 rounded-2xl sm:rounded-3xl shadow-2xl">
        {imageUrl && (
          <div className="relative h-52 w-full">
            <img 
              src={cdnImage(imageUrl, 900)} 
              alt="" 
              className="absolute inset-0 h-full w-full object-cover" 
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />
          </div>
        )}
        <div className="px-7 pb-7 pt-2 space-y-4">
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Limited offer</p>
          <DialogTitle className="font-display text-3xl font-normal leading-tight">{title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">{text}</DialogDescription>
          {code && (
            <button
              type="button"
              onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); }}
              className="flex w-full items-center justify-between rounded-xl border border-dashed px-4 py-3 font-mono text-sm tracking-widest hover:bg-secondary transition-colors"
            >
              {code}
              <span className="flex items-center gap-1.5 font-sans text-xs tracking-normal text-muted-foreground">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy"}
              </span>
            </button>
          )}
          <Button onClick={onClose} variant="ghost" className="w-full text-muted-foreground">Maybe later</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
