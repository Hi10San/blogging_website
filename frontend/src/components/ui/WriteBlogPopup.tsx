import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { createPost } from "../../lib/api";
import {
  Cancel01Icon,
  Maximize01Icon,
  Minimize01Icon,
  Move01Icon,
  TextBoldIcon,
  TextItalicIcon,
  TextUnderlineIcon,
  ListViewIcon,
  TextAlignLeftIcon,
  TextAlignCenterIcon,
  TextAlignRightIcon,
  LinkSquare01Icon,
  ImageAdd01Icon,
  EyeIcon,
  FloppyDiskIcon,
  Upload02Icon,
  TextIcon,
} from "@hugeicons/core-free-icons";

interface WriteBlogPopupProps {
  open: boolean;
  onClose: () => void;
}

type FormatCmd =
  | "bold"
  | "italic"
  | "underline"
  | "insertUnorderedList"
  | "justifyLeft"
  | "justifyCenter"
  | "justifyRight";

const MIN_W = 520;
const MIN_H = 420;

export const WriteBlogPopup: React.FC<WriteBlogPopupProps> = ({
  open,
  onClose,
}) => {
  // ── State ──────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  // ── Geometry ───────────────────────────────────────────
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 720, h: 560 });
  const posRef = useRef(pos);
  const sizeRef = useRef(size);
  posRef.current = pos;
  sizeRef.current = size;

  // Center on first open
  useEffect(() => {
    if (open) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(720, vw - 40);
      const h = Math.min(560, vh - 40);
      setSize({ w, h });
      setPos({ x: (vw - w) / 2, y: (vh - h) / 2 });
      setIsMaximized(false);
      setIsPreview(false);
      setPublished(false);
      setIsSaved(false);
    }
  }, [open]);

  // ── Refs ───────────────────────────────────────────────
  const popupRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Drag ───────────────────────────────────────────────
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  const onDragPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isMaximized) return;
    e.preventDefault();
    dragStart.current = {
      mx: e.clientX,
      my: e.clientY,
      px: posRef.current.x,
      py: posRef.current.y,
    };
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
  }, [isMaximized]);

  const onDragPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x = Math.max(0, Math.min(vw - sizeRef.current.w, dragStart.current.px + dx));
    const y = Math.max(0, Math.min(vh - sizeRef.current.h, dragStart.current.py + dy));
    setPos({ x, y });
  }, []);

  const onDragPointerUp = useCallback(() => {
    dragStart.current = null;
  }, []);

  // ── Resize ─────────────────────────────────────────────
  type ResizeEdge = "se" | "sw" | "ne" | "nw" | "e" | "w" | "s" | "n";
  const resizeStart = useRef<{
    mx: number; my: number;
    px: number; py: number;
    pw: number; ph: number;
    edge: ResizeEdge;
  } | null>(null);

  const onResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, edge: ResizeEdge) => {
    if (isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    resizeStart.current = {
      mx: e.clientX, my: e.clientY,
      px: posRef.current.x, py: posRef.current.y,
      pw: sizeRef.current.w, ph: sizeRef.current.h,
      edge,
    };
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
  }, [isMaximized]);

  const onResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeStart.current) return;
    const { mx, my, px, py, pw, ph, edge } = resizeStart.current;
    const dx = e.clientX - mx;
    const dy = e.clientY - my;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let newW = pw, newH = ph, newX = px, newY = py;

    if (edge.includes("e")) newW = Math.max(MIN_W, Math.min(vw - px, pw + dx));
    if (edge.includes("s")) newH = Math.max(MIN_H, Math.min(vh - py, ph + dy));
    if (edge.includes("w")) {
      newW = Math.max(MIN_W, pw - dx);
      newX = Math.min(px + pw - MIN_W, px + dx);
    }
    if (edge.includes("n")) {
      newH = Math.max(MIN_H, ph - dy);
      newY = Math.min(py + ph - MIN_H, py + dy);
    }

    setPos({ x: newX, y: newY });
    setSize({ w: newW, h: newH });
  }, []);

  const onResizePointerUp = useCallback(() => {
    resizeStart.current = null;
  }, []);

  // ── Rich Text Editor ────────────────────────────────────
  const format = (cmd: FormatCmd) => {
    document.execCommand(cmd, false);
    editorRef.current?.focus();
  };

  const insertLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) document.execCommand("createLink", false, url);
    editorRef.current?.focus();
  };

  // ── Cover Image ─────────────────────────────────────────
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCoverPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Save Draft ──────────────────────────────────────────
  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // ── Publish ─────────────────────────────────────────────
  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const contentHTML = editorRef.current?.innerHTML || "";
      const tagsArray = tags.split(",").map(t => t.trim()).filter(Boolean);

      await createPost({
        title,
        content: contentHTML,
        tags: tagsArray,
        cover: coverPreview, // Base64 string for now
        status: "Published"
      });

      setPublished(true);
    } catch (err: any) {
      console.error("Failed to publish blog", err);
      alert(`Failed to publish blog: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  // ── Preview toggle ──────────────────────────────────────
  const togglePreview = () => {
    if (!isPreview && editorRef.current) {
      setPreviewContent(editorRef.current.innerHTML);
    }
    setIsPreview((v) => !v);
  };

  // ── Maximize ────────────────────────────────────────────
  const toggleMaximize = () => {
    if (!isMaximized) {
      setPos({ x: 0, y: 0 });
      setSize({ w: window.innerWidth, h: window.innerHeight });
    } else {
      const w = Math.min(720, window.innerWidth - 40);
      const h = Math.min(560, window.innerHeight - 40);
      setPos({ x: (window.innerWidth - w) / 2, y: (window.innerHeight - h) / 2 });
      setSize({ w, h });
    }
    setIsMaximized((v) => !v);
  };

  // ── Resize handle helper ────────────────────────────────
  const ResizeHandle = ({ edge, cursor, style }: { edge: ResizeEdge; cursor: string; style: React.CSSProperties }) => (
    <div
      style={{ position: "absolute", cursor, ...style, zIndex: 60 }}
      onPointerDown={(e) => onResizePointerDown(e, edge)}
      onPointerMove={onResizePointerMove}
      onPointerUp={onResizePointerUp}
    />
  );

  // ── Toolbar button ──────────────────────────────────────
  const ToolBtn = ({
    icon,
    label,
    onClick,
    active,
  }: {
    icon: any;
    label: string;
    onClick: () => void;
    active?: boolean;
  }) => (
    <button
      title={label}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`p-1.5 rounded-lg transition-all duration-75 ${active ? "bg-accent text-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
    >
      <HugeiconsIcon icon={icon} size={16} />
    </button>
  );

  // ── Computed style ──────────────────────────────────────
  const popupStyle: React.CSSProperties = isMaximized
    ? { left: 0, top: 0, width: "100vw", height: "100vh", borderRadius: 0 }
    : { left: pos.x, top: pos.y, width: size.w, height: size.h };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="blog-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Popup */}
          <motion.div
            key="blog-popup"
            ref={popupRef}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.25, ease: [0.32, 0, 0.24, 1] }}
            style={{
              position: "fixed",
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              ...popupStyle,
              minWidth: MIN_W,
              minHeight: MIN_H,
              maxWidth: "100vw",
              maxHeight: "100vh",
            }}
            className="bg-background/98 backdrop-blur-2xl border border-border shadow-2xl rounded-[20px]"
          >
            {/* ── Resize Handles ──────────────────────── */}
            {!isMaximized && (
              <>
                <ResizeHandle edge="e" cursor="ew-resize" style={{ right: 0, top: 8, bottom: 8, width: 6 }} />
                <ResizeHandle edge="w" cursor="ew-resize" style={{ left: 0, top: 8, bottom: 8, width: 6 }} />
                <ResizeHandle edge="s" cursor="ns-resize" style={{ bottom: 0, left: 8, right: 8, height: 6 }} />
                <ResizeHandle edge="n" cursor="ns-resize" style={{ top: 0, left: 8, right: 8, height: 6 }} />
                <ResizeHandle edge="se" cursor="nwse-resize" style={{ right: 0, bottom: 0, width: 14, height: 14 }} />
                <ResizeHandle edge="sw" cursor="nesw-resize" style={{ left: 0, bottom: 0, width: 14, height: 14 }} />
                <ResizeHandle edge="ne" cursor="nesw-resize" style={{ right: 0, top: 0, width: 14, height: 14 }} />
                <ResizeHandle edge="nw" cursor="nwse-resize" style={{ left: 0, top: 0, width: 14, height: 14 }} />
              </>
            )}

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
                Write Blog
              </span>

              {/* Window controls */}
              <div className="flex items-center gap-1 flex-shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                {/* Save draft */}
                <button
                  title="Save draft"
                  onClick={handleSave}
                  className="p-1.5 rounded-lg hover:bg-muted transition-all duration-75 text-muted-foreground hover:text-foreground"
                >
                  <HugeiconsIcon icon={FloppyDiskIcon} size={15} />
                </button>

                {/* Preview */}
                <button
                  title={isPreview ? "Edit" : "Preview"}
                  onClick={togglePreview}
                  className={`p-1.5 rounded-lg transition-all duration-75 ${isPreview ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  <HugeiconsIcon icon={isPreview ? TextIcon : EyeIcon} size={15} />
                </button>

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

            {/* ── Cover Image ──────────────────────────── */}
            <div className="flex-shrink-0 relative" style={{ height: coverPreview ? 140 : 0, transition: "height 0.3s ease", overflow: "hidden" }}>
              {coverPreview && (
                <>
                  <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80" />
                  <button
                    onClick={() => setCoverPreview(null)}
                    className="absolute top-2 right-2 p-1 rounded-full bg-background/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-destructive transition-all"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={14} />
                  </button>
                </>
              )}
            </div>

            {/* ── Meta Fields ──────────────────────────── */}
            <div className="flex-shrink-0 px-5 pt-4 space-y-2">
              {/* Title input */}
              <input
                type="text"
                placeholder="Blog title…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-2xl font-bold text-foreground placeholder:text-muted-foreground/40 focus:ring-0"
                style={{ fontFamily: "inherit" }}
              />

              {/* Tags + cover upload row */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Add tags  (e.g. tech, design)"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-[13px] text-muted-foreground placeholder:text-muted-foreground/40 focus:ring-0"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-all duration-75 flex-shrink-0"
                >
                  <HugeiconsIcon icon={ImageAdd01Icon} size={15} />
                  <span>Cover</span>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
              </div>

              {/* Divider */}
              <div className="border-t border-border" />
            </div>

            {/* ── Toolbar ────────────────────────────────── */}
            {!isPreview && (
              <div className="flex-shrink-0 flex items-center gap-0.5 px-4 py-1.5 border-b border-border flex-wrap">
                <ToolBtn icon={TextBoldIcon} label="Bold" onClick={() => format("bold")} />
                <ToolBtn icon={TextItalicIcon} label="Italic" onClick={() => format("italic")} />
                <ToolBtn icon={TextUnderlineIcon} label="Underline" onClick={() => format("underline")} />
                <div className="w-px h-4 bg-border mx-1" />
                <ToolBtn icon={ListViewIcon} label="List" onClick={() => format("insertUnorderedList")} />
                <div className="w-px h-4 bg-border mx-1" />
                <ToolBtn icon={TextAlignLeftIcon} label="Align Left" onClick={() => format("justifyLeft")} />
                <ToolBtn icon={TextAlignCenterIcon} label="Align Center" onClick={() => format("justifyCenter")} />
                <ToolBtn icon={TextAlignRightIcon} label="Align Right" onClick={() => format("justifyRight")} />
                <div className="w-px h-4 bg-border mx-1" />
                <ToolBtn icon={LinkSquare01Icon} label="Insert Link" onClick={insertLink} />
                <ToolBtn icon={ImageAdd01Icon} label="Insert Image" onClick={() => fileInputRef.current?.click()} />
              </div>
            )}

            {/* ── Editor / Preview ─────────────────────── */}
            <div className="flex-1 overflow-hidden relative">
              {isPreview ? (
                <div
                  className="h-full overflow-y-auto px-5 py-4 prose prose-sm max-w-none text-foreground"
                  style={{ fontSize: 15 }}
                >
                  {!title && !previewContent ? (
                    <p className="text-muted-foreground/50 text-center mt-12">Nothing to preview yet.</p>
                  ) : (
                    <>
                      {title && <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>}
                      {tags && <p className="text-xs text-muted-foreground mb-4">{tags.split(",").map(t => t.trim()).filter(Boolean).map(t => `#${t}`).join("  ")}</p>}
                      <div dangerouslySetInnerHTML={{ __html: previewContent }} />
                    </>
                  )}
                </div>
              ) : (
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Start writing your blog…"
                  className="h-full overflow-y-auto px-5 py-4 text-foreground text-[15px] leading-relaxed focus:outline-none"
                  style={{ fontFamily: "inherit" }}
                />
              )}
            </div>

            {/* ── Footer ───────────────────────────────── */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-t border-border">
              {/* Save status */}
              <AnimatePresence>
                {isSaved && (
                  <motion.span
                    key="saved"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-[12px] text-muted-foreground"
                  >
                    Draft saved ✓
                  </motion.span>
                )}
                {!isSaved && (
                  <motion.span key="empty" className="text-[12px] text-muted-foreground/0">·</motion.span>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2">
                {/* Publish button */}
                <AnimatePresence mode="wait">
                  {published ? (
                    <motion.span
                      key="done"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-[13px] text-green-500 font-medium px-4 py-1.5"
                    >
                      Published!
                    </motion.span>
                  ) : (
                    <motion.button
                      key="publish"
                      onClick={handlePublish}
                      disabled={isPublishing || !title.trim()}
                      className={`relative flex items-center gap-2 px-4 py-1.5 rounded-xl text-[13px] font-semibold transition-all duration-150
                        ${isPublishing || !title.trim()
                          ? "bg-muted text-muted-foreground cursor-not-allowed"
                          : "bg-foreground text-background hover:opacity-90 active:scale-95"
                        }`}
                    >
                      {isPublishing ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Publishing…
                        </>
                      ) : (
                        <>
                          <HugeiconsIcon icon={Upload02Icon} size={14} />
                          Publish
                        </>
                      )}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
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

export default WriteBlogPopup;
