import React, { useState, useRef, useCallback, useEffect } from "react";
import { useSnapLayout } from "../context/SnapLayoutContext";

export type ResizeEdge = "se" | "sw" | "ne" | "nw" | "e" | "w" | "s" | "n";

interface UseDraggablePopupOptions {
  id: string;
  isOpen: boolean;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  zIndex?: number;
}

export function useDraggablePopup({
  id,
  isOpen,
  defaultWidth = 800,
  defaultHeight = 640,
  minWidth = 520,
  minHeight = 420,
  zIndex = 50,
}: UseDraggablePopupOptions) {
  const { setDragging, activeSnaps, removeSnap, setDragPosition, previewSnap, snapPopup } = useSnapLayout();

  const [isMaximized, setIsMaximized] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: defaultWidth, h: defaultHeight });

  const posRef = useRef(pos);
  const sizeRef = useRef(size);
  posRef.current = pos;
  sizeRef.current = size;

  const activeSnap = activeSnaps[id] || "none";

  useEffect(() => {
    if (isOpen) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (vw <= 768) {
        setSize({ w: vw, h: vh });
        setPos({ x: 0, y: 0 });
        setIsMaximized(true);
      } else {
        const effMinWidth = Math.min(minWidth, vw);
        const effMinHeight = Math.min(minHeight, vh);
        const w = Math.max(effMinWidth, Math.min(defaultWidth, vw - 40));
        const h = Math.max(effMinHeight, Math.min(defaultHeight, vh - 40));
        setSize({ w, h });
        setPos({ x: Math.max(0, (vw - w) / 2), y: Math.max(0, (vh - h) / 2) });
        setIsMaximized(false);
      }
      removeSnap(id);
    }
  }, [isOpen, id, defaultWidth, defaultHeight, minWidth, minHeight]); // eslint-disable-line

  useEffect(() => {
    if (activeSnap === "none") return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setIsMaximized(false);

    let newPos = { x: 0, y: 0 };
    let newSize = { w: vw, h: vh };
    const margin = 12;

    switch (activeSnap) {
      case "full":
        newPos = { x: margin, y: margin };
        newSize = { w: vw - margin * 2, h: vh - margin * 2 };
        break;
      case "left-half":
        newPos = { x: margin, y: margin };
        newSize = { w: vw / 2 - margin * 1.5, h: vh - margin * 2 };
        break;
      case "right-half":
        newPos = { x: vw / 2 + margin * 0.5, y: margin };
        newSize = { w: vw / 2 - margin * 1.5, h: vh - margin * 2 };
        break;
      case "grid-tl":
        newPos = { x: margin, y: margin };
        newSize = { w: vw / 2 - margin * 1.5, h: vh / 2 - margin * 1.5 };
        break;
      case "grid-tr":
        newPos = { x: vw / 2 + margin * 0.5, y: margin };
        newSize = { w: vw / 2 - margin * 1.5, h: vh / 2 - margin * 1.5 };
        break;
      case "grid-bl":
        newPos = { x: margin, y: vh / 2 + margin * 0.5 };
        newSize = { w: vw / 2 - margin * 1.5, h: vh / 2 - margin * 1.5 };
        break;
      case "grid-br":
        newPos = { x: vw / 2 + margin * 0.5, y: vh / 2 + margin * 0.5 };
        newSize = { w: vw / 2 - margin * 1.5, h: vh / 2 - margin * 1.5 };
        break;
      // We kept third options for completeness, optionally they can have margins too
      case "left-third":
        newPos = { x: margin, y: margin };
        newSize = { w: vw / 3 - margin * 1.33, h: vh - margin * 2 };
        break;
      case "mid-third":
        newPos = { x: vw / 3 + margin * 0.5, y: margin };
        newSize = { w: vw / 3 - margin, h: vh - margin * 2 };
        break;
      case "right-third":
        newPos = { x: (vw * 2) / 3 + margin * 0.5, y: margin };
        newSize = { w: vw / 3 - margin * 1.5, h: vh - margin * 2 };
        break;
      case "left-two-thirds":
        newPos = { x: margin, y: margin };
        newSize = { w: (vw * 2) / 3 - margin * 1.5, h: vh - margin * 2 };
        break;
      case "right-two-thirds":
        newPos = { x: vw / 3 + margin * 0.5, y: margin };
        newSize = { w: (vw * 2) / 3 - margin * 1.5, h: vh - margin * 2 };
        break;
    }

    setPos(newPos);
    setSize(newSize);
  }, [activeSnap]);

  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  const onDragPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isMaximized) return;
      e.preventDefault();
      
      if (activeSnaps[id] && activeSnaps[id] !== "none") {
        removeSnap(id);
      }

      dragStart.current = {
        mx: e.clientX,
        my: e.clientY,
        px: posRef.current.x,
        py: posRef.current.y,
      };
      
      setDragging(true, id);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [isMaximized, id, activeSnaps, removeSnap, setDragging]
  );

  const onDragPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragStart.current) return;
      
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      
      const x = Math.max(0, Math.min(vw - sizeRef.current.w, dragStart.current.px + dx));
      const y = Math.max(0, Math.min(vh - sizeRef.current.h, dragStart.current.py + dy));
      
      setPos({ x, y });
      setDragPosition({ x: e.clientX, y: e.clientY });
    },
    [setDragPosition]
  );

  const onDragPointerUp = useCallback(() => {
    dragStart.current = null;
    setDragging(false, null);
    
    // Apply snap if active
    if (previewSnap && previewSnap !== "none") {
      snapPopup(id, previewSnap);
    }
  }, [setDragging, previewSnap, snapPopup, id]);

  const resizeStart = useRef<{
    mx: number;
    my: number;
    px: number;
    py: number;
    pw: number;
    ph: number;
    edge: ResizeEdge;
  } | null>(null);

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, edge: ResizeEdge) => {
      if (isMaximized) return;
      e.preventDefault();
      e.stopPropagation();

      if (activeSnaps[id] && activeSnaps[id] !== "none") {
        removeSnap(id);
      }

      resizeStart.current = {
        mx: e.clientX,
        my: e.clientY,
        px: posRef.current.x,
        py: posRef.current.y,
        pw: sizeRef.current.w,
        ph: sizeRef.current.h,
        edge,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [isMaximized, id, activeSnaps, removeSnap]
  );

  const onResizePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!resizeStart.current) return;
      const { mx, my, px, py, pw, ph, edge } = resizeStart.current;
      const dx = e.clientX - mx;
      const dy = e.clientY - my;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      
      let newW = pw, newH = ph, newX = px, newY = py;

      if (edge.includes("e")) newW = Math.max(minWidth, Math.min(vw - px, pw + dx));
      if (edge.includes("s")) newH = Math.max(minHeight, Math.min(vh - py, ph + dy));
      if (edge.includes("w")) {
        newW = Math.max(minWidth, pw - dx);
        newX = Math.min(px + pw - minWidth, px + dx);
      }
      if (edge.includes("n")) {
        newH = Math.max(minHeight, ph - dy);
        newY = Math.min(py + ph - minHeight, py + dy);
      }

      setPos({ x: newX, y: newY });
      setSize({ w: newW, h: newH });
    },
    [minWidth, minHeight]
  );

  const onResizePointerUp = useCallback(() => {
    resizeStart.current = null;
  }, []);

  const toggleMaximize = useCallback(() => {
    if (activeSnaps[id] && activeSnaps[id] !== "none") {
      removeSnap(id);
    }

    if (!isMaximized) {
      setPos({ x: 0, y: 0 });
      setSize({ w: window.innerWidth, h: window.innerHeight });
    } else {
      const w = Math.min(defaultWidth, window.innerWidth - 40);
      const h = Math.min(defaultHeight, window.innerHeight - 40);
      setPos({ x: (window.innerWidth - w) / 2, y: (window.innerHeight - h) / 2 });
      setSize({ w, h });
    }
    setIsMaximized((v) => !v);
  }, [isMaximized, id, activeSnaps, removeSnap, defaultWidth, defaultHeight]);

  const popupStyle: React.CSSProperties = isMaximized
    ? { left: 0, top: 0, width: "100vw", height: "100vh", borderRadius: 0 }
    : { left: pos.x, top: pos.y, width: size.w, height: size.h };

  const ResizeHandle = useCallback(({ edge, cursor, style }: { edge: ResizeEdge; cursor: string; style: React.CSSProperties }) => {
    return (
      <div
        style={{ position: "absolute", cursor, ...style, zIndex: zIndex + 3 }}
        onPointerDown={(e) => onResizePointerDown(e, edge)}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
      />
    );
  }, [onResizePointerDown, onResizePointerMove, onResizePointerUp, zIndex]);

  const renderResizeHandles = useCallback(() => {
    if (isMaximized) return null;
    return (
      <>
        <ResizeHandle edge="e" cursor="ew-resize" style={{ right: 0, top: 8, bottom: 8, width: 6 }} />
        <ResizeHandle edge="w" cursor="ew-resize" style={{ left: 0, top: 8, bottom: 8, width: 6 }} />
        <ResizeHandle edge="s" cursor="ns-resize" style={{ bottom: 0, left: 8, right: 8, height: 6 }} />
        <ResizeHandle edge="n" cursor="ns-resize" style={{ top: 0, left: 8, right: 8, height: 6 }} />
        <ResizeHandle edge="se" cursor="nwse-resize" style={{ right: 0, bottom: 0, width: 14, height: 14 }} />
        <ResizeHandle edge="sw" cursor="nesw-resize" style={{ left: 0, bottom: 0, width: 14, height: 14 }} />
        <ResizeHandle edge="ne" cursor="nesw-resize" style={{ right: 0, top: 0, width: 14, height: 14 }} />
        <ResizeHandle edge="nw" cursor="nwse-resize" style={{ left: 0, top: 0, width: 14, height: 14 }} />
      </>
    );
  }, [isMaximized, ResizeHandle]);

  return {
    pos,
    size,
    isMaximized,
    popupStyle,
    onDragPointerDown,
    onDragPointerMove,
    onDragPointerUp,
    toggleMaximize,
    renderResizeHandles
  };
}
