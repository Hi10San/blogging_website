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
  zIndex?: number;
  onBringToFront?: () => void;
}

import { useDraggablePopup } from "../../hooks/useDraggablePopup";

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

const RichTextEditor = React.memo(({
  editorRef,
  initialContent,
  onHtmlChange,
  onImageSelect
}: {
  editorRef: React.RefObject<HTMLDivElement>,
  initialContent: string,
  onHtmlChange: (html: string) => void,
  onImageSelect?: (img: HTMLImageElement | null) => void
}) => {
  return (
    <>
      <style>{`
        .is-selected-img {
          outline: 2px solid hsl(var(--primary));
          box-shadow: 0 0 0 4px hsl(var(--primary) / 0.2);
          cursor: pointer;
        }
        .prose img {
          cursor: pointer;
        }
      `}</style>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Start writing your blog…"
        className="h-full overflow-y-auto px-5 py-4 text-foreground text-[15px] leading-relaxed focus:outline-none prose max-w-none"
        style={{ fontFamily: "inherit" }}
        dangerouslySetInnerHTML={{ __html: initialContent }}
        onInput={(e) => {
          onHtmlChange(e.currentTarget.innerHTML);
          if (editorRef.current) {
            const imgs = editorRef.current.querySelectorAll("img.is-selected-img");
            imgs.forEach(img => img.classList.remove("is-selected-img"));
          }
          if (onImageSelect) onImageSelect(null);
        }}
        onBlur={(e) => onHtmlChange(e.currentTarget.innerHTML)}
        onClick={(e) => {
          if (editorRef.current) {
            const imgs = editorRef.current.querySelectorAll("img.is-selected-img");
            imgs.forEach(img => img.classList.remove("is-selected-img"));
          }

          if ((e.target as HTMLElement).tagName === "IMG") {
            const img = e.target as HTMLImageElement;
            img.classList.add("is-selected-img");
            if (onImageSelect) onImageSelect(img);
          } else {
            if (onImageSelect) onImageSelect(null);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Backspace" || e.key === "Delete" || e.key.length === 1) {
            if (editorRef.current) {
              const imgs = editorRef.current.querySelectorAll("img.is-selected-img");
              imgs.forEach(img => img.classList.remove("is-selected-img"));
            }
            if (onImageSelect) onImageSelect(null);
          }
        }}
      />
    </>
  );
});

const ImageResizer = ({
  editorRef,
  selectedImage,
  onResizeEnd
}: {
  editorRef: React.RefObject<HTMLDivElement>;
  selectedImage: HTMLImageElement | null;
  onResizeEnd: () => void;
}) => {
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const updateRect = useCallback(() => {
    if (!selectedImage || !editorRef.current) {
      setRect(null);
      return;
    }
    const editorRect = editorRef.current.getBoundingClientRect();
    const imgRect = selectedImage.getBoundingClientRect();

    setRect({
      top: imgRect.top - editorRect.top,
      left: imgRect.left - editorRect.left,
      width: imgRect.width,
      height: imgRect.height
    });
  }, [selectedImage, editorRef]);

  useEffect(() => {
    updateRect();
    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener('scroll', updateRect);
    }
    window.addEventListener('resize', updateRect);

    const observer = new MutationObserver(updateRect);
    if (editor) {
      observer.observe(editor, { childList: true, subtree: true, attributes: true });
    }

    return () => {
      if (editor) editor.removeEventListener('scroll', updateRect);
      window.removeEventListener('resize', updateRect);
      observer.disconnect();
    };
  }, [updateRect, editorRef]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedImage || !rect) return;

    const startX = e.clientX;
    const startWidth = rect.width;
    const startHeight = rect.height;
    const aspectRatio = startWidth / startHeight;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(50, startWidth + deltaX);
      const newHeight = newWidth / aspectRatio;

      selectedImage.style.width = `${newWidth}px`;
      selectedImage.style.height = `${newHeight}px`;
      selectedImage.style.maxWidth = '100%';

      updateRect();
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      onResizeEnd();
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  if (!selectedImage || !rect) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        pointerEvents: 'none',
        zIndex: 10
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: -6,
          right: -6,
          width: 14,
          height: 14,
          backgroundColor: 'hsl(var(--primary))',
          border: '2px solid white',
          borderRadius: '50%',
          cursor: 'nwse-resize',
          pointerEvents: 'auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
        }}
        onPointerDown={handlePointerDown}
      />
    </div>
  );
};

