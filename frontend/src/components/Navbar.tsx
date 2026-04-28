// components/Navbar.tsx
import { useState } from "react";
import BottomMenu from "./ui/bottom-menu";
import { WriteBlogPopup } from "./ui/WriteBlogPopup";

export default function Navbar() {
    const [blogOpen, setBlogOpen] = useState(false);

    return (
        <>
            <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
                <BottomMenu onWriteBlog={() => setBlogOpen(true)} />
            </div>

            <WriteBlogPopup open={blogOpen} onClose={() => setBlogOpen(false)} />
        </>
    );
}