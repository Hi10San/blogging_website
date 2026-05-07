// components/Navbar.tsx
import { useState, useCallback } from "react";
import BottomMenu from "./ui/bottom-menu";
import { WriteBlogPopup } from "./ui/WriteBlogPopup";
import { MyBlogsPopup } from "./ui/MyBlogsPopup";
import { SearchResultsPopup } from "./ui/SearchResultsPopup";
import { ReadBlogPopup } from "./ui/ReadBlogPopup";
import { ProfilePopup } from "./ui/ProfilePopup";
import { FollowingPopup } from "./ui/FollowingPopup";
import { PublicProfilePopup } from "./ui/PublicProfilePopup";
import { SnapLayoutProvider } from "../context/SnapLayoutContext";
import { SnapLayoutBar } from "./ui/SnapLayoutBar";

// Popup IDs
type PopupId = "writeBlog" | "myBlogs" | "profile" | "following" | "publicProfile" | "search" | "readBlog";

const BASE_Z = 50;
const Z_STEP = 5;

export default function Navbar() {
    const [blogOpen, setBlogOpen] = useState(false);
    const [myBlogsOpen, setMyBlogsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [followingOpen, setFollowingOpen] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [searchMode, setSearchMode] = useState<"users" | "blogs">("users");
    const [searchOpen, setSearchOpen] = useState(false);

    const [selectedBlog, setSelectedBlog] = useState<any | null>(null);

    const [publicProfileUsername, setPublicProfileUsername] = useState("");
    const [publicProfileOpen, setPublicProfileOpen] = useState(false);

    // ── Z-order manager ──────────────────────────────────────
    const [zOrder, setZOrder] = useState<PopupId[]>([]);

    const bringToFront = useCallback((id: PopupId) => {
        setZOrder(prev => [...prev.filter(x => x !== id), id]);
    }, []);

    const getZ = useCallback((id: PopupId): number => {
        const idx = zOrder.indexOf(id);
        return BASE_Z + (idx === -1 ? 0 : idx) * Z_STEP;
    }, [zOrder]);

    // ── Helpers that open a popup and bring it to front ──────
    const openWriteBlog = () => { setBlogOpen(true); bringToFront("writeBlog"); };
    const openMyBlogs  = () => { setMyBlogsOpen(true); bringToFront("myBlogs"); };
    const openProfile  = () => { setProfileOpen(true); bringToFront("profile"); };
    const openFollowing = () => { setFollowingOpen(true); bringToFront("following"); };

    const handleSearch = (query: string, mode: "users" | "blogs") => {
        setSearchQuery(query);
        setSearchMode(mode);
        setSearchOpen(true);
        bringToFront("search");
    };

    const handleReadBlog = (blog: any) => {
        setSelectedBlog(blog);
        bringToFront("readBlog");
    };

    const handleReadBlogId = async (id: string) => {
        try {
            const { fetchPost } = await import("../lib/api");
            const blog = await fetchPost(id);
            setSelectedBlog(blog);
            bringToFront("readBlog");
        } catch (e) {
            console.error(e);
        }
    };

    const handleViewPublicProfile = (username: string) => {
        setPublicProfileUsername(username);
        setPublicProfileOpen(true);
        bringToFront("publicProfile");
    };

    return (
        <SnapLayoutProvider>
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]">
                <BottomMenu
                    onWriteBlog={openWriteBlog}
                    onMyBlogs={openMyBlogs}
                    onMyProfile={openProfile}
                    onFollowing={openFollowing}
                    onSearch={handleSearch}
                    onReadBlogId={handleReadBlogId}
                />
            </div>

            <SnapLayoutBar />

            <WriteBlogPopup   open={blogOpen}         onClose={() => setBlogOpen(false)}         zIndex={getZ("writeBlog")}     onBringToFront={() => bringToFront("writeBlog")} />
            <MyBlogsPopup     open={myBlogsOpen}      onClose={() => setMyBlogsOpen(false)}      zIndex={getZ("myBlogs")}       onBringToFront={() => bringToFront("myBlogs")} />
            <ProfilePopup     open={profileOpen}      onClose={() => setProfileOpen(false)}      onBlogClick={handleReadBlog}   zIndex={getZ("profile")}       onBringToFront={() => bringToFront("profile")} />
            <FollowingPopup   open={followingOpen}    onClose={() => setFollowingOpen(false)}    onUserClick={handleViewPublicProfile} zIndex={getZ("following")}  onBringToFront={() => bringToFront("following")} />
            <PublicProfilePopup open={publicProfileOpen} username={publicProfileUsername} onClose={() => setPublicProfileOpen(false)} onBlogClick={handleReadBlog} zIndex={getZ("publicProfile")} onBringToFront={() => bringToFront("publicProfile")} />
            <SearchResultsPopup open={searchOpen} query={searchQuery} mode={searchMode} onClose={() => setSearchOpen(false)} onReadBlog={handleReadBlog} onViewProfile={handleViewPublicProfile} zIndex={getZ("search")} onBringToFront={() => bringToFront("search")} />
            <ReadBlogPopup    blog={selectedBlog}     onClose={() => setSelectedBlog(null)}      zIndex={getZ("readBlog")}      onBringToFront={() => bringToFront("readBlog")} />
        </SnapLayoutProvider>
    );
}