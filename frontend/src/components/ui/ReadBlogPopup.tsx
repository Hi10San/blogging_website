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
import { useDraggablePopup } from "../../hooks/useDraggablePopup";

interface ReadBlogPopupProps {
  blog: any | null;
  onClose: () => void;
  zIndex?: number;
  onBringToFront?: () => void;
}

const MIN_W = 520;
const MIN_H = 420;

export const ReadBlogPopup: React.FC<ReadBlogPopupProps> = ({ blog, onClose, zIndex = 50, onBringToFront }) => {
  const [isFollowing, setIsFollowing] = useState(false);

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
    id: "readBlog",
    isOpen: !!blog,
    defaultWidth: 800,
    defaultHeight: 640,
    minWidth: MIN_W,
    minHeight: MIN_H,
    zIndex
  });

  useEffect(() => {
    if (blog) {
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

  if (!blog) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="read-popup"
        initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ duration: 0.25, ease: [0.32, 0, 0.24, 1] }}
        onPointerDown={() => onBringToFront?.()}
        style={{ position: "fixed", zIndex: zIndex + 2, display: "flex", flexDirection: "column", overflow: "hidden", ...popupStyle, maxWidth: "100vw", maxHeight: "100vh" }}
        className="bg-card border border-border shadow-2xl rounded-[20px]"
      >
        {!isMaximized && renderResizeHandles()}

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
