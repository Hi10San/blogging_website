// components/Navbar.tsx
import { useState } from "react";
import BottomMenu from "./ui/bottom-menu";
import { WriteBlogPopup } from "./ui/WriteBlogPopup";
import { MyBlogsPopup } from "./ui/MyBlogsPopup";
import { SearchResultsPopup } from "./ui/SearchResultsPopup";
import { ReadBlogPopup } from "./ui/ReadBlogPopup";
import { ProfilePopup } from "./ui/ProfilePopup";
import { FollowingPopup } from "./ui/FollowingPopup";
import { PublicProfilePopup } from "./ui/PublicProfilePopup";

export default function Navbar() {
    const [blogOpen, setBlogOpen] = useState(false);
    const [myBlogsOpen, setMyBlogsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [followingOpen, setFollowingOpen] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [searchMode, setSearchMode] = useState<"users" | "blogs">("users");
    const [searchOpen, setSearchOpen] = useState(false);

    const [selectedBlog, setSelectedBlog] = useState<any | null>(null);

    // Public profile popup state
    const [publicProfileUsername, setPublicProfileUsername] = useState("");
    const [publicProfileOpen, setPublicProfileOpen] = useState(false);

    const handleSearch = (query: string, mode: "users" | "blogs") => {
        setSearchQuery(query);
        setSearchMode(mode);
        setSearchOpen(true);
    };

    const handleReadBlog = (blog: any) => {
        setSelectedBlog(blog);
    };

    const handleReadBlogId = async (id: string) => {
        try {
            const { fetchPost } = await import("../lib/api");
            const blog = await fetchPost(id);
            setSelectedBlog(blog);
        } catch (e) {
            console.error(e);
        }
    };

    const handleViewPublicProfile = (username: string) => {
        setPublicProfileUsername(username);
        setPublicProfileOpen(true);
    };

    return (
        <>
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <BottomMenu
                    onWriteBlog={() => setBlogOpen(true)}
                    onMyBlogs={() => setMyBlogsOpen(true)}
                    onMyProfile={() => setProfileOpen(true)}
                    onFollowing={() => setFollowingOpen(true)}
                    onSearch={handleSearch}
                    onReadBlogId={handleReadBlogId}
                />
            </div>

            <WriteBlogPopup open={blogOpen} onClose={() => setBlogOpen(false)} />
            <MyBlogsPopup open={myBlogsOpen} onClose={() => setMyBlogsOpen(false)} />
            <ProfilePopup open={profileOpen} onClose={() => setProfileOpen(false)} onBlogClick={handleReadBlog} />

            {/* Following list popup */}
            <FollowingPopup
                open={followingOpen}
                onClose={() => setFollowingOpen(false)}
                onUserClick={handleViewPublicProfile}
            />

            {/* Public profile popup — opened by clicking a user in the Following list */}
            <PublicProfilePopup
                open={publicProfileOpen}
                username={publicProfileUsername}
                onClose={() => setPublicProfileOpen(false)}
                onBlogClick={handleReadBlog}
            />

            <SearchResultsPopup
                open={searchOpen}
                query={searchQuery}
                mode={searchMode}
                onClose={() => setSearchOpen(false)}
                onReadBlog={handleReadBlog}
                onViewProfile={handleViewPublicProfile}
            />
            <ReadBlogPopup
                blog={selectedBlog}
                onClose={() => setSelectedBlog(null)}
            />
        </>
    );
}