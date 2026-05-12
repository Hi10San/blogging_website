import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { fetchUserPosts, deletePost } from "../../lib/api";
import {
  Cancel01Icon,
  Maximize01Icon,
  Minimize01Icon,
  Move01Icon,
  TextIcon,
  MoreVerticalIcon,
  PencilEdit02Icon,
  Delete02Icon,
  EyeIcon,
} from "@hugeicons/core-free-icons";
import { useDraggablePopup } from "../../hooks/useDraggablePopup";

interface MyBlogsPopupProps {
  open: boolean;
  onClose: () => void;
  zIndex?: number;
  onBringToFront?: () => void;
}

const MIN_W = 520;
const MIN_H = 420;

export const MyBlogsPopup: React.FC<MyBlogsPopupProps> = ({ open, onClose, zIndex = 50, onBringToFront }) => {
  // ── Data ───────────────────────────────────────────────
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadBlogs = async () => {
    setLoading(true);
    try {
      const data = await fetchUserPosts();
      setBlogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this blog?")) return;
    try {
      await deletePost(id);
      setBlogs((prev) => prev.filter(b => b._id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete blog.");
    }
  };

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
    id: "myBlogs",
    isOpen: open,
    defaultWidth: 720,
    defaultHeight: 560,
    minWidth: MIN_W,
    minHeight: MIN_H,
    zIndex
  });

  useEffect(() => {
    if (open) {
      loadBlogs();
    }
  }, [open]);

  // ── Refs ───────────────────────────────────────────────
  const popupRef = useRef<HTMLDivElement>(null);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Popup */}
          <motion.div
            key="myblogs-popup"
            ref={popupRef}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.25, ease: [0.32, 0, 0.24, 1] }}
            onPointerDown={() => onBringToFront?.()}
            style={{
              position: "fixed",
              zIndex: zIndex + 2,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              ...popupStyle,
              maxWidth: "100vw",
              maxHeight: "100dvh",
            }}
            className="bg-card/98 backdrop-blur-2xl border border-border shadow-2xl rounded-[20px]"
          >
            {/* ── Resize Handles ──────────────────────── */}
            {!isMaximized && renderResizeHandles()}

            {/* ── Title Bar ───────────────────────────── */}
            <div
              className="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0 select-none"
              style={{ cursor: isMaximized ? "default" : "grab" }}
              onPointerDown={onDragPointerDown}
              onPointerMove={onDragPointerMove}
              onPointerUp={onDragPointerUp}
            >
              {/* Drag icon */}
              <HugeiconsIcon
                icon={Move01Icon}
                size={16}
                className="text-muted-foreground/40 flex-shrink-0"
              />

              {/* Title */}
              <span className="text-[13px] font-semibold text-foreground tracking-tight flex-1 text-center">
                My Blogs
              </span>

              {/* Window controls */}
              <div className="flex items-center gap-1 flex-shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                {/* Maximize */}
                <button
                  title={isMaximized ? "Restore" : "Maximize"}
                  onClick={toggleMaximize}
                  className="p-1.5 rounded-lg hover:bg-muted transition-all duration-75 text-muted-foreground hover:text-foreground"
                >
                  <HugeiconsIcon icon={isMaximized ? Minimize01Icon : Maximize01Icon} size={15} />
                </button>

                {/* Close */}
                <button
                  title="Close"
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-destructive/15 transition-all duration-75 text-muted-foreground hover:text-destructive"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={15} />
                </button>
              </div>
            </div>

            {/* ── Content ─────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Your Articles</h2>
                <button onClick={loadBlogs} className="text-sm text-muted-foreground hover:text-foreground">Refresh</button>
              </div>
              
              {loading ? (
                <div className="text-center py-10 text-muted-foreground">Loading...</div>
              ) : blogs.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">You haven't written any blogs yet.</div>
              ) : (
                <div className="space-y-3">
                  {blogs.map((blog) => (
                    <div key={blog._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div>
                        <h3 className="font-semibold text-[15px]">{blog.title || "Untitled"}</h3>
                        <div className="flex items-center gap-3 mt-1.5 text-[12px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <HugeiconsIcon icon={TextIcon} size={12} />
                            {blog.status || "Published"}
                          </span>
                          <span>•</span>
                          <span>{new Date(blog.date).toLocaleDateString()}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <HugeiconsIcon icon={EyeIcon} size={12} />
                            {blog.views || 0} views
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3 sm:mt-0">
                        <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                          <HugeiconsIcon icon={PencilEdit02Icon} size={16} />
                        </button>
                        <button onClick={() => handleDelete(blog._id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                          <HugeiconsIcon icon={Delete02Icon} size={16} />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                          <HugeiconsIcon icon={MoreVerticalIcon} size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resize grip corner indicator */}
            {!isMaximized && (
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 pointer-events-none">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-muted-foreground/30">
                  <path d="M12 2L2 12M12 7L7 12M12 12L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MyBlogsPopup;