export const WriteBlogPopup: React.FC<WriteBlogPopupProps> = ({
  open,
  onClose,
  zIndex = 50,
  onBringToFront,
}) => {
  // ── State ──────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);

  const savedHtmlRef = useRef("");
  const handleHtmlChange = useCallback((html: string) => {
    savedHtmlRef.current = html;
  }, []);

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
    id: "writeBlog",
    isOpen: open,
    defaultWidth: 720,
    defaultHeight: 560,
    minWidth: MIN_W,
    minHeight: MIN_H,
    zIndex
  });

  // ── Refs ───────────────────────────────────────────────
  const popupRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorFileInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (selection && savedRangeRef.current) {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    }
  };

  // ── Rich Text Editor ────────────────────────────────────
  const format = (cmd: FormatCmd, value?: string) => {
    restoreSelection();
    document.execCommand(cmd, false, value);
  };

  const insertLink = () => {
    saveSelection();
    setTimeout(() => {
      const url = window.prompt("Enter URL:");
      if (!url) return;
      restoreSelection();
      document.execCommand("createLink", false, url);
    }, 10);
  };

  const triggerImageUpload = () => {
    saveSelection();
    editorFileInputRef.current?.click();
  };

  const handleEditorImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      restoreSelection();
      // Insert image with default 100% width and centered block
      document.execCommand("insertHTML", false, `<img src="${dataUrl}" style="max-width: 100%; width: 100%; border-radius: 8px; margin: 10px auto; display: block;" />`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleImageResize = (width: string) => {
    if (selectedImage) {
      selectedImage.style.width = width;
      selectedImage.style.height = "auto";
      selectedImage.style.maxWidth = "100%";
      if (editorRef.current) {
        handleHtmlChange(editorRef.current.innerHTML);
      }
    }
  };

  const handleImageAlignment = (alignment: "left" | "center" | "right") => {
    if (selectedImage) {
      if (alignment === "left") {
        selectedImage.style.display = "inline";
        selectedImage.style.float = "left";
        selectedImage.style.margin = "10px 15px 10px 0";
      } else if (alignment === "right") {
        selectedImage.style.display = "inline";
        selectedImage.style.float = "right";
        selectedImage.style.margin = "10px 0 10px 15px";
      } else {
        selectedImage.style.display = "block";
        selectedImage.style.float = "none";
        selectedImage.style.margin = "10px auto";
      }
      if (editorRef.current) {
        handleHtmlChange(editorRef.current.innerHTML);
      }
    }
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
      // Clean up selected image class before publishing
      if (editorRef.current) {
        const imgs = editorRef.current.querySelectorAll("img.is-selected-img");
        imgs.forEach(img => img.classList.remove("is-selected-img"));
        handleHtmlChange(editorRef.current.innerHTML);
      }

      const contentHTML = editorRef.current?.innerHTML || savedHtmlRef.current || "";
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

  // ── Toolbar button ──────────────────────────────────────
  const ToolBtn = ({
    icon,
    label,
    onAction,
    active,
  }: {
    icon: any;
    label: string;
    onAction: () => void;
    active?: boolean;
  }) => (
    <button
      type="button"
      title={label}
      onPointerDown={(e) => {
        e.preventDefault(); // Prevent focus loss
        e.stopPropagation(); // Prevent drag/bring-to-front interference
        saveSelection();
        onAction();
      }}
      className={`p-1.5 rounded-lg transition-all duration-75 ${active ? "bg-accent text-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
    >
      <HugeiconsIcon icon={icon} size={16} />
    </button>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Popup */}
          <motion.div
            key="blog-popup"
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
              maxHeight: "100vh",
            }}
            className="bg-card/98 backdrop-blur-2xl border border-border shadow-2xl rounded-[20px]"
          >
            {/* ── Resize Handles ──────────────────────── */}
            {renderResizeHandles()}

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
              <div className="flex-shrink-0 flex items-center gap-0.5 px-4 py-1.5 border-b border-border flex-wrap min-h-[44px]">
                {selectedImage ? (
                  <>
                    <span className="text-[13px] text-muted-foreground mr-2 ml-1 font-medium">Image:</span>
                    <button
                      type="button"
                      onPointerDown={(e) => { e.preventDefault(); handleImageResize("25%"); }}
                      className="text-[12px] px-2 py-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors font-medium"
                    >
                      25%
                    </button>
                    <button
                      type="button"
                      onPointerDown={(e) => { e.preventDefault(); handleImageResize("50%"); }}
                      className="text-[12px] px-2 py-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors font-medium"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onPointerDown={(e) => { e.preventDefault(); handleImageResize("100%"); }}
                      className="text-[12px] px-2 py-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors font-medium"
                    >
                      100%
                    </button>
                    <div className="w-px h-4 bg-border mx-2" />
                    <ToolBtn icon={TextAlignLeftIcon} label="Align Left" onAction={() => handleImageAlignment("left")} />
                    <ToolBtn icon={TextAlignCenterIcon} label="Align Center" onAction={() => handleImageAlignment("center")} />
                    <ToolBtn icon={TextAlignRightIcon} label="Align Right" onAction={() => handleImageAlignment("right")} />
                    <div className="flex-1" />
                    <button
                      className="text-[12px] font-medium text-destructive hover:bg-destructive/10 px-2.5 py-1.5 rounded-lg transition-colors"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        selectedImage.remove();
                        setSelectedImage(null);
                        if (editorRef.current) handleHtmlChange(editorRef.current.innerHTML);
                      }}
                    >
                      Remove
                    </button>
                    <button
                      className="text-[12px] font-medium text-foreground  hover:bg-gray-600 px-2.5 py-1.5 rounded-lg transition-colors ml-1"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        selectedImage.classList.remove("is-selected-img");
                        setSelectedImage(null);
                        if (editorRef.current) handleHtmlChange(editorRef.current.innerHTML);
                      }}
                    >
                      Done
                    </button>
                  </>
                ) : (
                  <>
                    <ToolBtn icon={TextBoldIcon} label="Bold" onAction={() => format("bold")} />
                    <ToolBtn icon={TextItalicIcon} label="Italic" onAction={() => format("italic")} />
                    <ToolBtn icon={TextUnderlineIcon} label="Underline" onAction={() => format("underline")} />
                    <div className="w-px h-4 bg-border mx-1" />
                    <ToolBtn icon={ListViewIcon} label="List" onAction={() => format("insertUnorderedList")} />
                    <div className="w-px h-4 bg-border mx-1" />
                    <ToolBtn icon={TextAlignLeftIcon} label="Align Left" onAction={() => format("justifyLeft")} />
                    <ToolBtn icon={TextAlignCenterIcon} label="Align Center" onAction={() => format("justifyCenter")} />
                    <ToolBtn icon={TextAlignRightIcon} label="Align Right" onAction={() => format("justifyRight")} />
                    <div className="w-px h-4 bg-border mx-1" />
                    <ToolBtn icon={LinkSquare01Icon} label="Insert Link" onAction={insertLink} />
                    <ToolBtn icon={ImageAdd01Icon} label="Insert Image" onAction={triggerImageUpload} />
                    <input ref={editorFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleEditorImageChange} />
                  </>
                )}
              </div>
            )}

            {/* ── Editor / Preview ─────────────────────── */}
            <div className="flex-1 overflow-hidden relative">
              {isPreview && (
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
              )}
              <div style={{ display: isPreview ? 'none' : 'block', height: '100%', position: 'relative', overflow: 'hidden' }}>
                <RichTextEditor
                  editorRef={editorRef}
                  initialContent={savedHtmlRef.current}
                  onHtmlChange={handleHtmlChange}
                  onImageSelect={setSelectedImage}
                />
                <ImageResizer
                  editorRef={editorRef}
                  selectedImage={selectedImage}
                  onResizeEnd={() => {
                    if (editorRef.current) {
                      handleHtmlChange(editorRef.current.innerHTML);
                    }
                  }}
                />
              </div>
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
