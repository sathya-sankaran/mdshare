"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { LinkManager } from "@/components/ui/link-manager";
import { CommentSidebar } from "@/components/editor/comment-sidebar";
import type { Comment } from "@/components/editor/comment-sidebar";
import { DownloadButton } from "@/components/ui/download-button";
import { AboutButton } from "@/components/ui/about-modal";
import { MarkdownViewer } from "@/components/editor/markdown-viewer";
import type { DocumentRow } from "@/lib/db";
import type { Permission } from "@/lib/tokens";
import type { CommentAnchor } from "@/components/editor/comment-highlight";
import { useDocumentWS } from "@/lib/use-document-ws";
import { useDisplayName } from "@/lib/use-display-name";
import { saveRecentDoc } from "@/lib/recent-docs";

interface DocumentViewProps {
  document: DocumentRow;
  permission: Permission;
  tokenKey: string;
}

const PERMISSION_LABELS: Record<Permission, string> = {
  admin: "Admin",
  edit: "Editing",
  comment: "Commenting",
  view: "View only",
};

const BADGE_COLORS: Record<Permission, string> = {
  admin: "bg-purple-600",
  edit: "bg-blue-600",
  comment: "bg-amber-600",
  view: "bg-neutral-600",
};

type Panel = "comments" | "links";

