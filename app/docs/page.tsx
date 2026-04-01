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
              <tr><td><code>POST</code></td><td><code>/api/d/:id/comments?key=KEY</code></td><td>Comment/Edit/Admin</td><td>Add comment</td></tr>
              <tr><td><code>GET</code></td><td><code>/api/d/:id/comments?key=KEY</code></td><td>Any</td><td>List comments</td></tr>
              <tr><td><code>PATCH</code></td><td><code>/api/comments/:id?key=KEY</code></td><td>Edit/Admin</td><td>Resolve comment</td></tr>
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
        </div>
      </main>
    </div>
  );
}
