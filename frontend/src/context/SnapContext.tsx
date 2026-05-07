import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";

export interface SnapTarget {
  x: number; y: number; w: number; h: number; // pixels
}

export interface SnapZoneDef {
  id: string;
  // fractions of viewport
  fx: number; fy: number; fw: number; fh: number;
  // icon zones: array of { active, fx,fy,fw,fh }
  icon: { active: boolean; fx: number; fy: number; fw: number; fh: number }[];
}

export const SNAP_ZONES: SnapZoneDef[] = [
  // Full
  { id:"full",         fx:0,    fy:0,   fw:1,    fh:1,   icon:[{active:true, fx:0,fy:0,fw:1,fh:1}] },
  // Left/Right half
  { id:"left-half",    fx:0,    fy:0,   fw:0.5,  fh:1,   icon:[{active:true,fx:0,fy:0,fw:.48,fh:1},{active:false,fx:.52,fy:0,fw:.48,fh:1}] },
  { id:"right-half",   fx:0.5,  fy:0,   fw:0.5,  fh:1,   icon:[{active:false,fx:0,fy:0,fw:.48,fh:1},{active:true,fx:.52,fy:0,fw:.48,fh:1}] },
  // Three columns
  { id:"left-third",   fx:0,    fy:0,   fw:1/3,  fh:1,   icon:[{active:true,fx:0,fy:0,fw:.30,fh:1},{active:false,fx:.35,fy:0,fw:.30,fh:1},{active:false,fx:.70,fy:0,fw:.30,fh:1}] },
  { id:"mid-third",    fx:1/3,  fy:0,   fw:1/3,  fh:1,   icon:[{active:false,fx:0,fy:0,fw:.30,fh:1},{active:true,fx:.35,fy:0,fw:.30,fh:1},{active:false,fx:.70,fy:0,fw:.30,fh:1}] },
  { id:"right-third",  fx:2/3,  fy:0,   fw:1/3,  fh:1,   icon:[{active:false,fx:0,fy:0,fw:.30,fh:1},{active:false,fx:.35,fy:0,fw:.30,fh:1},{active:true,fx:.70,fy:0,fw:.30,fh:1}] },
  // Quadrants
  { id:"tl", fx:0,   fy:0,   fw:.5, fh:.5, icon:[{active:true,fx:0,fy:0,fw:.48,fh:.48},{active:false,fx:.52,fy:0,fw:.48,fh:.48},{active:false,fx:0,fy:.52,fw:.48,fh:.48},{active:false,fx:.52,fy:.52,fw:.48,fh:.48}] },
  { id:"tr", fx:.5,  fy:0,   fw:.5, fh:.5, icon:[{active:false,fx:0,fy:0,fw:.48,fh:.48},{active:true,fx:.52,fy:0,fw:.48,fh:.48},{active:false,fx:0,fy:.52,fw:.48,fh:.48},{active:false,fx:.52,fy:.52,fw:.48,fh:.48}] },
  { id:"bl", fx:0,   fy:.5,  fw:.5, fh:.5, icon:[{active:false,fx:0,fy:0,fw:.48,fh:.48},{active:false,fx:.52,fy:0,fw:.48,fh:.48},{active:true,fx:0,fy:.52,fw:.48,fh:.48},{active:false,fx:.52,fy:.52,fw:.48,fh:.48}] },
  { id:"br", fx:.5,  fy:.5,  fw:.5, fh:.5, icon:[{active:false,fx:0,fy:0,fw:.48,fh:.48},{active:false,fx:.52,fy:0,fw:.48,fh:.48},{active:false,fx:0,fy:.52,fw:.48,fh:.48},{active:true,fx:.52,fy:.52,fw:.48,fh:.48}] },
  // Top/Bottom half
  { id:"top",    fx:0, fy:0,  fw:1, fh:.5, icon:[{active:true,fx:0,fy:0,fw:1,fh:.48},{active:false,fx:0,fy:.52,fw:1,fh:.48}] },
  { id:"bottom", fx:0, fy:.5, fw:1, fh:.5, icon:[{active:false,fx:0,fy:0,fw:1,fh:.48},{active:true,fx:0,fy:.52,fw:1,fh:.48}] },
];

interface SnapCtx {
  isDragging: boolean;
  cursorPos: { x: number; y: number };
  hoveredSnapId: React.MutableRefObject<string | null>;
  startDrag: () => void;
  endDrag: () => SnapZoneDef | null;
  setHoveredSnapId: (id: string | null) => void;
}

const Ctx = createContext<SnapCtx | null>(null);

export function SnapProvider({ children }: { children: React.ReactNode }) {
  const [isDragging, setIsDragging] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const hoveredSnapId = useRef<string | null>(null);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: PointerEvent) => setCursorPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [isDragging]);

  const startDrag = useCallback(() => {
    setIsDragging(true);
    hoveredSnapId.current = null;
  }, []);

  const endDrag = useCallback((): SnapZoneDef | null => {
    setIsDragging(false);
    const id = hoveredSnapId.current;
    hoveredSnapId.current = null;
    return id ? (SNAP_ZONES.find(z => z.id === id) ?? null) : null;
  }, []);

  const setHoveredSnapId = useCallback((id: string | null) => {
    hoveredSnapId.current = id;
  }, []);

  return (
    <Ctx.Provider value={{ isDragging, cursorPos, hoveredSnapId, startDrag, endDrag, setHoveredSnapId }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSnap() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSnap must be inside SnapProvider");
  return ctx;
}
