import { useState, useRef, useCallback, useEffect } from "react";
import { AboutButton } from "../../components/ui/about-modal";
import { Spinner } from "../../components/ui/spinner";
import { getRecentDocs, type RecentDoc } from "../../lib/recent-docs";

interface CreateResult {
  document_id: string;
  admin_key: string;
  admin_url: string;
  expires_at?: string;
}

export default function Home() {
  const [content, setContent] = useState("");
  const [result, setResult] = useState<CreateResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [stats, setStats] = useState<{ documents_shared: number; comments_posted: number; collaborators: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecentDocs(getRecentDocs());
    fetch("/api/stats")
      .then(r => r.ok ? r.json() as Promise<{ documents_shared: number; comments_posted: number; collaborators: number }> : null)
      .then(data => { if (data) setStats(data); })
      .catch(() => {});
  }, []);

  const handleCreate = useCallback(async () => {
    const text = content.trim();
    if (!text) {
      setError("Paste or drop some markdown first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "text/markdown" },
        body: text,
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Failed to create document");
      }

      const data: CreateResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [content]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.mdx?$/i)) {
      setError("Only .md and .mdx files are supported");
      return;
    }

    const text = await file.text();
    setContent(text);
    setError("");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  if (result) {
    return (
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">
              md<span className="text-indigo-400">share</span>
            </h1>
            <p className="mt-2 text-sm text-green-400">
              Document created successfully
            </p>
          </div>

          <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-4 sm:p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
                Admin URL (save this — it&apos;s your master key)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={result.admin_url}
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono text-neutral-300 truncate"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.admin_url);
                    setCopiedField("url");
                    setTimeout(() => setCopiedField(null), 2000);
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors min-w-[72px] ${
                    copiedField === "url"
                      ? "bg-green-700 text-green-100"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white"
                  }`}
                >
                  {copiedField === "url" ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
                Admin Key
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={result.admin_key}
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono text-neutral-300 truncate"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.admin_key);
                    setCopiedField("key");
                    setTimeout(() => setCopiedField(null), 2000);
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors min-w-[72px] ${
                    copiedField === "key"
                      ? "bg-green-700 text-green-100"
                      : "bg-neutral-700 hover:bg-neutral-600 text-neutral-300"
                  }`}
                >
                  {copiedField === "key" ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {result.expires_at && (
              <p className="text-[11px] text-neutral-600 text-center">
                Document expires {new Date(result.expires_at).toLocaleDateString()}
              </p>
            )}

            <a
              href={result.admin_url}
              className="block w-full text-center py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
            >
              Open Document
            </a>
          </div>

          <button
            onClick={() => {
              setResult(null);
              setContent("");
            }}
            className="block mx-auto text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Create another
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            md<span className="text-indigo-400">share</span>
          </h1>
          <p className="mt-2 text-neutral-300">
            Share markdown instantly. Free. No login required.
          </p>
          {stats && (stats.documents_shared > 0 || stats.comments_posted > 0) && (
            <p className="mt-4 text-sm text-neutral-400 tracking-wide">
              <span className="text-neutral-300 font-semibold">{Intl.NumberFormat("en", { notation: "compact" }).format(stats.documents_shared)}</span> documents shared
              {stats.comments_posted > 0 && (
                <> <span className="text-neutral-700 mx-1">&middot;</span> <span className="text-neutral-300 font-semibold">{Intl.NumberFormat("en", { notation: "compact" }).format(stats.comments_posted)}</span> comments</>
              )}
              {stats.collaborators > 0 && (
                <> <span className="text-neutral-700 mx-1">&middot;</span> <span className="text-neutral-300 font-semibold">{Intl.NumberFormat("en", { notation: "compact" }).format(stats.collaborators)}</span> collaborators</>
              )}
            </p>
          )}
          <div className="mt-3 flex items-center justify-center gap-3">
            <AboutButton variant="text" />
            <span className="text-neutral-700">|</span>
            <a
              href="/docs"
              className="text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-4 decoration-indigo-400/30 hover:decoration-indigo-300/50 transition-colors"
            >
              API Docs
            </a>
            <span className="text-neutral-700">|</span>
            <a
              href="/docs#use-with-ai"
              className="text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-4 decoration-indigo-400/30 hover:decoration-indigo-300/50 transition-colors"
            >
              Use with AI
            </a>
            <span className="text-neutral-700">|</span>
            <a
              href="/docs#vscode"
              className="text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-4 decoration-indigo-400/30 hover:decoration-indigo-300/50 transition-colors"
            >
              VS Code
            </a>
            <span className="text-neutral-700">|</span>
            <a
              href="/docs#obsidian"
              className="text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-4 decoration-indigo-400/30 hover:decoration-indigo-300/50 transition-colors"
            >
              Obsidian
            </a>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-indigo-500 bg-indigo-500/5"
              : "border-neutral-700 hover:border-neutral-500"
          }`}
        >
          <div className="text-3xl mb-3 text-neutral-400">+</div>
          <p className="text-neutral-300">
            Drop a .md file here, or click to browse
          </p>
          <p className="text-xs text-neutral-600 mt-1">
            Max 10MB &middot; Markdown only
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.mdx"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

        <div className="text-center text-xs text-neutral-600">
          or paste your markdown below
        </div>

        {/* Paste area */}
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setError("");
          }}
          placeholder={"# My Document\n\nPaste your markdown here..."}
          rows={8}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-sm font-mono text-neutral-300 placeholder-neutral-600 resize-y focus:outline-none focus:border-indigo-500 transition-colors"
        />

        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}

        <button
          onClick={handleCreate}
          disabled={loading || !content.trim()}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-600 text-white font-medium rounded-xl transition-colors"
        >
          {loading ? <Spinner context="upload" /> : "Create & Get Share Links"}
        </button>

        {recentDocs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-neutral-900">
            <p className="text-xs text-neutral-600 mb-2">Recent documents</p>
            <div className="space-y-1">
              {recentDocs.slice(0, 5).map((doc) => (
                <a
                  key={`${doc.id}-${doc.key}`}
                  href={`/d/${doc.id}?key=${doc.key}`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-900/50 hover:bg-neutral-800/50 transition-colors group"
                >
                  <span className="text-sm text-neutral-300 group-hover:text-white truncate">
                    {doc.title}
                  </span>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded uppercase font-semibold shrink-0 ml-2 ${
                    doc.permission === "admin"
                      ? "bg-purple-900/50 text-purple-300"
                      : doc.permission === "edit"
                      ? "bg-blue-900/50 text-blue-300"
                      : doc.permission === "comment"
                      ? "bg-amber-900/50 text-amber-300"
                      : "bg-neutral-800 text-neutral-500"
                  }`}>
                    {doc.permission}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-[11px] text-neutral-700 mt-4">
          Your markdown, your links, your responsibility. No login. No encryption. No takebacks. Documents expire in 90 days.
        </p>
      </div>
    </main>
  );
}