export function DocumentView({
  document: doc,
  permission,
  tokenKey,
}: DocumentViewProps) {
  const [saveStatus, setSaveStatus] = useState<string>("Ready");
  const [openPanel, setOpenPanel] = useState<Panel | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [liveContent, setLiveContent] = useState(doc.content);
  const [lightEditor, setLightEditor] = useState(false);
  const [lastContentHash, setLastContentHash] = useState(doc.content_hash);
  const isSavingRef = useRef(false);
  const { name: displayName, setName: setDisplayName } = useDisplayName();
  const editable = permission === "admin" || permission === "edit";
  const canComment = permission === "admin" || permission === "edit" || permission === "comment";

  const togglePanel = useCallback((panel: Panel) => {
    setOpenPanel((prev) => (prev === panel ? null : panel));
  }, []);

  useEffect(() => {
    saveRecentDoc({
      id: doc.id,
      title: doc.title,
      key: tokenKey,
      permission,
    });
  }, [doc.id, doc.title, tokenKey, permission]);

  const [viewers, setViewers] = useState<{ name: string }[]>([]);
  const sessionIdRef = useRef(Math.random().toString(36).slice(2));

  const flashTabTitle = useCallback(() => {
    const original = document.title;
    document.title = "Updated — " + original.replace("Updated — ", "");
    setTimeout(() => { document.title = original; }, 3000);
  }, []);

  // WebSocket for instant updates; poll is the fallback
  const handleWSUpdate = useCallback((content: string, contentHash: string) => {
    if (isSavingRef.current) return;
    setLiveContent(content);
    setLastContentHash(contentHash);
    setSaveStatus("Updated");
    flashTabTitle();
    setTimeout(() => setSaveStatus("Ready"), 2000);
  }, [flashTabTitle]);

  const { broadcastUpdate, connected: wsConnected } = useDocumentWS({
    documentId: doc.id,
    tokenKey,
    onContentUpdate: handleWSUpdate,
    enabled: true,
  });

  // Use refs for values that change often to avoid recreating the poll callback
  const lastContentHashRef = useRef(lastContentHash);
  lastContentHashRef.current = lastContentHash;
  const displayNameRef = useRef(displayName);
  displayNameRef.current = displayName;
  const wsConnectedRef = useRef(wsConnected);
  wsConnectedRef.current = wsConnected;

  const poll = useCallback(async () => {
    if (isSavingRef.current) return;
    try {
      const res = await fetch(`/api/d/${doc.id}/poll?key=${tokenKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          name: displayNameRef.current,
          content_hash: wsConnectedRef.current ? undefined : lastContentHashRef.current,
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        content_hash: string;
        content?: string;
        comments: Comment[];
        viewers: { name: string }[];
      };

      setViewers(data.viewers);
      setComments(data.comments);

      if (!wsConnectedRef.current && data.content && data.content_hash !== lastContentHashRef.current) {
        setLiveContent(data.content);
        setLastContentHash(data.content_hash);
        setSaveStatus("Updated");
        flashTabTitle();
        setTimeout(() => setSaveStatus("Ready"), 2000);
      }
    } catch {}
  }, [doc.id, tokenKey, flashTabTitle]);

  useEffect(() => {
    poll();
    const interval = setInterval(() => {
      if (!document.hidden) poll();
    }, 15000);
    return () => clearInterval(interval);
  }, [poll]);

  // Immediate refetch after posting a comment (don't wait for next poll)
  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/d/${doc.id}/comments?key=${tokenKey}`);
    if (res.ok) {
      const data = (await res.json()) as { comments: Comment[] };
      setComments(data.comments);
    }
  }, [doc.id, tokenKey]);

  const commentAnchors: CommentAnchor[] = useMemo(
    () =>
      comments
        .filter((c) => c.anchor_text)
        .map((c) => ({ id: c.id, anchorText: c.anchor_text! })),
    [comments]
  );

  // Text selection tracking
  useEffect(() => {
    const handleSelection = (e: Event) => {
      const editorContainer = document.getElementById("editor-scroll-container");
      if (!editorContainer || !editorContainer.contains(e.target as Node)) return;
      const selection = window.getSelection();
      const text = selection?.toString().trim() || "";
      if (text) setSelectedText(text);
    };
    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("touchend", handleSelection);
    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("touchend", handleSelection);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      switch (e.key) {
        case "s":
          // Save — trigger the editor's debounced save immediately
          e.preventDefault();
          break;
        case "\\":
          // Toggle comments panel
          e.preventDefault();
          if (canComment) togglePanel("comments");
          break;
        case "l":
          // Toggle links panel (admin only)
          if (permission === "admin") {
            e.preventDefault();
            togglePanel("links");
          }
          break;
        case "d":
          // Download
          e.preventDefault();
          document.querySelector<HTMLButtonElement>("[title='Download .md']")?.click();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canComment, permission, togglePanel]);

  const handleUpdate = useCallback(
    async (markdown: string) => {
      setSaveStatus("Saving...");
      isSavingRef.current = true;
      try {
        const res = await fetch(`/api/d/${doc.id}?key=${tokenKey}`, {
          method: "PUT",
          headers: {
            "Content-Type": "text/markdown",
            "X-Edited-Via": "browser",
            "X-Author": displayName,
          },
          body: markdown,
        });
        if (res.ok) {
          const data = (await res.json()) as { status: string; content_hash?: string };
          if (data.content_hash) {
            setLastContentHash(data.content_hash);
            // Broadcast to other clients via WebSocket
            broadcastUpdate(markdown, data.content_hash);
          }
          setSaveStatus(data.status === "unchanged" ? "No changes" : "Saved");
          setTimeout(() => setSaveStatus("Ready"), 2000);
        } else {
          setSaveStatus("Save failed");
        }
      } catch {
        setSaveStatus("Save failed");
      } finally {
        isSavingRef.current = false;
      }
    },
    [doc.id, tokenKey, broadcastUpdate, displayName]
  );

  return (
    <div className="flex flex-col h-dvh">
      {/* Top navigation */}
      <header className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-neutral-800 bg-neutral-950 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <a href="/" className="text-base font-bold text-white shrink-0">
            md<span className="text-indigo-400">share</span>
          </a>
          <span className="text-neutral-700 hidden sm:inline">/</span>
          <span className="text-sm text-neutral-300 truncate hidden sm:inline">
            {doc.title}
          </span>
          {viewers.length > 0 && (
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-green-400 shrink-0" title={viewers.map(v => v.name).join(", ")}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {viewers.length === 1
                ? viewers[0].name
                : `${viewers.length} online`}
            </span>
          )}
          <span
            className={`text-[10px] px-2 py-0.5 rounded uppercase font-semibold text-white shrink-0 ${BADGE_COLORS[permission]}`}
          >
            {PERMISSION_LABELS[permission]}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Panel toggle buttons */}
          {canComment && (
            <button
              onClick={() => togglePanel("comments")}
              className={`relative p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs transition-colors ${
                openPanel === "comments"
                  ? "bg-indigo-600 text-white"
                  : "bg-neutral-800 hover:bg-neutral-700 text-neutral-400"
              }`}
              title="Toggle comments"
            >
              <svg className="w-4 h-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <span className="hidden sm:inline">Comments</span>
              {comments.length > 0 && (
                <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold ${
                  openPanel === "comments" ? "bg-white text-indigo-600" : "bg-indigo-600 text-white"
                }`}>
                  {comments.length}
                </span>
              )}
            </button>
          )}
          {permission === "admin" && (
            <button
              onClick={() => togglePanel("links")}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs transition-colors ${
                openPanel === "links"
                  ? "bg-indigo-600 text-white"
                  : "bg-neutral-800 hover:bg-neutral-700 text-neutral-400"
              }`}
              title="Toggle share links"
            >
              <svg className="w-4 h-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="hidden sm:inline">Links</span>
            </button>
          )}
          <DownloadButton
            documentId={doc.id}
            tokenKey={tokenKey}
            title={doc.title}
          />
          <AboutButton />
        </div>
      </header>

      {/* Mobile title bar */}
      <div className="sm:hidden px-3 py-1.5 border-b border-neutral-800 bg-neutral-950">
        <span className="text-xs text-neutral-400 truncate block">
          {doc.title}
        </span>
      </div>

      {/* Read-only bar */}
      {!editable && (
        <div className="flex items-center justify-between px-3 sm:px-5 py-2 bg-neutral-950 border-b border-neutral-800 text-xs text-neutral-500">
          <span>
            {permission === "comment"
              ? "Read-only · Select text then add a comment"
              : "View only"}
          </span>
          <button
            onClick={() => setLightEditor((v) => !v)}
            className="px-2 py-1 rounded text-neutral-400 hover:bg-neutral-800 transition-colors"
            title={lightEditor ? "Switch to dark" : "Switch to light"}
          >
            {lightEditor ? "\u263E" : "\u2600"}
          </button>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Editor — always rendered, flex-1 */}
        <div className={`flex flex-col flex-1 min-h-0 min-w-0 editor-area${lightEditor ? " editor-light" : ""}`}>
          {editable ? (
            <TiptapEditor
              content={liveContent}
              editable={editable}
              onUpdate={handleUpdate}
              commentAnchors={commentAnchors}
              activeCommentId={activeCommentId}
              lightMode={lightEditor}
              onToggleLight={() => setLightEditor((v) => !v)}
            />
          ) : (
            <MarkdownViewer content={liveContent} />
          )}
          {/* Status bar */}
          <div className="flex items-center justify-between px-3 sm:px-5 py-1.5 border-t border-neutral-800 text-xs text-neutral-300 bg-neutral-950 gap-2">
            <span className="flex items-center gap-1.5 shrink-0">
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${
                  saveStatus === "Saved" || saveStatus === "Ready"
                    ? "bg-green-400"
                    : saveStatus === "Saving..." || saveStatus === "Updated"
                    ? "bg-yellow-400"
                    : "bg-red-400"
                }`}
              />
              {saveStatus}
            </span>
            <span className="hidden sm:inline text-neutral-500">
              {doc.content.split(/\s+/).filter(Boolean).length} words
            </span>
            <DisplayNameEditor name={displayName} onChangeName={setDisplayName} />
          </div>
        </div>

        {/* Slide-over panel (comments or links) */}
        {/* Backdrop on mobile */}
        {openPanel && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setOpenPanel(null)}
          />
        )}

        {/* Panel container */}
        <div
          className={`
            fixed right-0 top-0 bottom-0 z-40
            lg:relative lg:z-auto
            w-[85vw] sm:w-80 lg:w-80
            bg-neutral-950 border-l border-neutral-800
            transform transition-transform duration-200 ease-out
            ${openPanel ? "translate-x-0" : "translate-x-full lg:hidden"}
            flex flex-col
          `}
        >
          {/* Panel header with close button */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 lg:hidden">
            <h3 className="text-sm font-semibold text-neutral-300">
              {openPanel === "comments" ? "Comments" : "Share Links"}
            </h3>
            <button
              onClick={() => setOpenPanel(null)}
              className="p-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 transition-colors touch-manipulation"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {openPanel === "comments" && canComment && (
              <CommentSidebar
                documentId={doc.id}
                tokenKey={tokenKey}
                canComment={canComment}
                selectedText={selectedText}
                onClearSelection={() => setSelectedText("")}
                comments={comments}
                onCommentsChange={fetchComments}
                activeCommentId={activeCommentId}
                onActiveCommentChange={setActiveCommentId}
                displayName={displayName}
                onChangeDisplayName={setDisplayName}
              />
            )}
            {openPanel === "links" && permission === "admin" && (
              <LinkManager documentId={doc.id} adminKey={tokenKey} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DisplayNameEditor({
  name,
  onChangeName,
}: {
  name: string;
  onChangeName: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  if (editing) {
    return (
      <span className="flex items-center gap-1 shrink-0">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onChangeName(draft);
              setEditing(false);
            }
            if (e.key === "Escape") {
              setDraft(name);
              setEditing(false);
            }
          }}
          onBlur={() => {
            onChangeName(draft);
            setEditing(false);
          }}
          className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white w-28 sm:w-32 focus:outline-none focus:border-indigo-500 touch-manipulation"
          placeholder="Your name"
        />
      </span>
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(name);
        setEditing(true);
      }}
      className="shrink-0 text-indigo-400 hover:text-indigo-300 transition-colors truncate max-w-[120px] sm:max-w-[150px] text-xs"
      title="Click to change your display name"
    >
      {name === "Anonymous" ? "Set name" : name}
    </button>
  );
}
