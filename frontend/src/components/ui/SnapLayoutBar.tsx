import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSnapLayout } from "../../context/SnapLayoutContext";
import type { SnapLayout } from "../../context/SnapLayoutContext";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Maximize01Icon,
  Minimize01Icon
} from "@hugeicons/core-free-icons";

function getPreviewStyle(snap: SnapLayout | "none"): React.CSSProperties {
  if (snap === "none") return { display: "none" };
  const margin = 12; // Gap from screen edges
  const marginStr = `${margin}px`;

  switch (snap) {
    case "full":
      return { top: marginStr, left: marginStr, right: marginStr, bottom: marginStr };
    case "left-half":
      return { top: marginStr, left: marginStr, bottom: marginStr, width: `calc(50vw - ${margin * 1.5}px)` };
    case "right-half":
      return { top: marginStr, right: marginStr, bottom: marginStr, width: `calc(50vw - ${margin * 1.5}px)` };
    default:
      return { display: "none" };
  }
}

export const SnapLayoutBar: React.FC = () => {
  const { isDragging, dragPosition, previewSnap, setPreviewSnap } = useSnapLayout();
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if mouse is near top to expand
  useEffect(() => {
    if (!isDragging) {
      setIsExpanded(false);
      setPreviewSnap("none");
      return;
    }

    if (dragPosition) {
      if (!isExpanded && dragPosition.y <= 20) {
        setIsExpanded(true);
      } else if (isExpanded && dragPosition.y > 100) { // expanded hit area is up to 100px from top
        setIsExpanded(false);
        setPreviewSnap("none");
      }
    }
  }, [isDragging, dragPosition, isExpanded, setPreviewSnap]);

  // Determine which region we are hovering
  useEffect(() => {
    if (!isExpanded || !isDragging || !dragPosition || !containerRef.current) return;

    const rects = containerRef.current.querySelectorAll("[data-snap]");
    let hovered: SnapLayout | "none" = "none";

    for (let i = 0; i < rects.length; i++) {
      const el = rects[i] as HTMLElement;
      const rect = el.getBoundingClientRect();
      if (
        dragPosition.x >= rect.left &&
        dragPosition.x <= rect.right &&
        dragPosition.y >= rect.top &&
        dragPosition.y <= rect.bottom
      ) {
        hovered = el.getAttribute("data-snap") as SnapLayout;
        break;
      }
    }

    if (hovered !== previewSnap) {
      setPreviewSnap(hovered);
    }
  }, [isDragging, isExpanded, dragPosition, previewSnap, setPreviewSnap]);

  if (!isDragging && !isExpanded) return null;

  const SnapBtn = ({ snap, icon: Icon }: { snap: SnapLayout | "none"; icon: any }) => (
    <div
      data-snap={snap}
      className={`w-16 h-12 rounded-xl flex items-center justify-center border-2 transition-all ${
        previewSnap === snap
          ? "border-primary bg-primary/20 text-primary scale-105"
          : "border-border/50 bg-muted/50 text-muted-foreground"
      }`}
    >
      <HugeiconsIcon icon={Icon} size={20} />
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {previewSnap !== "none" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed pointer-events-none bg-primary/20 border-2 border-primary rounded-[20px] backdrop-blur-sm z-[9998]"
            style={getPreviewStyle(previewSnap)}
          />
        )}
      </AnimatePresence>

      <div className="fixed top-0 left-0 right-0 h-16 pointer-events-none z-[9999] flex justify-center">
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="mt-2"
            >
              {!isExpanded ? (
                <div className="h-2 w-32 bg-foreground/20 rounded-full backdrop-blur-md border border-border shadow-md" />
              ) : (
                <motion.div
                  ref={containerRef}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 p-2 bg-background/90 backdrop-blur-xl border border-border rounded-2xl shadow-2xl"
                >
                  <SnapBtn snap="left-half" icon={ArrowLeft01Icon} />
                  <SnapBtn snap="full" icon={Maximize01Icon} />
                  <SnapBtn snap="none" icon={Minimize01Icon} />
                  <SnapBtn snap="right-half" icon={ArrowRight01Icon} />
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
