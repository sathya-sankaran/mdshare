
import { useState, useEffect, useCallback, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";

export interface Comment {
  id: string;
  author_name: string;
  content: string;
  anchor_text: string | null;
  anchor_start: number | null;
  anchor_end: number | null;
  resolved: number;
  parent_id: string | null;
  created_at: string;
}

interface CommentSidebarProps {
  documentId: string;
  tokenKey: string;
  canComment: boolean;
  canResolve: boolean;
  pendingAnchor: { text: string; start: number; end: number } | null;
  onClearSelection: () => void;
  comments: Comment[];
  onCommentsChange: () => void;
  activeCommentId: string | null;
  onActiveCommentChange: (id: string | null) => void;
  displayName: string;
  onChangeDisplayName: (name: string) => void;
  onAfterOwnPost?: () => void;
  onClosePanel?: () => void;
}

export function CommentSidebar({
  documentId,
  tokenKey,
  canComment,
  canResolve,
  pendingAnchor,
  onClearSelection,
  comments,
  onCommentsChange,
  activeCommentId,
  onActiveCommentChange,
  displayName,
  onChangeDisplayName,
  onAfterOwnPost,
  onClosePanel,
}: CommentSidebarProps) {
  const selectedText = pendingAnchor?.text ?? "";
  const submitKey =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
      ? "⌘↵"
      : "Ctrl+↵";
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const commentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevSelectedTextRef = useRef("");

  useEffect(() => {
    if (selectedText && selectedText !== prevSelectedTextRef.current) {
      textareaRef.current?.focus();
    }
    prevSelectedTextRef.current = selectedText;
  }, [selectedText]);

  const toggleResolve = async (commentId: string, currentlyResolved: boolean) => {
    await fetch(`/api/comments/${commentId}?key=${tokenKey}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: !currentlyResolved }),
    });
    onCommentsChange();
  };

  const unresolvedComments = comments.filter((c) => !c.resolved);
  const resolvedComments = comments.filter((c) => c.resolved);
  const displayComments = showResolved ? comments : unresolvedComments;

  // Listen for clicks on highlights in the editor
  useEffect(() => {
    const handler = (e: Event) => {
      const commentId = (e as CustomEvent).detail?.commentId;
      if (commentId) {
        onActiveCommentChange(commentId);
        // Scroll to the comment in the sidebar
        setTimeout(() => {
          commentRefs.current[commentId]?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 50);
      }
    };
    window.addEventListener("comment-highlight-click", handler);
    return () => window.removeEventListener("comment-highlight-click", handler);
  }, [onActiveCommentChange]);

  const postReply = async (parentId: string) => {
    if (!replyText.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(
        `/api/d/${documentId}/comments?key=${tokenKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: replyText,
            author_name: displayName,
            parent_id: parentId,
          }),
        }
      );
      if (res.ok) {
        setReplyText("");
        setReplyingTo(null);
        onCommentsChange();
        onAfterOwnPost?.();
      }
    } finally {
      setPosting(false);
    }
  };

  const postComment = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(
        `/api/d/${documentId}/comments?key=${tokenKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: newComment,
            author_name: displayName,
            anchor_text: pendingAnchor?.text ?? null,
            anchor_start: pendingAnchor?.start ?? null,
            anchor_end: pendingAnchor?.end ?? null,
          }),
        }
      );
      if (res.ok) {
        setNewComment("");
        onClearSelection();
        onCommentsChange();
        onAfterOwnPost?.();
      }
    } finally {
      setPosting(false);
    }
  };

  const timeAgo = (dateStr: string) => {
    const seconds = Math.floor(
      (Date.now() - new Date(dateStr + "Z").getTime()) / 1000
    );
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="w-full bg-neutral-950 p-4 overflow-y-auto flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Comments ({unresolvedComments.length})
        </h3>
        {resolvedComments.length > 0 && (
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            {showResolved ? "Hide" : "Show"} resolved ({resolvedComments.length})
          </button>
        )}
      </div>

      {/* Add comment form — at the top so it stays visible above the keyboard on mobile */}
      {canComment && (
        <div className="border-b border-neutral-800 pb-3 mb-3">
          {selectedText ? (
            <div className="flex items-start gap-1 mb-2">
              <div className="flex-1 text-[11px] text-indigo-400 italic border-l-2 border-indigo-500 pl-2">
                &ldquo;{selectedText.slice(0, 60)}
                {selectedText.length > 60 ? "..." : ""}&rdquo;
              </div>
              <button
                onClick={onClearSelection}
                className="text-neutral-600 hover:text-neutral-400 text-xs shrink-0 px-1"
                title="Remove selection"
              >
                &times;
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-neutral-600 mb-2 italic">
              Select text in the editor to anchor your comment
            </p>
          )}
          <p className="text-[11px] text-neutral-600 mb-2">
            Commenting as{" "}
            {displayName === "Anonymous" ? (
              <button
                onClick={() => {
                  const name = prompt("What's your name?");
                  if (name?.trim()) onChangeDisplayName(name.trim());
                }}
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
              >
                Anonymous (tap to set name)
              </button>
            ) : (
              <span className="text-neutral-300">{displayName}</span>
            )}
          </p>
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                if (newComment.trim() && !posting) postComment();
              }
            }}
            placeholder={
              selectedText
                ? `Comment on selected text... (${submitKey} to post)`
                : `Add a comment... (${submitKey} to post)`
            }
            rows={3}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-300 placeholder-neutral-600 resize-none mb-2 touch-manipulation"
          />
          <button
            onClick={postComment}
            disabled={posting || !newComment.trim()}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-600 text-white text-sm font-medium rounded-lg transition-colors touch-manipulation"
          >
            {posting ? <><Spinner context="comment" /></> : "Post Comment"}
          </button>
        </div>
      )}

      {/* Comment list — grouped with replies */}
      <div className="space-y-3 flex-1 overflow-y-auto mb-4">
        {(() => {
          // Group: top-level comments with their replies
          const topLevel = displayComments.filter(c => !c.parent_id);
          const repliesMap = new Map<string, Comment[]>();
          for (const c of displayComments) {
            if (c.parent_id) {
              if (!repliesMap.has(c.parent_id)) repliesMap.set(c.parent_id, []);
              repliesMap.get(c.parent_id)!.push(c);
            }
          }

          if (topLevel.length === 0 && displayComments.length === 0) {
            return (
              <p className="text-xs text-neutral-600 text-center py-4">
                {comments.length > 0 ? "All comments resolved" : "Select text in the document to leave a comment"}
              </p>
            );
          }

          return topLevel.map((comment) => {
            const isActive = activeCommentId === comment.id;
            const isResolved = !!comment.resolved;
            const replies = repliesMap.get(comment.id) || [];

            return (
              <div key={comment.id}>
                {/* Parent comment */}
                <div
                  ref={(el) => { commentRefs.current[comment.id] = el; }}
                  onClick={() => {
                    if (comment.anchor_text) {
                      onActiveCommentChange(comment.id);
                      // Always scroll, even if already active
                      const el = document.querySelector(
                        `[data-comment-id="${comment.id}"]`
                      );
                      if (el) {
                        el.scrollIntoView({ behavior: "smooth", block: "center" });
                      }
                      // On mobile the panel covers the editor — close it so the
                      // user sees the highlighted anchor text in the document.
                      if (window.innerWidth < 1024 && onClosePanel) {
                        onClosePanel();
                      }
                    }
                  }}
                  className={`rounded-lg p-3 transition-colors ${
                    comment.anchor_text ? "cursor-pointer" : ""
                  } ${isResolved ? "opacity-60" : ""} ${
                    isActive
                      ? "bg-indigo-900/30 ring-1 ring-indigo-500"
                      : "bg-neutral-900 hover:bg-neutral-800/80"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-neutral-300">
                      {comment.author_name}
                    </span>
                    <span className="text-[11px] text-neutral-600">
                      {timeAgo(comment.created_at)}
                    </span>
                    {isResolved && (
                      <span className="text-[11px] text-green-500 font-medium">Resolved</span>
                    )}
                  </div>
                  {comment.anchor_text && (
                    <p className={`text-[11px] italic mb-1.5 border-l-2 pl-2 ${
                      isActive ? "text-indigo-300 border-indigo-400" : "text-indigo-400 border-indigo-500"
                    }`}>
                      &ldquo;{comment.anchor_text.slice(0, 80)}
                      {comment.anchor_text.length > 80 ? "..." : ""}&rdquo;
                    </p>
                  )}
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {comment.content}
                  </p>
                  <div className="flex gap-3 mt-2">
                    {canResolve && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleResolve(comment.id, isResolved); }}
                        className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors"
                      >
                        {isResolved ? "Unresolve" : "Resolve"}
                      </button>
                    )}
                    {canComment && !isResolved && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText(""); }}
                        className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors"
                      >
                        Reply
                      </button>
                    )}
                  </div>
                </div>

                {/* Replies */}
                {replies.length > 0 && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-neutral-800 pl-3">
                    {replies.map((reply) => (
                      <div
                        key={reply.id}
                        ref={(el) => { commentRefs.current[reply.id] = el; }}
                        className="rounded-lg p-2 bg-neutral-900/50"
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-semibold text-neutral-400">
                            {reply.author_name}
                          </span>
                          <span className="text-[11px] text-neutral-600">
                            {timeAgo(reply.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          {reply.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply form */}
                {replyingTo === comment.id && (
                  <div className="ml-4 mt-1 border-l-2 border-indigo-500/30 pl-3">
                    <textarea
                      autoFocus
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                          e.preventDefault();
                          if (replyText.trim() && !posting) postReply(comment.id);
                        }
                      }}
                      placeholder={`Reply to ${comment.author_name}... (${submitKey} to send)`}
                      rows={2}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-300 placeholder-neutral-600 resize-none mb-1 touch-manipulation"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => postReply(comment.id)}
                        disabled={posting || !replyText.trim()}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-600 text-white text-xs rounded-lg transition-colors touch-manipulation"
                      >
                        {posting ? "..." : "Reply"}
                      </button>
                      <button
                        onClick={() => { setReplyingTo(null); setReplyText(""); }}
                        className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
