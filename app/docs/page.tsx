import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Documentation — mdshare",
  description: "REST API documentation for mdshare. Upload, read, update markdown documents via curl or any HTTP client.",
  openGraph: {
    title: "API Documentation — mdshare",
    description: "REST API documentation for mdshare.",
    siteName: "mdshare",
    type: "website",
  },
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-neutral-950">
      <header className="border-b border-neutral-800 px-4 sm:px-8 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <a href="/" className="text-lg font-bold text-white">
            md<span className="text-indigo-400">share</span>
          </a>
          <span className="text-xs text-neutral-500 bg-neutral-900 px-2 py-1 rounded">
            API Docs
          </span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="prose-docs">
          <h1>mdshare API</h1>
          <p className="lead">
            <strong>Base URL:</strong> <code>https://mdshare.live</code>
          </p>
          <p>Zero-login markdown sharing. Upload, get links, collaborate. No accounts needed.</p>
          <p className="text-sm text-neutral-500">
            Raw markdown: <code>curl https://mdshare.live/docs/raw</code>
          </p>

          <hr />

          <h2>Quick Start</h2>

          <h3>Upload a document</h3>
          <pre><code>{`curl -X POST https://mdshare.live/api/documents \\
  -H "Content-Type: text/markdown" \\
  --data-binary @your-file.md`}</code></pre>
          <p>Response:</p>
          <pre><code>{`{
  "document_id": "abc123",
  "admin_key": "adm_xK9mQ4r8...",
  "admin_url": "https://mdshare.live/d/abc123?key=adm_xK9mQ4r8..."
}`}</code></pre>
          <p>Save the <code>admin_key</code> — it&apos;s your master key. If lost, admin access is lost.</p>

          <h3>Read a document</h3>
          <pre><code>{`# JSON (default)
curl "https://mdshare.live/api/d/{id}?key={any_valid_key}"

# Raw markdown
curl -H "Accept: text/markdown" "https://mdshare.live/api/d/{id}?key={key}"`}</code></pre>

          <h3>Update a document</h3>
          <pre><code>{`curl -X PUT "https://mdshare.live/api/d/{id}?key={edit_or_admin_key}" \\
  -H "Content-Type: text/markdown" \\
  --data-binary @updated.md`}</code></pre>

          <h3>Generate a share link (admin only)</h3>
          <pre><code>{`curl -X POST "https://mdshare.live/api/d/{id}/links?key={admin_key}" \\
  -H "Content-Type: application/json" \\
  -d '{"permission": "edit", "label": "for-team"}'`}</code></pre>

          <hr />

          <h2>Key Types</h2>
          <table>
            <thead><tr><th>Prefix</th><th>Permission</th><th>Can do</th></tr></thead>
            <tbody>
              <tr><td><code>adm_</code></td><td>Admin</td><td>Read, write, delete, manage links, manage comments</td></tr>
              <tr><td><code>edt_</code></td><td>Edit</td><td>Read, write, comment</td></tr>
              <tr><td><code>cmt_</code></td><td>Comment</td><td>Read, add comments</td></tr>
              <tr><td><code>viw_</code></td><td>View</td><td>Read only</td></tr>
            </tbody>
          </table>

          <hr />

          <h2>Endpoints</h2>

          <h3>Documents</h3>
          <table>
            <thead><tr><th>Method</th><th>Endpoint</th><th>Auth</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>POST</code></td><td><code>/api/documents</code></td><td>None</td><td>Create document</td></tr>
              <tr><td><code>GET</code></td><td><code>/api/d/:id?key=KEY</code></td><td>Any</td><td>Read document</td></tr>
              <tr><td><code>PUT</code></td><td><code>/api/d/:id?key=KEY</code></td><td>Edit/Admin</td><td>Update document</td></tr>
              <tr><td><code>DELETE</code></td><td><code>/api/d/:id?key=KEY</code></td><td>Admin</td><td>Delete document</td></tr>
            </tbody>
          </table>

          <h3>Links (admin only)</h3>
          <table>
            <thead><tr><th>Method</th><th>Endpoint</th><th>Auth</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>POST</code></td><td><code>/api/d/:id/links?key=KEY</code></td><td>Admin</td><td>Create share link</td></tr>
              <tr><td><code>GET</code></td><td><code>/api/d/:id/links?key=KEY</code></td><td>Admin</td><td>List all links</td></tr>
              <tr><td><code>PATCH</code></td><td><code>/api/links/:token?key=KEY</code></td><td>Admin</td><td>Modify link</td></tr>
              <tr><td><code>DELETE</code></td><td><code>/api/links/:token?key=KEY</code></td><td>Admin</td><td>Revoke link</td></tr>
            </tbody>
          </table>

          <h3>Comments</h3>
          <table>
            <thead><tr><th>Method</th><th>Endpoint</th><th>Auth</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>POST</code></td><td><code>/api/d/:id/comments?key=KEY</code></td><td>Comment/Edit/Admin</td><td>Add comment (body: content, author_name, anchor_text, parent_id). Replies nest one level.</td></tr>
              <tr><td><code>GET</code></td><td><code>/api/d/:id/comments?key=KEY</code></td><td>Any</td><td>List comments</td></tr>
              <tr><td><code>PATCH</code></td><td><code>/api/comments/:id?key=KEY</code></td><td>Edit/Admin</td><td>Resolve comment</td></tr>
            </tbody>
          </table>

          <h3>Versions (edit history)</h3>
          <table>
            <thead><tr><th>Method</th><th>Endpoint</th><th>Auth</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>GET</code></td><td><code>/api/d/:id/versions?key=KEY</code></td><td>Any</td><td>List edit history (who, when, via what)</td></tr>
            </tbody>
          </table>
          <p>The <code>GET /api/d/:id</code> response also includes <code>last_edited_by</code>, <code>last_edited_via</code>, and <code>last_edited_at</code>.</p>

          <h3>Presence</h3>
          <table>
            <thead><tr><th>Method</th><th>Endpoint</th><th>Auth</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>POST</code></td><td><code>/api/d/:id/presence?key=KEY</code></td><td>Any</td><td>Heartbeat (body: session_id, name)</td></tr>
              <tr><td><code>GET</code></td><td><code>/api/d/:id/presence?key=KEY</code></td><td>Any</td><td>Get who&apos;s online</td></tr>
            </tbody>
          </table>

          <hr />

          <h2>Rate Limits</h2>
          <table>
            <thead><tr><th>Endpoint</th><th>Limit</th></tr></thead>
            <tbody>
              <tr><td><code>POST /api/documents</code></td><td>10 per minute per IP</td></tr>
              <tr><td><code>PUT /api/d/:id</code></td><td>30 per minute per IP</td></tr>
              <tr><td><code>POST /api/d/:id/comments</code></td><td>20 per minute per IP</td></tr>
            </tbody>
          </table>

          <hr />

          <h2>Errors</h2>
          <table>
            <thead><tr><th>Code</th><th>Meaning</th></tr></thead>
            <tbody>
              <tr><td><code>400</code></td><td>Invalid content (binary, empty, too large)</td></tr>
              <tr><td><code>403</code></td><td>Insufficient permission</td></tr>
              <tr><td><code>404</code></td><td>Document not found or invalid key</td></tr>
              <tr><td><code>429</code></td><td>Rate limited (check Retry-After header)</td></tr>
            </tbody>
          </table>

          <hr />

          <h2>Notes</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-400">
            <li>Content is sanitized server-side (no raw HTML, XSS protection)</li>
            <li>Binary files are rejected (magic byte detection)</li>
            <li>Links only allow <code>http:</code>, <code>https:</code>, <code>mailto:</code> protocols</li>
            <li>All content should be treated as user-generated</li>
            <li>API responses include <code>X-Content-Source: user-generated</code> header</li>
          </ul>

          <hr />

          <h2 id="use-with-ai">Use with AI</h2>

          <h3>MCP Setup (coming soon)</h3>
          <p>mdshare works as an MCP server with Claude, ChatGPT/Codex, and Gemini CLI.</p>
          <pre><code>npx mdshare-mcp</code></pre>

          <h4>Claude Desktop / Claude Code</h4>
          <p>Add to <code>~/.claude/claude_desktop_config.json</code>:</p>
          <pre><code>{`{
  "mcpServers": {
    "mdshare": {
      "command": "npx",
      "args": ["mdshare-mcp"]
    }
  }
}`}</code></pre>

          <h4>OpenAI Codex CLI</h4>
          <p>Add to <code>~/.codex/config.json</code>:</p>
          <pre><code>{`{
  "mcpServers": {
    "mdshare": {
      "command": "npx",
      "args": ["mdshare-mcp"]
    }
  }
}`}</code></pre>

          <h4>Gemini CLI</h4>
          <p>Add to <code>~/.gemini/settings.json</code>:</p>
          <pre><code>{`{
  "mcpServers": {
    "mdshare": {
      "command": "npx",
      "args": ["mdshare-mcp"]
    }
  }
}`}</code></pre>

          <h3>What to tell your AI</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-300">
            <li>&ldquo;Upload my-notes.md to mdshare and give me an edit link&rdquo;</li>
            <li>&ldquo;Read this mdshare document and summarize the comments&rdquo;</li>
            <li>&ldquo;Incorporate the feedback and resolve the comments&rdquo;</li>
            <li>&ldquo;Share this markdown with view-only access&rdquo;</li>
            <li>&ldquo;Who edited this document last?&rdquo;</li>
            <li>&ldquo;Post a comment on the budget section&rdquo;</li>
          </ul>

          <h3>Without MCP (works with any AI)</h3>
          <p>No setup needed. Just tell your AI chatbot:</p>
          <pre><code>{`Read https://mdshare.live/docs/raw to learn the mdshare API,
then upload this markdown and give me a share link.`}</code></pre>
          <p>Works with Claude, ChatGPT, Gemini, Copilot, or any AI that can make HTTP calls.</p>
        </div>
      </main>
    </div>
  );
}
