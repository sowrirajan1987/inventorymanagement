"use client";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface ImageModalProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
}

export function ImageModal({ open, onClose, imageUrl }: ImageModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Full size preview"
            className="w-full h-auto max-h-[80vh] object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
