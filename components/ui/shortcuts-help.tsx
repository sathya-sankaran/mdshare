
import { useState } from "react";

const isMac = typeof navigator !== "undefined" && navigator.platform?.includes("Mac");
const mod = isMac ? "Cmd" : "Ctrl";

const SHORTCUTS = [
  { keys: `${mod}+B`, action: "Bold" },
  { keys: `${mod}+I`, action: "Italic" },
  { keys: `${mod}+Shift+X`, action: "Strikethrough" },
  { keys: `${mod}+E`, action: "Code" },
  { keys: `${mod}+Shift+8`, action: "Bullet list" },
  { keys: `${mod}+Shift+7`, action: "Ordered list" },
  { keys: `${mod}+Shift+B`, action: "Blockquote" },
  { keys: `${mod}+K`, action: "Insert/edit link" },
  { keys: `${mod}+Z`, action: "Undo" },
  { keys: `${mod}+Shift+Z`, action: "Redo" },
  { keys: `${mod}+Shift+J`, action: "Toggle light/dark editor" },
  { keys: `${mod}+\\`, action: "Toggle comments" },
  { keys: `${mod}+D`, action: "Download .md" },
];

const ADMIN_SHORTCUTS = [
  { keys: `${mod}+L`, action: "Toggle links panel" },
];

export function ShortcutsHelp({ isAdmin = false }: { isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);

  const allShortcuts = isAdmin
    ? [...SHORTCUTS, ...ADMIN_SHORTCUTS]
    : SHORTCUTS;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="min-w-[44px] h-11 sm:min-w-[32px] sm:h-8 flex items-center justify-center rounded text-sm font-semibold text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors touch-manipulation"
        title="Keyboard shortcuts"
      >
        <span className="font-mono">?</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="fixed inset-0 bg-black/50" />
          <div
            className="relative bg-neutral-950 border border-neutral-800 rounded-xl max-w-sm w-full p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-neutral-200">
                Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors touch-manipulation"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-1.5">
              {allShortcuts.map((s) => (
                <div key={s.keys} className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">{s.action}</span>
                  <kbd className="text-[11px] font-mono bg-neutral-900 border border-neutral-800 rounded px-1.5 py-0.5 text-neutral-500">
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
