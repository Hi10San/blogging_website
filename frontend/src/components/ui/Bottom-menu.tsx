
import {
  Notification03Icon,
  Search01Icon,
  Sun03Icon,
  Moon02Icon,
  ComputerIcon,
  UserEdit01Icon,
  PlusSignIcon,
  Mic01Icon,
  Camera01Icon,
  PencilEdit02Icon,
  FilterHorizontalIcon,
  AutoConversationsIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import React, { useMemo, useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import useMeasure from "react-use-measure";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { getAuth, clearAuth } from "../../lib/api";
import { useTheme } from "../../context/ThemeContext";

// Change Here
const MAIN_NAV = [
  { icon: PlusSignIcon, name: "home" },
  { icon: Search01Icon, name: "search" },
  { icon: Notification03Icon, name: "notifications" },
  { icon: UserEdit01Icon, name: "profile" },
  { icon: Sun03Icon, name: "theme" },
];

const HOME_ITEMS = [
  { icon: PencilEdit02Icon, text: "Write Blog" },
  // { icon: Mic01Icon, text: "Voice" },
  // { icon: Camera01Icon, text: "Screenshot" },
];

const SEARCH_OPTIONS = [
  { icon: FilterHorizontalIcon, text: "Filter" },
  { icon: AutoConversationsIcon, text: "Trending" },
];

const NOTIFICATION_TYPES = ["Messages", "System Alerts"];

const PROFILE_LINKS = ["My Account", "Settings", "Subscription / Billing"];

const THEME_OPTIONS = [
  { key: "light", icon: Sun03Icon, text: "Light" },
  { key: "dark", icon: Moon02Icon, text: "Dark" },
  { key: "system", icon: ComputerIcon, text: "System" },
];

interface BottomMenuProps {
  onWriteBlog?: () => void;
  onMyBlogs?: () => void;
  onMyProfile?: () => void;
  onFollowing?: () => void;
  onSearch?: (query: string, mode: "users" | "blogs") => void;
  onReadBlogId?: (id: string) => void;
}

const BottomMenu = ({ onWriteBlog, onMyBlogs, onMyProfile, onFollowing, onSearch, onReadBlogId }: BottomMenuProps) => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [elementRef] = useMeasure();
  const [hiddenRef, hiddenBounds] = useMeasure();
  const [view, setView] = useState<MenuView>("default");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchMode, setSearchMode] = useState<"users" | "blogs">("users");

  // Fetch notifications periodically
  useEffect(() => {
    const load = async () => {
      try {
        const { fetchNotifications } = await import("../../lib/api");
        const data = await fetchNotifications();
        setNotifications(data);
      } catch (err) {
        console.error(err);
      }
    };
    
    // Initial load
    load();

    // Poll every 3 seconds for a snappier real-time feel
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch immediately when opening the tab
  useEffect(() => {
    if (view === "notifications") {
      const load = async () => {
        try {
          const { fetchNotifications } = await import("../../lib/api");
          const data = await fetchNotifications();
          setNotifications(data);
        } catch (e) {}
      };
      load();
    }
  }, [view]);

  // Mark as read when leaving notifications view
  const wasNotificationsView = useRef(false);
  useEffect(() => {
    if (view === "notifications") {
      wasNotificationsView.current = true;
    } else if (wasNotificationsView.current) {
      wasNotificationsView.current = false;
      const markRead = async () => {
        try {
          const { markNotificationsRead } = await import("../../lib/api");
          await markNotificationsRead();
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (e) {}
      };
      // Only fire if there are unread notifications
      if (notifications.some(n => !n.read)) {
        markRead();
      }
    }
  }, [view, notifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setView("default");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const sharedHover =
    "group transition-all duration-75 px-3 py-2 text-[15px] text-muted-foreground w-full text-left rounded-[12px] hover:bg-muted/80 hover:text-foreground";

  const content = useMemo(() => {
    switch (view) {
      case "default":
        return null;

      case "home":
        return (
          <div className="space-y-0.5 min-w-[210px] p-[6px] py-0.5">
            {HOME_ITEMS.map(({ icon: Icon, text }) => (
              <button
                key={text}
                onClick={() => {
                  if (text === "Write Blog") {
                    setView("default");
                    onWriteBlog?.();
                  }
                }}
                className={`${sharedHover} flex items-center gap-3`}
              >
                <HugeiconsIcon
                  icon={Icon}
                  size={20}
                  className="text-muted-foreground group-hover:text-foreground transition-all duration-75"
                />
                <span className="transition-all duration-75">{text}</span>
              </button>
            ))}
          </div>
        );

      case "search":
        return (
          <div className="space-y-2 min-w-[270px] p-[8px] py-1">
            <div className="relative">
              <HugeiconsIcon
                icon={Search01Icon}
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder={searchMode === "blogs" ? "Search blogs..." : "Search users..."}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = e.currentTarget.value.trim();
                    if (val && onSearch) {
                      setView("default");
                      onSearch(val, searchMode);
                      e.currentTarget.value = "";
                    }
                  }
                }}
                className="w-full pl-9 pr-3 py-[6px] text-[14.5px] text-foreground bg-muted/80 border border-border rounded-[12px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="flex gap-1.5">
              <button
                className={`${sharedHover} w-full flex items-center gap-2 bg-muted hover:bg-accent`}
                onClick={() => {
                  setView("default");
                  onFollowing?.();
                }}
              >
                <HugeiconsIcon icon={UserEdit01Icon} size={16} />
                <span>Following</span>
              </button>
              {/* Blog filter toggle */}
              <button
                onClick={() => setSearchMode(m => m === "blogs" ? "users" : "blogs")}
                className={`${sharedHover} flex-1 flex items-center justify-center gap-1.5 transition-all ${
                  searchMode === "blogs"
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "bg-muted hover:bg-accent"
                }`}
              >
                <HugeiconsIcon
                  icon={FilterHorizontalIcon}
                  size={14}
                  strokeWidth={2}
                  className="transition-all duration-75"
                />
                <span className="transition-all duration-75">
                  {searchMode === "blogs" ? "Blogs ✓" : "Filter"}
                </span>
              </button>
            </div>
          </div>
        );

      case "notifications": {
        const unreadCount = notifications.filter(n => !n.read).length;
        return (
          <div className="min-w-[280px] max-w-[320px] max-h-[350px] overflow-y-auto p-[8px] py-1 custom-scrollbar">
            <div className="px-2 py-1.5 mb-1 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-medium bg-foreground text-background px-1.5 py-0.5 rounded-md">
                  {unreadCount} new
                </span>
              )}
            </div>
            
            {notifications.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-[13px]">
                No notifications yet.
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((n) => (
                  <button
                    key={n._id}
                    onClick={() => {
                        if (n.blogId) {
                            onReadBlogId?.(n.blogId);
                            setView("default");
                        }
                    }}
                    className={`flex flex-col w-full text-left p-2.5 rounded-[12px] text-[13px] ${n.read ? 'text-muted-foreground bg-transparent hover:bg-muted/30' : 'text-foreground bg-muted/60 font-medium hover:bg-muted/80'}`}
                  >
                    <span>{n.message}</span>
                    <span className="text-[10px] opacity-70 mt-1">{new Date(n.createdAt).toLocaleString()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      }

      case "profile": {
        const { token, user } = getAuth();
        if (!token) {
          // Logged out — show login / sign up
          return (
            <div className="space-y-0.5 min-w-[200px] p-[6px] py-0.5">
              <button
                id="nav-login"
                onClick={() => { setView("default"); navigate("/login"); }}
                className={sharedHover}
              >
                <span className="transition-all duration-75">Log In</span>
              </button>
              <button
                id="nav-signup"
                onClick={() => { setView("default"); navigate("/signin"); }}
                className={sharedHover}
              >
                <span className="transition-all duration-75">Create Account</span>
              </button>
            </div>
          );
        }
        // Logged in — show email + logout
        return (
          <div className="space-y-0.5 min-w-[230px] p-[6px] py-0.5">
            <p className="px-3 py-1.5 text-[13px] text-muted-foreground truncate">{user?.email}</p>
            <div className="border-t border-border my-[2px]" />
            <button
              onClick={() => { setView("default"); onMyProfile?.(); }}
              className={sharedHover}
            >
              <span className="transition-all duration-75">My Profile</span>
            </button>
            <button
              onClick={() => { setView("default"); onMyBlogs?.(); }}
              className={sharedHover}
            >
              <span className="transition-all duration-75">My Blogs</span>
            </button>
            <button
              id="nav-logout"
              onClick={() => {
                clearAuth();
                setView("default");
                navigate("/login");
              }}
              className="px-3 py-2 text-[15px] text-destructive w-full text-left rounded-[12px] hover:bg-destructive/10 transition-all duration-75"
            >
              Logout
            </button>
          </div>
        );
      }

      case "theme":
        return (
          <div className="flex items-center justify-between gap-1.5 min-w-[270px] p-[6px] py-0.5">
            {THEME_OPTIONS.map(({ key, icon: Icon, text }) => (
              <button
                key={key}
                onClick={() => setTheme(key as "light" | "dark" | "system")}
                className={`flex items-center justify-center gap-2 rounded-[12px] px-3 py-2 transition-all duration-100 ${theme === key
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-muted"
                  }`}
              >
                <HugeiconsIcon
                  icon={Icon}
                  size={18}
                  className={`transition-all duration-75 ${theme === key ? "text-foreground" : "text-muted-foreground"
                    }`}
                />
                <span>{text}</span>
              </button>
            ))}
          </div>
        );

      default:
        return null;
    }
  }, [view, theme, notifications]);

  return (
    <div
      ref={containerRef}
      className={cn("relative flex flex-col items-center")}
    >
      {/* Hidden for measurement */}
      <div
        ref={hiddenRef}
        className="absolute left-[-9999px] top-[-9999px] invisible pointer-events-none"
      >
        <div className="rounded-[18px] bg-background/95 border border-border py-1">
          {content}
        </div>
      </div>

      {/* Animated submenu */}
      <AnimatePresence mode="wait">
        {view !== "default" && (
          <motion.div
            key="submenu"
            initial={{
              opacity: 0,
              scaleY: 0.9,
              scaleX: 0.95,
              height: 0,
              width: 0,
              originY: 1,
              originX: 0.5,
            }}
            animate={{
              opacity: 1,
              scaleY: 1,
              scaleX: 1,
              height: hiddenBounds.height || "auto",
              width: hiddenBounds.width || "auto",
              originY: 1,
              originX: 0.5,
            }}
            exit={{
              opacity: 0,
              scaleY: 0.9,
              scaleX: 0.95,
              height: 0,
              width: 0,
              originY: 1,
              originX: 0.5,
            }}
            transition={{
              duration: 0.3,
              ease: [0.45, 0, 0.25, 1],
            }}
            style={{
              transformOrigin: "bottom center",
            }}
            className="absolute bottom-[70px] overflow-hidden"
          >
            <div
              ref={elementRef}
              className="rounded-[18px] bg-background/95 backdrop-blur-xl border border-border"
            >
              <AnimatePresence initial={false} mode="popLayout">
                <motion.div
                  key={view}
                  initial={{
                    opacity: 0,
                    scale: 0.96,
                    filter: "blur(10px)",
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    filter: "blur(0px)",
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.95,
                    filter: "blur(12px)",
                  }}
                  transition={{
                    duration: 0.25,
                    ease: [0.42, 0, 0.58, 1],
                  }}
                  className="py-1"
                >
                  {content}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="flex items-center gap-1 bg-background/95 backdrop-blur-xl border border-border rounded-[18px] p-1 mt-3 z-10">
        {MAIN_NAV.map(({ icon: Icon, name }) => {
          const isNotifications = name === "notifications";
          const unreadCount = isNotifications ? notifications.filter(n => !n.read).length : 0;
          return (
            <button
              key={name}
              className={`relative p-3 rounded-[16px] transition-all ${view === name ? "bg-accent" : "hover:bg-muted"
                }`}
              onClick={() => setView(view === name ? "default" : (name as any))}
            >
              <HugeiconsIcon
                icon={Icon}
                size={22}
                className={`transition-all ${view === name ? "text-foreground" : "text-muted-foreground"
                  }`}
              />
              {isNotifications && unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full border border-background flex items-center justify-center text-[8px] text-white font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomMenu;
