"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";

export interface Comment {
  id: string;
  author_name: string;
  content: string;
  anchor_text: string | null;
  resolved: number;
  created_at: string;
}

interface CommentSidebarProps {
  documentId: string;
  tokenKey: string;
  canComment: boolean;
  selectedText: string;
  onClearSelection: () => void;
  comments: Comment[];
  onCommentsChange: () => void;
  activeCommentId: string | null;
  onActiveCommentChange: (id: string | null) => void;
  displayName: string;
}

export function CommentSidebar({
  documentId,
  tokenKey,
  canComment,
  selectedText,
  onClearSelection,
  comments,
  onCommentsChange,
  activeCommentId,
  onActiveCommentChange,
  displayName,
}: CommentSidebarProps) {
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const commentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const canResolve = canComment; // edit and admin can resolve

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
            anchor_text: selectedText || null,
          }),
        }
      );
      if (res.ok) {
        setNewComment("");
        onClearSelection();
        onCommentsChange();
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

      {/* Comment list */}
      <div className="space-y-3 flex-1 overflow-y-auto mb-4">
        {displayComments.map((comment) => {
          const isActive = activeCommentId === comment.id;
          const isResolved = !!comment.resolved;
          return (
            <div
              key={comment.id}
              ref={(el) => { commentRefs.current[comment.id] = el; }}
              onClick={() => {
                if (comment.anchor_text) {
                  onActiveCommentChange(
                    isActive ? null : comment.id
                  );
                }
              }}
              className={`rounded-lg p-3 transition-colors ${
                comment.anchor_text ? "cursor-pointer" : ""
              } ${
                isResolved ? "opacity-60" : ""
              } ${
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
                  isActive
                    ? "text-indigo-300 border-indigo-400"
                    : "text-indigo-400 border-indigo-500"
                }`}>
                  &ldquo;{comment.anchor_text.slice(0, 80)}
                  {comment.anchor_text.length > 80 ? "..." : ""}&rdquo;
                </p>
              )}
              <p className="text-xs text-neutral-400 leading-relaxed">
                {comment.content}
              </p>
              {canResolve && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleResolve(comment.id, isResolved);
                  }}
                  className="mt-2 text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  {isResolved ? "Unresolve" : "Resolve"}
                </button>
              )}
            </div>
          );
        })}
        {displayComments.length === 0 && (
          <p className="text-xs text-neutral-600 text-center py-4">
            {comments.length > 0 ? "All comments resolved" : "Select text in the document to leave a comment"}
          </p>
        )}
      </div>

      {/* Add comment form */}
      {canComment && (
        <div className="border-t border-neutral-800 pt-3">
          {selectedText && (
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
          )}
          <p className="text-[11px] text-neutral-600 mb-2">
            Commenting as <span className="text-neutral-400">{displayName}</span>
          </p>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={
              selectedText
                ? "Comment on selected text..."
                : "Add a comment..."
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
    </div>
  );
}
