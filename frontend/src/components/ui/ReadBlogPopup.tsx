import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Maximize01Icon,
  Minimize01Icon,
  Move01Icon,
  UserEdit01Icon,
  EyeIcon,
  UserAdd01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { toggleFollow, getAuth } from "../../lib/api";

interface ReadBlogPopupProps {
  blog: any | null;
  onClose: () => void;
}

const MIN_W = 520;
const MIN_H = 420;

export const ReadBlogPopup: React.FC<ReadBlogPopupProps> = ({ blog, onClose }) => {
  const [isFollowing, setIsFollowing] = useState(false);

  // ── Geometry ───────────────────────────────────────────
  const [isMaximized, setIsMaximized] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 800, h: 640 });
  const posRef = useRef(pos);
  const sizeRef = useRef(size);
  posRef.current = pos;
  sizeRef.current = size;

  useEffect(() => {
    if (blog) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(800, vw - 40);
      const h = Math.min(640, vh - 40);
      setSize({ w, h });
      setPos({ x: (vw - w) / 2, y: (vh - h) / 2 });
      setIsMaximized(false);

      // Check if we are following this user
      const { user } = getAuth();
      if (user && user.following && user.following.includes(blog.author)) {
        setIsFollowing(true);
      } else {
        setIsFollowing(false);
      }
    }
  }, [blog]);

  const handleFollow = async () => {
    if (!blog) return;
    try {
      const res = await toggleFollow(blog.author);
      setIsFollowing(res.isFollowing);
      
      // Update local storage so it persists
      const auth = getAuth();
      if (auth.user) {
        if (res.isFollowing) {
          auth.user.following.push(blog.author);
        } else {
          auth.user.following = auth.user.following.filter((u: string) => u !== blog.author);
        }
        localStorage.setItem('hi10_user', JSON.stringify(auth.user));
      }
    } catch (err: any) {
      alert(err.message || "Failed to follow user");
    }
  };

  // ── Drag ───────────────────────────────────────────────
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  const onDragPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isMaximized) return;
    e.preventDefault();
    dragStart.current = { mx: e.clientX, my: e.clientY, px: posRef.current.x, py: posRef.current.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [isMaximized]);

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

  // ── Resize ─────────────────────────────────────────────
  type ResizeEdge = "se" | "sw" | "ne" | "nw" | "e" | "w" | "s" | "n";
  const resizeStart = useRef<{ mx: number; my: number; px: number; py: number; pw: number; ph: number; edge: ResizeEdge; } | null>(null);

  const onResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, edge: ResizeEdge) => {
    if (isMaximized) return;
    e.preventDefault(); e.stopPropagation();
    resizeStart.current = { mx: e.clientX, my: e.clientY, px: posRef.current.x, py: posRef.current.y, pw: sizeRef.current.w, ph: sizeRef.current.h, edge };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [isMaximized]);

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

  const toggleMaximize = () => {
    if (!isMaximized) {
      setPos({ x: 0, y: 0 }); setSize({ w: window.innerWidth, h: window.innerHeight });
    } else {
      const w = Math.min(800, window.innerWidth - 40), h = Math.min(640, window.innerHeight - 40);
      setPos({ x: (window.innerWidth - w) / 2, y: (window.innerHeight - h) / 2 }); setSize({ w, h });
    }
    setIsMaximized((v) => !v);
  };

  const ResizeHandle = ({ edge, cursor, style }: { edge: ResizeEdge; cursor: string; style: React.CSSProperties }) => (
    <div style={{ position: "absolute", cursor, ...style, zIndex: 60 }} onPointerDown={(e) => onResizePointerDown(e, edge)} onPointerMove={onResizePointerMove} onPointerUp={onResizePointerUp} />
  );

  const popupStyle: React.CSSProperties = isMaximized
    ? { left: 0, top: 0, width: "100vw", height: "100vh", borderRadius: 0 }
    : { left: pos.x, top: pos.y, width: size.w, height: size.h };

  if (!blog) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="read-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        key="read-popup"
        initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ duration: 0.25, ease: [0.32, 0, 0.24, 1] }}
        style={{ position: "fixed", zIndex: 61, display: "flex", flexDirection: "column", overflow: "hidden", ...popupStyle, minWidth: MIN_W, minHeight: MIN_H, maxWidth: "100vw", maxHeight: "100vh" }}
        className="bg-background border border-border shadow-2xl rounded-[20px]"
      >
        {!isMaximized && (
          <>
            <ResizeHandle edge="e"  cursor="ew-resize"   style={{ right: 0, top: 8, bottom: 8, width: 6 }} />
            <ResizeHandle edge="w"  cursor="ew-resize"   style={{ left: 0, top: 8, bottom: 8, width: 6 }} />
            <ResizeHandle edge="s"  cursor="ns-resize"   style={{ bottom: 0, left: 8, right: 8, height: 6 }} />
            <ResizeHandle edge="n"  cursor="ns-resize"   style={{ top: 0, left: 8, right: 8, height: 6 }} />
            <ResizeHandle edge="se" cursor="nwse-resize" style={{ right: 0, bottom: 0, width: 14, height: 14 }} />
            <ResizeHandle edge="sw" cursor="nesw-resize" style={{ left: 0, bottom: 0, width: 14, height: 14 }} />
            <ResizeHandle edge="ne" cursor="nesw-resize" style={{ right: 0, top: 0, width: 14, height: 14 }} />
            <ResizeHandle edge="nw" cursor="nwse-resize" style={{ left: 0, top: 0, width: 14, height: 14 }} />
          </>
        )}

        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30 flex-shrink-0 select-none" style={{ cursor: isMaximized ? "default" : "grab" }} onPointerDown={onDragPointerDown} onPointerMove={onDragPointerMove} onPointerUp={onDragPointerUp}>
          <HugeiconsIcon icon={Move01Icon} size={16} className="text-muted-foreground/40 flex-shrink-0" />
          <span className="text-[13px] font-semibold text-muted-foreground tracking-tight flex-1 truncate">
            Reading: {blog.title}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0" onPointerDown={(e) => e.stopPropagation()}>
            <button title={isMaximized ? "Restore" : "Maximize"} onClick={toggleMaximize} className="p-1.5 rounded-lg hover:bg-muted transition-all duration-75 text-muted-foreground hover:text-foreground">
              <HugeiconsIcon icon={isMaximized ? Minimize01Icon : Maximize01Icon} size={15} />
            </button>
            <button title="Close" onClick={onClose} className="p-1.5 rounded-lg hover:bg-destructive/15 transition-all duration-75 text-muted-foreground hover:text-destructive">
              <HugeiconsIcon icon={Cancel01Icon} size={15} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative">
          {blog.cover && (
            <div className="w-full h-48 sm:h-64 relative">
              <img src={blog.cover} alt="Cover" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            </div>
          )}
          
          <div className={`max-w-3xl mx-auto px-6 sm:px-12 pb-16 ${blog.cover ? '-mt-16 relative z-10' : 'pt-12'}`}>
            <div className="mb-8">
              {blog.tags && blog.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-4">
                  {blog.tags.map((t: string) => (
                    <span key={t} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-foreground mb-6">
                {blog.title}
              </h1>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground border-y border-border py-4">
                <div className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={UserEdit01Icon} size={16} />
                  <span className="font-medium text-foreground">{blog.author}</span>
                  
                  {blog.author !== getAuth().user?.username && blog.author !== getAuth().user?.email && (
                    <button
                      onClick={handleFollow}
                      className={`ml-2 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                        isFollowing 
                          ? "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive" 
                          : "bg-foreground text-background hover:opacity-90"
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <HugeiconsIcon icon={Tick01Icon} size={12} />
                          Following
                        </>
                      ) : (
                        <>
                          <HugeiconsIcon icon={UserAdd01Icon} size={12} />
                          Follow
                        </>
                      )}
                    </button>
                  )}
                </div>
                <span>•</span>
                <span>{new Date(blog.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={EyeIcon} size={16} />
                  <span>{blog.views || 0} views</span>
                </div>
              </div>
            </div>

            <div 
              className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-semibold"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />
          </div>
        </div>

        {!isMaximized && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 pointer-events-none">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-muted-foreground/30"><path d="M12 2L2 12M12 7L7 12M12 12L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default ReadBlogPopup;
