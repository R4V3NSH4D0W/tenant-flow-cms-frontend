"use client";

import { useEffect, useMemo, useState } from "react";
import Color from "@tiptap/extension-color";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Palette,
  Quote,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/shared/utils";

export interface CmsHtmlDescriptionEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  /** For label association; forwarded to the editor wrapper. */
  id?: string;
  placeholder?: string;
  className?: string;
  /** Tighter toolbar + min height for layout builder defaults. */
  variant?: "default" | "compact";
}

export function CmsHtmlDescriptionEditor({
  value,
  onChange,
  disabled = false,
  id,
  placeholder = "Write something…",
  className,
  variant = "default",
}: CmsHtmlDescriptionEditorProps) {
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  const [selectedTextColor, setSelectedTextColor] = useState("");
  const [hasTextSelection, setHasTextSelection] = useState(false);

  function syncSelectionState(ed: NonNullable<ReturnType<typeof useEditor>>) {
    setSelectedTextColor(String(ed.getAttributes("textStyle").color ?? ""));
    setHasTextSelection(!ed.state.selection.empty);
  }

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          HTMLAttributes: {
            class: "text-primary underline underline-offset-2",
          },
        },
        underline: {},
      }),
      TextStyle,
      Color.configure({ types: ["textStyle"] }),
      Placeholder.configure({ placeholder }),
    ],
    [placeholder]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: value || "",
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
      syncSelectionState(ed);
    },
    onSelectionUpdate: ({ editor: ed }) => {
      syncSelectionState(ed);
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const next = value ?? "";
    const current = editor.getHTML();
    if (current === next) return;
    const wantEmpty = !next.trim();
    if (wantEmpty && editor.isEmpty) return;
    editor.commands.setContent(next, { emitUpdate: false });
  }, [value, editor]);

  const compact = variant === "compact";
  const btnClass = compact ? "h-7 w-7 px-0" : "h-8 w-8 px-0";
  const editorMinHeightClass = compact ? "min-h-[96px]" : "min-h-[140px]";
  const htmlValue = value ?? "";
  const colorInputValue = /^#[0-9a-f]{6}$/i.test(selectedTextColor)
    ? selectedTextColor
    : "#111827";
  const colorDisabled = mode === "html" || !hasTextSelection;

  function openLinkDialog() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    setLinkDraft(prev ?? "");
    setLinkDialogOpen(true);
  }

  function applyLink() {
    if (!editor) return;
    const next = linkDraft.trim();
    if (!next) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkDialogOpen(false);
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: next })
      .run();
    setLinkDialogOpen(false);
  }

  function clearLink() {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkDraft("");
    setLinkDialogOpen(false);
  }

  return (
    <>
      <div
        id={id}
        className={cn(
          "min-w-0 overflow-hidden rounded-md border border-input bg-background shadow-xs",
          disabled && "pointer-events-none opacity-60",
          className
        )}
      >
      {editor ? (
        <div
          className={cn(
            "flex flex-wrap gap-0.5 border-b border-border bg-muted/40 p-1",
            compact && "gap-0"
          )}
          role="toolbar"
          aria-label="Formatting"
        >
          <div className="mr-1 flex rounded-md border bg-background p-0.5">
            <Button
              type="button"
              variant={mode === "visual" ? "secondary" : "ghost"}
              size="sm"
              className={compact ? "h-6 px-2 text-[11px]" : "h-7 px-2 text-xs"}
              onClick={() => setMode("visual")}
              aria-pressed={mode === "visual"}
            >
              Visual
            </Button>
            <Button
              type="button"
              variant={mode === "html" ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                compact ? "h-6 px-2 text-[11px]" : "h-7 px-2 text-xs",
                "gap-1"
              )}
              onClick={() => setMode("html")}
              aria-pressed={mode === "html"}
              aria-label="Edit HTML source"
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>HTML</span>
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(btnClass, editor.isActive("bold") && "bg-muted")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={mode === "html"}
            aria-pressed={editor.isActive("bold")}
            aria-label="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(btnClass, editor.isActive("italic") && "bg-muted")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={mode === "html"}
            aria-pressed={editor.isActive("italic")}
            aria-label="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              btnClass,
              editor.isActive("underline") && "bg-muted"
            )}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            disabled={mode === "html"}
            aria-pressed={editor.isActive("underline")}
            aria-label="Underline"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </Button>
          <div
            className={cn(
              "mx-0.5 flex items-center gap-1 rounded-md border bg-background px-1",
              compact ? "h-7" : "h-8",
              mode === "html" && "opacity-50"
            )}
          >
            <Palette className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="color"
              value={colorInputValue}
              onChange={(event) =>
                editor.chain().focus().setColor(event.target.value).run()
              }
              disabled={colorDisabled}
              className="h-5 w-6 cursor-pointer rounded border-0 bg-transparent p-0 disabled:cursor-not-allowed"
              aria-label="Text color"
              title={
                hasTextSelection
                  ? "Apply color to selected text"
                  : "Select text before applying color"
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={compact ? "h-5 px-1 text-[10px]" : "h-6 px-1 text-xs"}
              onClick={() => editor.chain().focus().unsetColor().run()}
              disabled={colorDisabled || !selectedTextColor}
              aria-label="Clear text color"
            >
              Default
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              btnClass,
              editor.isActive("heading", { level: 2 }) && "bg-muted"
            )}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            disabled={mode === "html"}
            aria-pressed={editor.isActive("heading", { level: 2 })}
            aria-label="Heading 2"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              btnClass,
              editor.isActive("heading", { level: 3 }) && "bg-muted"
            )}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            disabled={mode === "html"}
            aria-pressed={editor.isActive("heading", { level: 3 })}
            aria-label="Heading 3"
          >
            <Heading3 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              btnClass,
              editor.isActive("bulletList") && "bg-muted"
            )}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            disabled={mode === "html"}
            aria-pressed={editor.isActive("bulletList")}
            aria-label="Bullet list"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              btnClass,
              editor.isActive("orderedList") && "bg-muted"
            )}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={mode === "html"}
            aria-pressed={editor.isActive("orderedList")}
            aria-label="Numbered list"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              btnClass,
              editor.isActive("blockquote") && "bg-muted"
            )}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            disabled={mode === "html"}
            aria-pressed={editor.isActive("blockquote")}
            aria-label="Quote"
          >
            <Quote className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(btnClass, editor.isActive("code") && "bg-muted")}
            onClick={() => editor.chain().focus().toggleCode().run()}
            disabled={mode === "html"}
            aria-pressed={editor.isActive("code")}
            aria-label="Inline code"
          >
            <Code2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={btnClass}
            onClick={openLinkDialog}
            disabled={mode === "html"}
            aria-label="Link"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={btnClass}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={mode === "html" || !editor.can().undo()}
            aria-label="Undo"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={btnClass}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={mode === "html" || !editor.can().redo()}
            aria-label="Redo"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "border-b border-border bg-muted/20",
            compact ? "h-[33px]" : "h-[41px]"
          )}
        />
      )}
      {editor && mode === "visual" ? (
        <EditorContent
          editor={editor}
          className={cn(
            "cms-html-description-editor [&_.ProseMirror]:min-h-[var(--cms-html-min-h,140px)] [&_.ProseMirror]:max-w-none [&_.ProseMirror]:px-3 [&_.ProseMirror]:py-2 [&_.ProseMirror]:text-sm [&_.ProseMirror]:outline-none [&_.ProseMirror]:focus:outline-none",
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none",
            "[&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold",
            "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
            "[&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-3 [&_blockquote]:italic",
            compact &&
              "[--cms-html-min-h:96px] [&_.ProseMirror]:min-h-[96px] [&_.ProseMirror]:text-xs"
          )}
        />
      ) : editor ? (
        <div className="space-y-2 p-2">
          <Textarea
            value={htmlValue}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            spellCheck={false}
            className={cn(
              "w-full resize-y border-slate-700 bg-slate-950 font-mono text-xs leading-relaxed text-slate-100 shadow-inner placeholder:text-slate-500 focus-visible:ring-slate-500",
              editorMinHeightClass
            )}
            aria-label="Edit description HTML"
            placeholder="<p>Write HTML here...</p>"
          />
          <p className="text-xs text-muted-foreground">
            HTML mode edits the saved description markup directly. Switch back to
            Visual to preview it in the TipTap editor.
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "animate-pulse bg-muted/30",
            editorMinHeightClass
          )}
        />
      )}
      </div>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit link</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`${id ?? "cms-description"}-link-url`}>
              Link URL
            </Label>
            <Input
              id={`${id ?? "cms-description"}-link-url`}
              type="url"
              value={linkDraft}
              onChange={(event) => setLinkDraft(event.target.value)}
              placeholder="https://example.com"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Select text first to link only that text. Leave empty or use Remove
              link to clear the current link.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLinkDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" variant="outline" onClick={clearLink}>
              Remove link
            </Button>
            <Button type="button" onClick={applyLink}>
              Apply link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
