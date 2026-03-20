"use client";

import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ModerationErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ModerationErrorModal({ isOpen, onClose }: ModerationErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative z-50 w-full max-w-md mx-4 bg-card border border-border rounded-lg shadow-lg p-6">
        {/* Header with close button */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-amber-500" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Content Filtered</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <p className="text-sm text-muted-foreground mb-6">
          That prompt isn't something this demo can process. Please try a different question or topic.
        </p>

        {/* Footer */}
        <div className="flex justify-end gap-3">
          <Button
            onClick={onClose}
            variant="default"
            size="sm"
            className="rounded"
          >
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}
