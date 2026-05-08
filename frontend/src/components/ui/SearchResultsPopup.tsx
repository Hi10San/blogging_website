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
import { useDraggablePopup } from "../../hooks/useDraggablePopup";

interface SearchResultsPopupProps {
  open: boolean;
  query: string;
  mode: "users" | "blogs";
  onClose: () => void;
  onReadBlog: (blog: any) => void;
  onViewProfile?: (username: string) => void;
  zIndex?: number;
  onBringToFront?: () => void;
}

const MIN_W = 520;
const MIN_H = 420;

export const SearchResultsPopup: React.FC<SearchResultsPopupProps> = ({ open, query, mode, onClose, onReadBlog, onViewProfile, zIndex = 50, onBringToFront }) => {
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

  // ── Geometry & Drag/Resize ─────────────────────────────
  const {
    pos,
    size,
    isMaximized,
    popupStyle,
    onDragPointerDown,
    onDragPointerMove,
    onDragPointerUp,
    toggleMaximize,
    renderResizeHandles
  } = useDraggablePopup({
    id: "searchResults",
    isOpen: open,
    defaultWidth: 720,
    defaultHeight: 560,
    minWidth: MIN_W,
    minHeight: MIN_H,
    zIndex
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="search-popup"
            initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.25, ease: [0.32, 0, 0.24, 1] }}
            onPointerDown={() => onBringToFront?.()}
            style={{ position: "fixed", zIndex: zIndex + 2, display: "flex", flexDirection: "column", overflow: "hidden", ...popupStyle, minWidth: MIN_W, minHeight: MIN_H, maxWidth: "100vw", maxHeight: "100vh" }}
            className="bg-card/98 backdrop-blur-2xl border border-border shadow-2xl rounded-[20px]"
          >
            {!isMaximized && renderResizeHandles()}

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
