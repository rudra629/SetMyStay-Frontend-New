"use client";

import React, { useState } from "react";
import { listingCode } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface DetailsModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Shows the listing's ID (e.g. SMS-00021) under the title, tap to copy */
  listingId?: string;
}

function ListingIdChip({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const code = listingCode(id);
  if (!code) return null;
  return (
    <button
      type="button"
      title="Copy listing ID"
      onClick={() => navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {})}
      className="mt-1 inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground hover:text-foreground"
    >
      {copied ? "Copied!" : <>Listing ID: <span className="ml-1 font-semibold text-foreground">{code}</span></>}
    </button>
  );
}

export function DetailsModalWrapper({ isOpen, onClose, title, children, listingId }: DetailsModalWrapperProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-1.5rem)] sm:w-[92vw] max-w-3xl p-0 max-h-[90vh] flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden my-auto border border-border/80 shadow-2xl">
        <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b sticky top-0 bg-card z-20 flex flex-row items-center justify-between space-y-0">
          <div className="min-w-0 pr-10">
            <DialogTitle className="text-xl sm:text-2xl font-bold truncate">{title}</DialogTitle>
            {listingId && <ListingIdChip id={listingId} />}
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6">
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
