import React, { createContext, useContext, useState, ReactNode } from 'react';

export type SnapLayout = 
  | "none"
  | "full"
  | "left-half"
  | "right-half"
  | "left-third"
  | "mid-third"
  | "right-third"
  | "left-two-thirds"
  | "right-two-thirds"
  | "grid-tl"
  | "grid-tr"
  | "grid-bl"
  | "grid-br";

interface SnapLayoutContextType {
  isDragging: boolean;
  draggedPopupId: string | null;
  activeSnaps: Record<string, SnapLayout>;
  dragPosition: { x: number; y: number } | null;
  previewSnap: SnapLayout | "none";
  setDragging: (isDragging: boolean, popupId: string | null) => void;
  snapPopup: (popupId: string, layout: SnapLayout) => void;
  removeSnap: (popupId: string) => void;
  setDragPosition: (pos: { x: number; y: number } | null) => void;
  setPreviewSnap: (layout: SnapLayout | "none") => void;
}

const SnapLayoutContext = createContext<SnapLayoutContextType | undefined>(undefined);

export function SnapLayoutProvider({ children }: { children: ReactNode }) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPopupId, setDraggedPopupId] = useState<string | null>(null);
  const [activeSnaps, setActiveSnaps] = useState<Record<string, SnapLayout>>({});
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [previewSnap, setPreviewSnap] = useState<SnapLayout | "none">("none");

  const setDragging = (dragging: boolean, popupId: string | null) => {
    setIsDragging(dragging);
    setDraggedPopupId(popupId);
    if (!dragging) {
      setDragPosition(null);
      setPreviewSnap("none");
    }
  };

  const snapPopup = (popupId: string, layout: SnapLayout) => {
    setActiveSnaps(prev => ({ ...prev, [popupId]: layout }));
  };

  const removeSnap = (popupId: string) => {
    setActiveSnaps(prev => {
      const next = { ...prev };
      delete next[popupId];
      return next;
    });
  };

  return (
    <SnapLayoutContext.Provider value={{
      isDragging, draggedPopupId, activeSnaps,
      dragPosition, previewSnap,
      setDragging, snapPopup, removeSnap,
      setDragPosition, setPreviewSnap
    }}>
      {children}
    </SnapLayoutContext.Provider>
  );
}

export const useSnapLayout = () => {
  const context = useContext(SnapLayoutContext);
  if (!context) throw new Error("useSnapLayout must be used within SnapLayoutProvider");
  return context;
};
