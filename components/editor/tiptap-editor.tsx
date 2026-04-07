
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { Markdown } from "tiptap-markdown";
import { useEffect, useRef } from "react";

const lowlight = createLowlight(common);
import { Toolbar } from "./toolbar";
import { CommentHighlight } from "./comment-highlight";
import type { CommentAnchor } from "./comment-highlight";

interface TiptapEditorProps {
  content: string;
  editable: boolean;
  onUpdate?: (markdown: string) => void;
  commentAnchors?: CommentAnchor[];
  activeCommentId?: string | null;
  className?: string;
  lightMode?: boolean;
  onToggleLight?: () => void;
  isAdmin?: boolean;
}

export function TiptapEditor({
  content,
  editable,
  onUpdate,
  commentAnchors = [],
  activeCommentId = null,
  className = "",
  lightMode,
  onToggleLight,
  isAdmin,
}: TiptapEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: { class: "hljs" },
      }),
      Placeholder.configure({
        placeholder: "Start writing...",
      }),
      Link.configure({
        openOnClick: !editable,
        HTMLAttributes: { class: "text-indigo-400 underline" },
      }),
      Table.configure({
        resizable: false,
        HTMLAttributes: { class: "md-table" },
      }),
      TableRow,
      TableCell,
      TableHeader,
      Markdown,
      CommentHighlight,
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: `prose prose-invert prose-sm max-w-none focus:outline-none ${className}`,
      },
    },
    onUpdate: ({ editor }) => {
      if (!onUpdate) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const md = (editor.storage as Record<string, any>).markdown.getMarkdown();
        onUpdate(md);
      }, 1000);
    },
  });

  // Sync comment anchors into the extension storage and trigger redecoration
  useEffect(() => {
    if (!editor) return;
    (editor.storage as Record<string, any>).commentHighlight.anchors = commentAnchors;
    (editor.storage as Record<string, any>).commentHighlight.activeCommentId = activeCommentId;
    // Force a transaction to re-run the plugin's apply
    editor.view.dispatch(editor.state.tr);
  }, [editor, commentAnchors, activeCommentId]);

  // Scroll to a highlighted anchor when activeCommentId changes
  useEffect(() => {
    if (!editor || !activeCommentId) return;

    // Small delay to let decorations render
    setTimeout(() => {
      const el = editor.view.dom.querySelector(
        `[data-comment-id="${activeCommentId}"]`
      );
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);
  }, [editor, activeCommentId]);

  // Update content when it changes externally (live updates)
  const lastExternalContent = useRef(content);
  useEffect(() => {
    if (!editor || content === lastExternalContent.current) return;
    lastExternalContent.current = content;

    if (!editor.isFocused) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Cmd+K shortcut for link insertion
  useEffect(() => {
    if (!editor || !editable) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (editor.isActive("link")) {
          const currentUrl = editor.getAttributes("link").href || "";
          const url = prompt("Edit or clear URL (empty to remove):", currentUrl);
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().unsetLink().run();
          } else {
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }
        } else {
          const url = prompt("Enter URL:", "https://");
          if (url) editor.chain().focus().toggleLink({ href: url }).run();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editor, editable]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!editor) return null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {editable && <Toolbar editor={editor} lightMode={lightMode} onToggleLight={onToggleLight} isAdmin={isAdmin} />}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6" id="editor-scroll-container">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
