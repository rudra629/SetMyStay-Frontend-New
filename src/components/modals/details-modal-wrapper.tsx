"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface DetailsModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function DetailsModalWrapper({ isOpen, onClose, title, children }: DetailsModalWrapperProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-1.5rem)] sm:w-[92vw] max-w-3xl p-0 max-h-[90vh] flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden my-auto border border-border/80 shadow-2xl">
        <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b sticky top-0 bg-card z-20 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-xl sm:text-2xl font-bold truncate pr-4">{title}</DialogTitle>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:text-foreground bg-muted/70 hover:bg-muted transition-colors cursor-pointer shrink-0 z-30"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
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
