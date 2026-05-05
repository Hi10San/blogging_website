import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  updateProfile, getAuth, saveAuth, fetchUserPosts,
  fetchUserProfile, fetchFollowers, fetchFollowing,
  removeFollower, toggleFollow,
} from "../../lib/api";
import {
  Cancel01Icon, Move01Icon, UserEdit01Icon, Tick01Icon,
  PencilEdit02Icon, Camera01Icon, Calendar01Icon, ViewIcon,
  ArrowLeft01Icon, UserRemove01Icon,
} from "@hugeicons/core-free-icons";

interface ProfilePopupProps {
  open: boolean;
  onClose: () => void;
  onBlogClick?: (blog: any) => void;
}

const MIN_W = 360;
const MIN_H = 400;

const GRADIENTS = [
  "from-violet-500/30 to-indigo-500/30",
  "from-rose-500/30 to-orange-500/30",
  "from-emerald-500/30 to-teal-500/30",
  "from-sky-500/30 to-blue-500/30",
  "from-amber-500/30 to-yellow-500/30",
  "from-pink-500/30 to-fuchsia-500/30",
];

function getGradient(u: string) {
  if (!u) return GRADIENTS[0];
  return GRADIENTS[(u.charCodeAt(0) + (u.charCodeAt(1) || 0)) % GRADIENTS.length];
}

type Panel = "main" | "followers" | "following";

