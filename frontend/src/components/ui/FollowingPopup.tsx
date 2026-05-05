import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { fetchFollowing } from "../../lib/api";
import {
  Cancel01Icon,
  Move01Icon,
  UserMultiple02Icon,
  UserAdd01Icon,
} from "@hugeicons/core-free-icons";

interface FollowingUser {
  username: string;
  followersCount: number;
  followingCount: number;
}

interface FollowingPopupProps {
  open: boolean;
  onClose: () => void;
  onUserClick: (username: string) => void;
}

const MIN_W = 340;
const MIN_H = 300;

const AVATAR_GRADIENTS = [
  "from-violet-500/30 to-indigo-500/30",
  "from-rose-500/30 to-orange-500/30",
  "from-emerald-500/30 to-teal-500/30",
  "from-sky-500/30 to-blue-500/30",
  "from-amber-500/30 to-yellow-500/30",
  "from-pink-500/30 to-fuchsia-500/30",
];

function getGradient(username: string) {
  const code = username.charCodeAt(0) + (username.charCodeAt(1) || 0);
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
}

export const FollowingPopup: React.FC<FollowingPopupProps> = ({ open, onClose, onUserClick }) => {
  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setLoading(true);
      setError("");
      fetchFollowing()
        .then((data) => setFollowing(data))
        .catch((err) => setError(err.message || "Failed to load following list."))
        .finally(() => setLoading(false));
    }
  }, [open]);

  // ── Geometry ────────────────────────────────────────────
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 400, h: 460 });
  const posRef = useRef(pos);
  const sizeRef = useRef(size);
  posRef.current = pos;
  sizeRef.current = size;

  useEffect(() => {
    if (open) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(400, vw - 40);
      const h = Math.min(460, vh - 40);
      setSize({ w, h });
      setPos({ x: (vw - w) / 2, y: (vh - h) / 2 });
    }
  }, [open]);

  // ── Drag ────────────────────────────────────────────────
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  const onDragPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragStart.current = { mx: e.clientX, my: e.clientY, px: posRef.current.x, py: posRef.current.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onDragPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    const vw = window.innerWidth, vh = window.innerHeight;
    const x = Math.max(0, Math.min(vw - sizeRef.current.w, dragStart.current.px + dx));
    const y = Math.max(0, Math.min(vh - sizeRef.current.h, dragStart.current.py + dy));
    setPos({ x, y });
  }, []);

  const onDragPointerUp = useCallback(() => { dragStart.current = null; }, []);

  // ── Resize ──────────────────────────────────────────────
  type ResizeEdge = "se" | "sw" | "ne" | "nw" | "e" | "w" | "s" | "n";
  const resizeStart = useRef<{
    mx: number; my: number; px: number; py: number; pw: number; ph: number; edge: ResizeEdge;
  } | null>(null);

  const onResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, edge: ResizeEdge) => {
    e.preventDefault(); e.stopPropagation();
    resizeStart.current = {
      mx: e.clientX, my: e.clientY,
      px: posRef.current.x, py: posRef.current.y,
      pw: sizeRef.current.w, ph: sizeRef.current.h,
      edge,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeStart.current) return;
    const { mx, my, px, py, pw, ph, edge } = resizeStart.current;
    const dx = e.clientX - mx, dy = e.clientY - my;
    const vw = window.innerWidth, vh = window.innerHeight;
    let newW = pw, newH = ph, newX = px, newY = py;
    if (edge.includes("e")) newW = Math.max(MIN_W, Math.min(vw - px, pw + dx));
    if (edge.includes("s")) newH = Math.max(MIN_H, Math.min(vh - py, ph + dy));
    if (edge.includes("w")) { newW = Math.max(MIN_W, pw - dx); newX = Math.min(px + pw - MIN_W, px + dx); }
    if (edge.includes("n")) { newH = Math.max(MIN_H, ph - dy); newY = Math.min(py + ph - MIN_H, py + dy); }
    setPos({ x: newX, y: newY });
    setSize({ w: newW, h: newH });
  }, []);

  const onResizePointerUp = useCallback(() => { resizeStart.current = null; }, []);

  const ResizeHandle = ({ edge, cursor, style }: { edge: ResizeEdge; cursor: string; style: React.CSSProperties }) => (
    <div
      style={{ position: "absolute", cursor, ...style, zIndex: 60 }}
      onPointerDown={(e) => onResizePointerDown(e, edge)}
      onPointerMove={onResizePointerMove}
      onPointerUp={onResizePointerUp}
    />
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="following-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            key="following-popup"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.25, ease: [0.32, 0, 0.24, 1] }}
            style={{
              position: "fixed", zIndex: 50, display: "flex", flexDirection: "column",
              left: pos.x, top: pos.y, width: size.w, height: size.h,
              minWidth: MIN_W, minHeight: MIN_H, maxWidth: "100vw", maxHeight: "100vh",
            }}
            className="bg-background/98 backdrop-blur-2xl border border-border shadow-2xl rounded-[20px] overflow-hidden"
          >
            {/* Resize handles */}
            <ResizeHandle edge="e"  cursor="ew-resize"   style={{ right: 0, top: 8, bottom: 8, width: 6 }} />
            <ResizeHandle edge="w"  cursor="ew-resize"   style={{ left: 0, top: 8, bottom: 8, width: 6 }} />
            <ResizeHandle edge="s"  cursor="ns-resize"   style={{ bottom: 0, left: 8, right: 8, height: 6 }} />
            <ResizeHandle edge="n"  cursor="ns-resize"   style={{ top: 0, left: 8, right: 8, height: 6 }} />
            <ResizeHandle edge="se" cursor="nwse-resize" style={{ right: 0, bottom: 0, width: 14, height: 14 }} />
            <ResizeHandle edge="sw" cursor="nesw-resize" style={{ left: 0, bottom: 0, width: 14, height: 14 }} />
            <ResizeHandle edge="ne" cursor="nesw-resize" style={{ right: 0, top: 0, width: 14, height: 14 }} />
            <ResizeHandle edge="nw" cursor="nwse-resize" style={{ left: 0, top: 0, width: 14, height: 14 }} />

            {/* Drag header */}
            <div
              className="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0 select-none cursor-grab active:cursor-grabbing"
              onPointerDown={onDragPointerDown}
              onPointerMove={onDragPointerMove}
              onPointerUp={onDragPointerUp}
            >
              <HugeiconsIcon icon={Move01Icon} size={16} className="text-muted-foreground/40 flex-shrink-0" />
              <div className="flex items-center gap-2 flex-1 justify-center">
                <HugeiconsIcon icon={UserMultiple02Icon} size={15} className="text-muted-foreground" />
                <span className="text-[13px] font-semibold text-foreground tracking-tight">Following</span>
                {following.length > 0 && (
                  <span className="text-[10px] font-medium bg-foreground/10 text-foreground px-1.5 py-0.5 rounded-md">
                    {following.length}
                  </span>
                )}
              </div>
              <button
                title="Close"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-destructive/15 transition-all duration-75 text-muted-foreground hover:text-destructive flex-shrink-0"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50" />
                  <span className="text-sm">Loading...</span>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full px-6">
                  <p className="text-sm text-destructive text-center">{error}</p>
                </div>
              ) : following.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center">
                    <HugeiconsIcon icon={UserAdd01Icon} size={26} className="text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">Not following anyone yet</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Discover authors and follow them to stay updated with their blogs.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 space-y-1">
                  {following.map((user, idx) => (
                    <motion.button
                      key={user.username}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.2 }}
                      onClick={() => {
                        onClose();
                        onUserClick(user.username);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-[14px] hover:bg-muted/70 transition-all duration-100 text-left group"
                    >
                      {/* Gradient avatar */}
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getGradient(user.username)} border border-border/60 flex items-center justify-center flex-shrink-0`}>
                        <span className="text-sm font-bold text-foreground/80 uppercase">
                          {user.username.charAt(0)}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">@{user.username}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {user.followersCount} followers · {user.followingCount} following
                        </p>
                      </div>

                      <svg
                        className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors flex-shrink-0"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Resize corner hint */}
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 pointer-events-none">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-muted-foreground/30">
                <path d="M12 2L2 12M12 7L7 12M12 12L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FollowingPopup;
