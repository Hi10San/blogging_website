import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { fetchUserProfile, fetchUserPublicPosts, getAuth, toggleFollow } from "../../lib/api";
import {
  Cancel01Icon,
  Move01Icon,
  UserEdit01Icon,
  Calendar01Icon,
  ViewIcon,
  UserAdd01Icon,
  UserRemove01Icon,
} from "@hugeicons/core-free-icons";
import { useDraggablePopup } from "../../hooks/useDraggablePopup";

interface PublicProfilePopupProps {
  username: string;
  open: boolean;
  onClose: () => void;
  onBlogClick: (blog: any) => void;
  zIndex?: number;
  onBringToFront?: () => void;
}

const MIN_W = 360;
const MIN_H = 360;

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

export const PublicProfilePopup: React.FC<PublicProfilePopupProps> = ({
  username,
  open,
  onClose,
  onBlogClick,
  zIndex = 50,
  onBringToFront,
}) => {
  const [profile, setProfile] = useState<any>(null);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  useEffect(() => {
    if (open && username) {
      setLoading(true);
      setError("");
      setProfile(null);
      setBlogs([]);
      Promise.all([
        fetchUserProfile(username),
        fetchUserPublicPosts(username),
      ])
        .then(([profileData, blogsData]) => {
          setProfile(profileData);
          setFollowersCount(profileData.followersCount ?? 0);
          setBlogs(blogsData.filter((b: any) => b.status !== "Draft"));

          // Determine if the current user already follows this person
          const { user } = getAuth();
          if (user?.following) {
            setIsFollowing((user.following as string[]).includes(username));
          }
        })
        .catch((err) => setError(err.message || "Failed to load profile."))
        .finally(() => setLoading(false));
    }
  }, [open, username]);

  const handleFollowToggle = async () => {
    setFollowLoading(true);
    try {
      const result = await toggleFollow(username);
      setIsFollowing(result.isFollowing);
      setFollowersCount(result.followersCount);
    } catch (e) {
      // Silently ignore
    } finally {
      setFollowLoading(false);
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
    id: `publicProfile-${username}`,
    isOpen: open && !!username,
    defaultWidth: 440,
    defaultHeight: 540,
    minWidth: MIN_W,
    minHeight: MIN_H,
    zIndex
  });

  const { user: currentUser } = getAuth();
  const isSelf = currentUser?.username === username;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="public-profile-popup"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.25, ease: [0.32, 0, 0.24, 1] }}
            onPointerDown={() => onBringToFront?.()}
            style={{ position: "fixed", zIndex: zIndex + 2, display: "flex", flexDirection: "column", overflow: "hidden", ...popupStyle, maxWidth: "100vw", maxHeight: "100dvh" }}
            className="bg-card/98 backdrop-blur-2xl border border-border shadow-2xl rounded-[20px] overflow-hidden"
          >
            {/* Resize handles */}
            {!isMaximized && renderResizeHandles()}

            {/* Drag header */}
            <div
              className="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0 select-none cursor-grab active:cursor-grabbing"
              onPointerDown={onDragPointerDown}
              onPointerMove={onDragPointerMove}
              onPointerUp={onDragPointerUp}
            >
              <HugeiconsIcon icon={Move01Icon} size={16} className="text-muted-foreground/40 flex-shrink-0" />
              <span className="text-[13px] font-semibold text-foreground tracking-tight flex-1 text-center truncate">
                {username ? `@${username}` : "Profile"}
              </span>
              <div onPointerDown={(e) => e.stopPropagation()}>
                <button
                  title="Close"
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-destructive/15 transition-all duration-75 text-muted-foreground hover:text-destructive flex-shrink-0"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={15} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50" />
                  <span className="text-sm">Loading profile...</span>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full px-6">
                  <p className="text-sm text-destructive text-center">{error}</p>
                </div>
              ) : profile && (
                <div className="flex flex-col">
                  {/* Profile Hero */}
                  <div className="relative px-6 pt-8 pb-6 flex flex-col items-center border-b border-border/50">
                    {/* Avatar */}
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getGradient(username)} border-2 border-border flex items-center justify-center mb-4 shadow-lg`}>
                      <span className="text-3xl font-bold text-foreground/80 uppercase">
                        {username.charAt(0)}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-foreground mb-0.5">@{profile.username}</h2>
                    <p className="text-sm text-muted-foreground mb-5">Author on Hi10 Blog</p>

                    {/* Stats */}
                    <div className="flex items-center gap-8 mb-5">
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-foreground">{followersCount}</span>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Followers</span>
                      </div>
                      <div className="w-px h-8 bg-border" />
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-foreground">{profile.followingCount}</span>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Following</span>
                      </div>
                      <div className="w-px h-8 bg-border" />
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-foreground">{blogs.length}</span>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Blogs</span>
                      </div>
                    </div>

                    {/* Follow button (hidden if viewing own profile) */}
                    {!isSelf && currentUser && (
                      <button
                        onClick={handleFollowToggle}
                        disabled={followLoading}
                        className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                          isFollowing
                            ? "bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive border border-border hover:border-destructive/30"
                            : "bg-foreground text-background hover:opacity-90"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <HugeiconsIcon
                          icon={isFollowing ? UserRemove01Icon : UserAdd01Icon}
                          size={15}
                        />
                        {followLoading ? "..." : isFollowing ? "Unfollow" : "Follow"}
                      </button>
                    )}
                  </div>

                  {/* Blogs section */}
                  <div className="p-4">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">
                      Published Blogs
                    </h3>
                    {blogs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                        <HugeiconsIcon icon={UserEdit01Icon} size={28} className="text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">No published blogs yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {blogs.map((blog, idx) => (
                          <motion.button
                            key={blog._id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05, duration: 0.2 }}
                            onClick={() => {
                              onClose();
                              onBlogClick(blog);
                            }}
                            className="w-full text-left p-4 rounded-[14px] border border-border/40 bg-muted/20 hover:bg-muted/60 transition-all duration-100 flex flex-col gap-1.5 group"
                          >
                            <h4 className="font-semibold text-[14px] text-foreground group-hover:text-foreground/80 transition-colors line-clamp-1">
                              {blog.title}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {blog.content}
                            </p>
                            <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <HugeiconsIcon icon={Calendar01Icon} size={11} />
                                {new Date(blog.date).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <HugeiconsIcon icon={ViewIcon} size={11} />
                                {blog.views ?? 0} views
                              </span>
                              {blog.tags?.length > 0 && (
                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md font-medium">
                                  {blog.tags[0]}
                                </span>
                              )}
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
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

export default PublicProfilePopup;