export const ProfilePopup: React.FC<ProfilePopupProps> = ({ open, onClose, onBlogClick }) => {
  const [username, setUsername] = useState("");
  const [editingUsername, setEditingUsername] = useState(false);
  const [draftUsername, setDraftUsername] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [blogs, setBlogs] = useState<any[]>([]);
  const [blogsLoading, setBlogsLoading] = useState(false);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [panel, setPanel] = useState<Panel>("main");
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [removingUser, setRemovingUser] = useState<string | null>(null);

  const loadProfile = useCallback((u: string, cachedUser: any) => {
    fetchUserProfile(u)
      .then((p) => { setFollowersCount(p.followersCount ?? 0); setFollowingCount(p.followingCount ?? 0); })
      .catch(() => {
        setFollowersCount((cachedUser?.followers as string[])?.length ?? 0);
        setFollowingCount((cachedUser?.following as string[])?.length ?? 0);
      });
  }, []);

  useEffect(() => {
    if (open) {
      const { user } = getAuth();
      const u = user?.username || "";
      setUsername(u);
      setDraftUsername(u);
      setError("");
      setSuccess(false);
      setEditingUsername(false);
      setPanel("main");

      setBlogsLoading(true);
      fetchUserPosts().then(setBlogs).catch(() => setBlogs([])).finally(() => setBlogsLoading(false));

      if (u) loadProfile(u, user);
    }
  }, [open, loadProfile]);

  const openPanel = async (p: Panel) => {
    setPanel(p);
    setListLoading(true);
    try {
      if (p === "followers") {
        const data = await fetchFollowers();
        setFollowersList(data);
      } else if (p === "following") {
        const data = await fetchFollowing();
        setFollowingList(data);
      }
    } catch { /* ignore */ }
    finally { setListLoading(false); }
  };

  const handleRemoveFollower = async (u: string) => {
    setRemovingUser(u);
    try {
      const res = await removeFollower(u);
      setFollowersList(prev => prev.filter(x => x.username !== u));
      setFollowersCount(res.followersCount ?? Math.max(0, followersCount - 1));
    } catch { /* ignore */ }
    finally { setRemovingUser(null); }
  };

  const handleUnfollow = async (u: string) => {
    setRemovingUser(u);
    try {
      await toggleFollow(u);
      setFollowingList(prev => prev.filter(x => x.username !== u));
      setFollowingCount(c => Math.max(0, c - 1));
    } catch { /* ignore */ }
    finally { setRemovingUser(null); }
  };

  const handleSaveUsername = async () => {
    if (!draftUsername.trim() || draftUsername.trim() === username) { setEditingUsername(false); return; }
    setIsSaving(true);
    setError("");
    try {
      const { token, user } = await updateProfile(draftUsername.trim());
      saveAuth(token, user);
      setUsername(draftUsername.trim());
      setSuccess(true);
      setEditingUsername(false);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally { setIsSaving(false); }
  };

  // ── Geometry / Drag / Resize ───────────────────────────────
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 440, h: 560 });
  const posRef = useRef(pos); posRef.current = pos;
  const sizeRef = useRef(size); sizeRef.current = size;

  useEffect(() => {
    if (open) {
      const w = Math.min(440, window.innerWidth - 40);
      const h = Math.min(560, window.innerHeight - 40);
      setSize({ w, h });
      setPos({ x: (window.innerWidth - w) / 2, y: (window.innerHeight - h) / 2 });
    }
  }, [open]);

  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const onDragPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragStart.current = { mx: e.clientX, my: e.clientY, px: posRef.current.x, py: posRef.current.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);
  const onDragPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.mx, dy = e.clientY - dragStart.current.my;
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - sizeRef.current.w, dragStart.current.px + dx)),
      y: Math.max(0, Math.min(window.innerHeight - sizeRef.current.h, dragStart.current.py + dy)),
    });
  }, []);
  const onDragPointerUp = useCallback(() => { dragStart.current = null; }, []);

  type Edge = "se" | "sw" | "ne" | "nw" | "e" | "w" | "s" | "n";
  const rsRef = useRef<{ mx: number; my: number; px: number; py: number; pw: number; ph: number; edge: Edge } | null>(null);
  const onResizeDown = useCallback((e: React.PointerEvent<HTMLDivElement>, edge: Edge) => {
    e.preventDefault(); e.stopPropagation();
    rsRef.current = { mx: e.clientX, my: e.clientY, px: posRef.current.x, py: posRef.current.y, pw: sizeRef.current.w, ph: sizeRef.current.h, edge };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);
  const onResizeMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!rsRef.current) return;
    const { mx, my, px, py, pw, ph, edge } = rsRef.current;
    const dx = e.clientX - mx, dy = e.clientY - my;
    let nw = pw, nh = ph, nx = px, ny = py;
    if (edge.includes("e")) nw = Math.max(MIN_W, Math.min(window.innerWidth - px, pw + dx));
    if (edge.includes("s")) nh = Math.max(MIN_H, Math.min(window.innerHeight - py, ph + dy));
    if (edge.includes("w")) { nw = Math.max(MIN_W, pw - dx); nx = Math.min(px + pw - MIN_W, px + dx); }
    if (edge.includes("n")) { nh = Math.max(MIN_H, ph - dy); ny = Math.min(py + ph - MIN_H, py + dy); }
    setPos({ x: nx, y: ny }); setSize({ w: nw, h: nh });
  }, []);
  const onResizeUp = useCallback(() => { rsRef.current = null; }, []);

  const RH = ({ edge, cursor, style }: { edge: Edge; cursor: string; style: React.CSSProperties }) => (
    <div style={{ position: "absolute", cursor, ...style, zIndex: 60 }}
      onPointerDown={e => onResizeDown(e, edge)} onPointerMove={onResizeMove} onPointerUp={onResizeUp} />
  );

  const publishedBlogs = blogs.filter(b => b.status !== "Draft");

  // ── User list row (shared for followers + following) ────
  const UserRow = ({ user, onRemove, removing, removeLabel }: {
    user: any; onRemove: () => void; removing: boolean; removeLabel: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3 rounded-[14px] border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors"
    >
      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getGradient(user.username)} border border-border flex items-center justify-center flex-shrink-0`}>
        <span className="text-sm font-bold text-foreground/80 uppercase">{user.username.charAt(0)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">@{user.username}</p>
        <p className="text-[11px] text-muted-foreground">{user.followersCount} followers</p>
      </div>
      <button
        onClick={onRemove}
        disabled={removing}
        title={removeLabel}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-100 disabled:opacity-40 flex-shrink-0"
      >
        {removing ? (
          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <HugeiconsIcon icon={UserRemove01Icon} size={15} />
        )}
      </button>
    </motion.div>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="profile-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={onClose}
          />
          <motion.div key="profile-popup"
            initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.25, ease: [0.32, 0, 0.24, 1] }}
            style={{ position: "fixed", zIndex: 50, display: "flex", flexDirection: "column", left: pos.x, top: pos.y, width: size.w, height: size.h, minWidth: MIN_W, minHeight: MIN_H, maxWidth: "100vw", maxHeight: "100vh" }}
            className="bg-background/98 backdrop-blur-2xl border border-border shadow-2xl rounded-[20px] overflow-hidden"
          >
            <RH edge="e"  cursor="ew-resize"   style={{ right: 0, top: 8, bottom: 8, width: 6 }} />
            <RH edge="w"  cursor="ew-resize"   style={{ left: 0, top: 8, bottom: 8, width: 6 }} />
            <RH edge="s"  cursor="ns-resize"   style={{ bottom: 0, left: 8, right: 8, height: 6 }} />
            <RH edge="n"  cursor="ns-resize"   style={{ top: 0, left: 8, right: 8, height: 6 }} />
            <RH edge="se" cursor="nwse-resize" style={{ right: 0, bottom: 0, width: 14, height: 14 }} />
            <RH edge="sw" cursor="nesw-resize" style={{ left: 0, bottom: 0, width: 14, height: 14 }} />
            <RH edge="ne" cursor="nesw-resize" style={{ right: 0, top: 0, width: 14, height: 14 }} />
            <RH edge="nw" cursor="nwse-resize" style={{ left: 0, top: 0, width: 14, height: 14 }} />

            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0 select-none cursor-grab active:cursor-grabbing"
              onPointerDown={onDragPointerDown} onPointerMove={onDragPointerMove} onPointerUp={onDragPointerUp}>
              {panel !== "main" ? (
                <button onClick={() => setPanel("main")} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                  <HugeiconsIcon icon={ArrowLeft01Icon} size={15} />
                </button>
              ) : (
                <HugeiconsIcon icon={Move01Icon} size={16} className="text-muted-foreground/40 flex-shrink-0" />
              )}
              <span className="text-[13px] font-semibold text-foreground tracking-tight flex-1 text-center truncate">
                {panel === "followers" ? "Followers" : panel === "following" ? "Following" : "My Profile"}
              </span>
              <button title="Close" onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-destructive/15 transition-all duration-75 text-muted-foreground hover:text-destructive flex-shrink-0">
                <HugeiconsIcon icon={Cancel01Icon} size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <AnimatePresence mode="wait">

                {/* ── FOLLOWERS PANEL ── */}
                {panel === "followers" && (
                  <motion.div key="followers-panel"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }} className="p-4 space-y-2"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">
                      {followersCount} Follower{followersCount !== 1 ? "s" : ""}
                    </p>
                    {listLoading ? (
                      <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin opacity-50" /></div>
                    ) : followersList.length === 0 ? (
                      <div className="flex flex-col items-center py-10 gap-2 text-muted-foreground">
                        <HugeiconsIcon icon={UserEdit01Icon} size={28} className="opacity-30" />
                        <p className="text-sm">No followers yet.</p>
                      </div>
                    ) : followersList.map(u => (
                      <UserRow key={u.username} user={u}
                        onRemove={() => handleRemoveFollower(u.username)}
                        removing={removingUser === u.username}
                        removeLabel="Remove follower"
                      />
                    ))}
                  </motion.div>
                )}

                {/* ── FOLLOWING PANEL ── */}
                {panel === "following" && (
                  <motion.div key="following-panel"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }} className="p-4 space-y-2"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">
                      Following {followingCount} user{followingCount !== 1 ? "s" : ""}
                    </p>
                    {listLoading ? (
                      <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin opacity-50" /></div>
                    ) : followingList.length === 0 ? (
                      <div className="flex flex-col items-center py-10 gap-2 text-muted-foreground">
                        <HugeiconsIcon icon={UserEdit01Icon} size={28} className="opacity-30" />
                        <p className="text-sm">Not following anyone yet.</p>
                      </div>
                    ) : followingList.map(u => (
                      <UserRow key={u.username} user={u}
                        onRemove={() => handleUnfollow(u.username)}
                        removing={removingUser === u.username}
                        removeLabel="Unfollow"
                      />
                    ))}
                  </motion.div>
                )}

                {/* ── MAIN PANEL ── */}
                {panel === "main" && (
                  <motion.div key="main-panel"
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }} className="flex flex-col"
                  >
                    {/* Hero */}
                    <div className="px-6 pt-8 pb-6 flex flex-col items-center border-b border-border/50">
                      {/* Avatar */}
                      <div className="relative mb-4 group">
                        <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getGradient(username)} border-2 border-border flex items-center justify-center shadow-lg`}>
                          <span className="text-3xl font-bold text-foreground/80 uppercase">{username.charAt(0) || "?"}</span>
                        </div>
                        <button title="Change profile picture (coming soon)"
                          className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center">
                          <HugeiconsIcon icon={Camera01Icon} size={20} className="text-white" />
                        </button>
                      </div>

                      {/* Username */}
                      <div className="flex items-center gap-2 mb-0.5">
                        {editingUsername ? (
                          <div className="flex items-center gap-2">
                            <input autoFocus type="text" value={draftUsername}
                              onChange={e => setDraftUsername(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") handleSaveUsername(); if (e.key === "Escape") { setEditingUsername(false); setDraftUsername(username); } }}
                              className="px-3 py-1 text-lg font-bold bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-center text-foreground"
                              style={{ width: `${Math.max(120, draftUsername.length * 11 + 40)}px` }}
                            />
                            <button onClick={handleSaveUsername} disabled={isSaving}
                              className="p-1.5 rounded-lg bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-50">
                              <HugeiconsIcon icon={Tick01Icon} size={14} />
                            </button>
                            <button onClick={() => { setEditingUsername(false); setDraftUsername(username); setError(""); }}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                              <HugeiconsIcon icon={Cancel01Icon} size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <h2 className="text-xl font-bold text-foreground">@{username || "—"}</h2>
                            <button onClick={() => { setEditingUsername(true); setDraftUsername(username); setError(""); }}
                              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-100" title="Edit username">
                              <HugeiconsIcon icon={PencilEdit02Icon} size={14} />
                            </button>
                          </>
                        )}
                      </div>

                      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
                      {success && (
                        <div className="flex items-center gap-1.5 text-green-500 text-xs font-medium mt-1">
                          <HugeiconsIcon icon={Tick01Icon} size={12} /> Username updated!
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground mb-5 mt-1">Author on Hi10 Blog</p>

                      {/* Clickable Stats */}
                      <div className="flex items-center gap-8">
                        <button onClick={() => openPanel("followers")}
                          className="flex flex-col items-center hover:opacity-70 transition-opacity cursor-pointer group">
                          <span className="text-lg font-bold text-foreground">{followersCount}</span>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">Followers</span>
                        </button>
                        <div className="w-px h-8 bg-border" />
                        <button onClick={() => openPanel("following")}
                          className="flex flex-col items-center hover:opacity-70 transition-opacity cursor-pointer group">
                          <span className="text-lg font-bold text-foreground">{followingCount}</span>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">Following</span>
                        </button>
                        <div className="w-px h-8 bg-border" />
                        <div className="flex flex-col items-center">
                          <span className="text-lg font-bold text-foreground">{publishedBlogs.length}</span>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Blogs</span>
                        </div>
                      </div>
                    </div>

                    {/* Blogs */}
                    <div className="p-4">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">My Published Blogs</h3>
                      {blogsLoading ? (
                        <div className="flex justify-center py-8"><div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin opacity-50" /></div>
                      ) : publishedBlogs.length === 0 ? (
                        <div className="flex flex-col items-center py-10 gap-2 text-muted-foreground">
                          <HugeiconsIcon icon={UserEdit01Icon} size={28} className="opacity-30" />
                          <p className="text-sm">No published blogs yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {publishedBlogs.map((blog, idx) => (
                            <motion.button key={blog._id}
                              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05, duration: 0.2 }}
                              onClick={() => { if (onBlogClick) { onClose(); onBlogClick(blog); } }}
                              className="w-full text-left p-4 rounded-[14px] border border-border/40 bg-muted/20 hover:bg-muted/60 transition-all duration-100 flex flex-col gap-1.5 group"
                            >
                              <h4 className="font-semibold text-[14px] text-foreground group-hover:text-foreground/80 transition-colors line-clamp-1">{blog.title}</h4>
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{blog.content}</p>
                              <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-1">
                                <span className="flex items-center gap-1"><HugeiconsIcon icon={Calendar01Icon} size={11} />{new Date(blog.date).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1"><HugeiconsIcon icon={ViewIcon} size={11} />{blog.views ?? 0} views</span>
                                {blog.tags?.length > 0 && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md font-medium">{blog.tags[0]}</span>}
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Resize corner */}
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

export default ProfilePopup;
