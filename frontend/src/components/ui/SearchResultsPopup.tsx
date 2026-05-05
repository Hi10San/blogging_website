import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { fetchPosts, searchUsers } from "../../lib/api";
import {
  Cancel01Icon,
  Maximize01Icon,
  Minimize01Icon,
  Move01Icon,
  EyeIcon,
  UserEdit01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";

interface SearchResultsPopupProps {
  open: boolean;
  query: string;
  mode: "users" | "blogs";
  onClose: () => void;
  onReadBlog: (blog: any) => void;
  onViewProfile?: (username: string) => void;
}

const MIN_W = 520;
const MIN_H = 420;

export const SearchResultsPopup: React.FC<SearchResultsPopupProps> = ({ open, query, mode, onClose, onReadBlog, onViewProfile }) => {
  // ── Data ───────────────────────────────────────────────
  const [blogs, setBlogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadResults = async () => {
    if (!query) return;
    setLoading(true);
    try {
      if (mode === "blogs") {
        const data = await fetchPosts(query);
        // Filter out drafts since this is a public search
        const publishedOnly = data.filter((b: any) => b.status !== "Draft");
        setBlogs(publishedOnly);
      } else {
        const data = await searchUsers(query);
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && query) {
      loadResults();
    }
  }, [open, query, mode]);

  // ── Geometry ───────────────────────────────────────────
  const [isMaximized, setIsMaximized] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 720, h: 560 });
  const posRef = useRef(pos);
  const sizeRef = useRef(size);
  posRef.current = pos;
  sizeRef.current = size;

  useEffect(() => {
    if (open) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(720, vw - 40);
      const h = Math.min(560, vh - 40);
      setSize({ w, h });
      setPos({ x: (vw - w) / 2, y: (vh - h) / 2 });
      setIsMaximized(false);
    }
  }, [open]);

  // ── Drag & Resize logic is identical to MyBlogsPopup ──
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
      const w = Math.min(720, window.innerWidth - 40), h = Math.min(560, window.innerHeight - 40);
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

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="search-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            key="search-popup"
            initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.25, ease: [0.32, 0, 0.24, 1] }}
            style={{ position: "fixed", zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden", ...popupStyle, minWidth: MIN_W, minHeight: MIN_H, maxWidth: "100vw", maxHeight: "100vh" }}
            className="bg-background/98 backdrop-blur-2xl border border-border shadow-2xl rounded-[20px]"
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

            <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0 select-none" style={{ cursor: isMaximized ? "default" : "grab" }} onPointerDown={onDragPointerDown} onPointerMove={onDragPointerMove} onPointerUp={onDragPointerUp}>
              <HugeiconsIcon icon={Move01Icon} size={16} className="text-muted-foreground/40 flex-shrink-0" />
              <span className="text-[13px] font-semibold text-foreground tracking-tight flex-1 text-center truncate">
                Search Results: "{query}"
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

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loading ? (
                <div className="text-center py-10 text-muted-foreground">Searching...</div>
              ) : mode === "blogs" ? (
                blogs.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">No blogs found for "{query}".</div>
                ) : (
                  <div className="space-y-3">
                    {blogs.map((blog) => (
                      <div key={blog._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                        <div className="flex-1 min-w-0 pr-4">
                          <h3 className="font-semibold text-[15px] truncate">{blog.title || "Untitled"}</h3>
                          <div className="flex items-center gap-3 mt-1.5 text-[12px] text-muted-foreground truncate">
                            <span className="flex items-center gap-1 truncate">
                              <HugeiconsIcon icon={UserEdit01Icon} size={12} />
                              {blog.author}
                            </span>
                            <span>•</span>
                            <span>{new Date(blog.date).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <HugeiconsIcon icon={EyeIcon} size={12} />
                              {blog.views || 0}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center mt-3 sm:mt-0 flex-shrink-0">
                          <button 
                            onClick={() => onReadBlog(blog)} 
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background font-medium text-[13px] hover:opacity-90 transition-opacity"
                          >
                            Read
                            <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                users.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">No users found for "{query}".</div>
                ) : (
                  <div className="space-y-3">
                    {users.map((user) => (
                      <div key={user._id || user.username} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                        <div className="flex-1 min-w-0 pr-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground font-semibold">
                            {user.username?.charAt(0).toUpperCase() || "U"}
                          </div>
                          <div>
                              <h3 className="font-semibold text-[15px] truncate">{user.username || "Unknown"}</h3>
                              <div className="text-[12px] text-muted-foreground truncate">
                                {user.followersCount || 0} followers • {user.followingCount || 0} following
                              </div>
                          </div>
                        </div>

                        <div className="flex items-center mt-3 sm:mt-0 flex-shrink-0">
                          <button 
                            onClick={() => onViewProfile && onViewProfile(user.username)} 
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background font-medium text-[13px] hover:opacity-90 transition-opacity"
                          >
                            View Profile
                            <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
            
            {!isMaximized && (
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 pointer-events-none">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-muted-foreground/30"><path d="M12 2L2 12M12 7L7 12M12 12L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SearchResultsPopup;
