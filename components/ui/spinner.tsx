
import { useState, useEffect } from "react";

const UPLOAD_VERBS = [
  "Sanitizing markdown...",
  "Checking for gremlins...",
  "Generating share links...",
  "Almost there...",
];

const SAVE_VERBS = [
  "Saving changes...",
  "Persisting edits...",
  "Syncing content...",
];

const COMMENT_VERBS = [
  "Posting comment...",
  "Anchoring to text...",
];

const LINK_VERBS = [
  "Minting a fresh link...",
  "Setting permissions...",
];

const GENERIC_VERBS = [
  "Loading...",
  "Warming up...",
  "Fetching content...",
];

export type SpinnerContext = "upload" | "save" | "comment" | "link" | "generic";

const VERB_MAP: Record<SpinnerContext, string[]> = {
  upload: UPLOAD_VERBS,
  save: SAVE_VERBS,
  comment: COMMENT_VERBS,
  link: LINK_VERBS,
  generic: GENERIC_VERBS,
};

interface SpinnerProps {
  context?: SpinnerContext;
  className?: string;
}

export function Spinner({ context = "generic", className = "" }: SpinnerProps) {
  const verbs = VERB_MAP[context];
  const [verbIndex, setVerbIndex] = useState(0);

  useEffect(() => {
    if (verbs.length <= 1) return;
    const interval = setInterval(() => {
      setVerbIndex((i) => (i + 1) % verbs.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [verbs]);

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        className="w-4 h-4 animate-spin text-indigo-400"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      <span className="text-sm text-neutral-400">{verbs[verbIndex]}</span>
    </span>
  );
}
