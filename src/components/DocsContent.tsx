export default function DocsContent() {
  return (
    <div className="min-h-screen bg-neutral-950">
      <header className="border-b border-neutral-800 px-4 sm:px-8 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <a href="/" className="text-lg font-bold text-white">
            md<span className="text-indigo-400">share</span>
          </a>
          <span className="text-xs text-neutral-400 bg-neutral-900 px-2 py-1 rounded">
            Docs
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

          <h3>Patch a document (find/replace)</h3>
          <pre><code>{`curl -X PATCH "https://mdshare.live/api/d/{id}?key={edit_or_admin_key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "operations": [
      { "find": "old text", "replace": "new text" }
    ],
    "author": "Your Name"
  }'`}</code></pre>
          <p>Response:</p>
          <pre><code>{`{
  "applied": 1,
  "operations": [{ "index": 0, "status": "ok" }],
  "content_hash": "abc123..."
}`}</code></pre>
          <p>Each <code>find</code> must be unique in the document. Set <code>replace_all: true</code> to replace all occurrences. Statuses: <code>ok</code>, <code>not_found</code>, <code>ambiguous</code>, <code>invalid</code>.</p>

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
              <tr><td><code>PUT</code></td><td><code>/api/d/:id?key=KEY</code></td><td>Edit/Admin</td><td>Update document (full rewrite)</td></tr>
              <tr><td><code>PATCH</code></td><td><code>/api/d/:id?key=KEY</code></td><td>Edit/Admin</td><td>Patch document (find/replace)</td></tr>
              <tr><td><code>DELETE</code></td><td><code>/api/d/:id?key=KEY</code></td><td>Admin</td><td>Delete document</td></tr>
            </tbody>
          </table>

          <h3>Links (admin only)</h3>
          <table>
            <thead><tr><th>Method</th><th>Endpoint</th><th>Auth</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>POST</code></td><td><code>/api/d/:id/links?key=KEY</code></td><td>Admin</td><td>Create share link</td></tr>
              <tr><td><code>GET</code></td><td><code>/api/d/:id/links?key=KEY</code></td><td>Admin</td><td>List all links</td></tr>
              <tr><td><code>PATCH</code></td><td><code>/api/links/:token?key=KEY</code></td><td>Admin</td><td>Modify or revoke link (set is_active, permission, label)</td></tr>
              <tr><td><code>DELETE</code></td><td><code>/api/links/:token?key=KEY</code></td><td>Admin</td><td>Delete link permanently</td></tr>
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
            <li>Write endpoints (POST/PUT/PATCH) return <code>Server-Timing</code> headers and a <code>processing_ms</code> field for latency tracking</li>
          </ul>

          <hr />

          <h2 id="use-with-ai">Use with AI</h2>

          <p className="text-sm text-indigo-300 bg-indigo-950/30 border border-indigo-900/60 rounded px-3 py-2 mb-3">
            See <a href="/share-markdown-with-ai" className="underline underline-offset-2 hover:text-indigo-200">/share-markdown-with-ai</a> for a dedicated guide with per-client setup, tool reference, and FAQs.
          </p>

          <h3>MCP Setup</h3>
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

          <h4>Cursor</h4>
          <p>Add to <code>~/.cursor/mcp.json</code>:</p>
          <pre><code>{`{
  "mcpServers": {
    "mdshare": {
      "command": "npx",
      "args": ["mdshare-mcp"]
    }
  }
}`}</code></pre>

          <h4>Windsurf</h4>
          <p>Add to <code>~/.codeium/windsurf/mcp_config.json</code>:</p>
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
            <li>&ldquo;List all links for this document&rdquo;</li>
            <li>&ldquo;Revoke the edit link I shared with the team&rdquo;</li>
            <li>&ldquo;Save this mdshare document to /tmp/notes.md&rdquo;</li>
          </ul>
          <p className="text-sm text-neutral-400">
            <strong>Tip:</strong> When uploading a file already on disk, the MCP server reads it directly via <code>file_path</code> instead of echoing the bytes through the conversation. This is dramatically faster for AI workflows. Same for downloads via <code>output_path</code>.
          </p>

          <h3>Without MCP (works with any AI)</h3>
          <p>No setup needed. Just tell your AI chatbot:</p>
          <pre><code>{`Read https://mdshare.live/docs/raw to learn the mdshare API,
then upload this markdown and give me a share link.`}</code></pre>
          <p>Works with Claude, ChatGPT, Gemini, Copilot, or any AI that can make HTTP calls.</p>

          <hr />

          <h2 id="vscode">VS Code Extension</h2>
          <p>Share markdown files directly from VS Code. Right-click any <code>.md</code> file or select text and share it instantly. Also works in <strong>Cursor</strong> and <strong>Windsurf</strong> since they support the VS Code extension format.</p>

          <h3>Install</h3>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-neutral-300">
            <li>Open the <strong>Extensions</strong> panel in VS Code (<code>Cmd+Shift+X</code> or <code>Ctrl+Shift+X</code>)</li>
            <li>Search for <strong>mdshare</strong> and click <strong>Install</strong>, or install directly from the <a href="https://marketplace.visualstudio.com/items?itemName=urbanmorph.mdshare-live" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer">Marketplace page</a></li>
          </ol>
          <p className="text-sm text-neutral-500">
            Or install manually: download <a href="/mdshare-vscode.vsix" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">mdshare-vscode.vsix</a>, then <code>Cmd+Shift+P</code> &rarr; <strong>Install from VSIX</strong>.
          </p>

          <h3>Usage</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-300">
            <li><strong>Share a file:</strong> Right-click a <code>.md</code> file in the Explorer &rarr; &ldquo;Share on mdshare&rdquo;</li>
            <li><strong>Share a selection:</strong> Select text in any editor &rarr; right-click &rarr; &ldquo;Share Selection on mdshare&rdquo;</li>
          </ul>
          <p className="text-sm text-neutral-400">The admin URL is automatically copied to your clipboard.</p>

          <hr />

          <h2 id="obsidian">Obsidian Plugin</h2>
          <p>Share markdown files directly from Obsidian. Right-click any file, select text, or use the command palette.</p>

          <h3>Install via BRAT (recommended)</h3>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-neutral-300">
            <li>Install <a href="https://github.com/TfTHacker/obsidian42-brat" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer">BRAT</a> from Community Plugins</li>
            <li>In BRAT settings, click &ldquo;Add Beta Plugin&rdquo;</li>
            <li>Enter: <code>urbanmorph/obsidian-mdshare</code></li>
          </ol>

          <h3>Manual install</h3>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-neutral-300">
            <li>Download <a href="/obsidian-mdshare-main.js" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2" download="main.js">main.js</a> and <a href="/obsidian-mdshare-manifest.json" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2" download="manifest.json">manifest.json</a></li>
            <li>Create a folder: <code>&lt;your-vault&gt;/.obsidian/plugins/mdshare/</code></li>
            <li>Copy both files into that folder</li>
            <li>Enable in Settings &rarr; Community Plugins</li>
          </ol>

          <h3>Usage</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-300">
            <li><strong>Share a file:</strong> Right-click a file in the explorer &rarr; &ldquo;Share on mdshare&rdquo;</li>
            <li><strong>Share a selection:</strong> Select text &rarr; right-click &rarr; &ldquo;Share selection on mdshare&rdquo;</li>
            <li><strong>Command palette:</strong> <code>Cmd/Ctrl+P</code> &rarr; &ldquo;Share current file on mdshare&rdquo;</li>
          </ul>
          <p className="text-sm text-neutral-400">The admin URL is automatically copied to your clipboard.</p>

          <hr />

          <div className="flex flex-wrap gap-3 pt-4">
            <a href="/" className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors no-underline">
              Try mdshare &rarr;
            </a>
            <a href="/share-markdown-with-ai" className="inline-block px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-sm font-medium rounded-lg transition-colors no-underline">
              Use with Claude / MCP
            </a>
            <a href="/about" className="inline-block px-5 py-2.5 bg-transparent hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200 text-sm font-medium rounded-lg transition-colors no-underline">
              What is mdshare?
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
