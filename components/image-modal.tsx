"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ImageModalProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
}

export function ImageModal({ open, onClose, imageUrl }: ImageModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden" aria-describedby={undefined}>
        <VisuallyHidden>
          <DialogTitle>Image Preview</DialogTitle>
        </VisuallyHidden>
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
