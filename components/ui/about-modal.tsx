
import { useState } from "react";

export function AboutButton({ variant = "icon" }: { variant?: "icon" | "text" }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "text" ? (
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-4 decoration-indigo-400/30 hover:decoration-indigo-300/50 transition-colors touch-manipulation"
        >
          What is mdshare?
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="p-2.5 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors touch-manipulation"
          title="About mdshare"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="fixed inset-0 bg-black/60" />
          <div
            className="relative bg-neutral-950 border border-neutral-800 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin p-6 sm:p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors touch-manipulation"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-bold text-white mb-1">
              md<span className="text-indigo-400">share</span>
            </h2>
            <p className="text-sm text-neutral-500 mb-4">
              Share markdown instantly. No login required.
            </p>

            <div className="space-y-3.5">
              <Feature
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.313a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.04" />
                  </svg>
                }
                title="Link-based sharing"
                desc="Upload markdown, get shareable links with different permissions. No accounts needed."
              />
              <Feature
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                }
                title="WYSIWYG editor"
                desc="Formatting toolbar, code blocks, tables, and keyboard shortcuts. Viewers get clean rendered markdown."
              />
              <Feature
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                }
                title="Inline comments & replies"
                desc="Anchor comments to specific text, reply, and resolve. Click a comment to jump to the highlight."
              />
              <Feature
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                }
                title="Four permission levels"
                desc="Admin, Edit, Comment, View — each with its own link. Revoke any link instantly."
              />
              <Feature
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                  </svg>
                }
                title="API & MCP for AI"
                desc="REST API + MCP server. VS Code and Obsidian plugins. Works with Claude, ChatGPT, Gemini, Cursor, and Windsurf."
              />
              <Feature
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                }
                title="Real-time & mobile"
                desc="See who's online, changes sync in real-time. Mobile-friendly with native share."
              />
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-800">
              <p className="text-[11px] text-neutral-600 leading-relaxed mb-4">
                <span className="text-neutral-400">Fine print:</span> You own your content — we just host it. Don&apos;t upload anything illegal or sensitive. Links are keys — anyone with a link can access the document. Documents expire in 90 days. No guarantees on uptime, availability, or data recovery. Service is free, provided as-is.
              </p>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <a href="/docs" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">API &amp; AI Docs</a>
                <a href="https://github.com/urbanmorph/mdshare" target="_blank" rel="noopener noreferrer" className="text-sm text-amber-400 hover:text-amber-300 transition-colors">&#9733; Star on GitHub</a>
                <span className="text-[11px]"><span className="text-neutral-300">Built by Sathya Sankaran</span> &middot; <a href="mailto:contact@urbanmorph.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">contact@urbanmorph.com</a></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-400">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-neutral-200">{title}</h3>
        <p className="text-xs text-neutral-500 leading-relaxed mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
