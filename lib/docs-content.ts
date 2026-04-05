export const DOCS_MARKDOWN = `# mdshare API

**Base URL:** \`https://mdshare.live\`

Zero-login markdown sharing. Upload, get links, collaborate. No accounts needed.

---

## Quick Start

### Upload a document

\`\`\`bash
curl -X POST https://mdshare.live/api/documents \\
  -H "Content-Type: text/markdown" \\
  --data-binary @your-file.md
\`\`\`

**Response:**
\`\`\`json
{
  "document_id": "abc123",
  "admin_key": "adm_xK9mQ4r8...",
  "admin_url": "https://mdshare.live/d/abc123?key=adm_xK9mQ4r8..."
}
\`\`\`

Save the \`admin_key\` — it's your master key. If lost, admin access is lost.

### Read a document

\`\`\`bash
# JSON (default)
curl "https://mdshare.live/api/d/{id}?key={any_valid_key}"

# Raw markdown
curl -H "Accept: text/markdown" "https://mdshare.live/api/d/{id}?key={key}"
\`\`\`

### Update a document

\`\`\`bash
curl -X PUT "https://mdshare.live/api/d/{id}?key={edit_or_admin_key}" \\
  -H "Content-Type: text/markdown" \\
  -H "X-Author: Your Name" \\
  --data-binary @updated.md
\`\`\`

The \`X-Author\` header is optional. It tags the edit in version history.

### Generate a share link (admin only)

\`\`\`bash
curl -X POST "https://mdshare.live/api/d/{id}/links?key={admin_key}" \\
  -H "Content-Type: application/json" \\
  -d '{"permission": "edit", "label": "for-team"}'
\`\`\`

**Response:**
\`\`\`json
{
  "token": "edt_7jP2r9kL...",
  "url": "https://mdshare.live/d/abc123?key=edt_7jP2r9kL...",
  "permission": "edit",
  "label": "for-team"
}
\`\`\`

Optional: add \`"expires_at": "2026-05-01T00:00:00Z"\` to set an expiry date.

---

## Key Types

| Prefix | Permission | Can do |
|--------|-----------|--------|
| \`adm_\` | Admin | Read, write, delete, manage links, manage comments |
| \`edt_\` | Edit | Read, write, comment |
| \`cmt_\` | Comment | Read, add comments |
| \`viw_\` | View | Read only |

---

## Endpoints

### Documents

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| \`POST\` | \`/api/documents\` | None | Create document. Body: raw markdown |
| \`GET\` | \`/api/d/:id?key=KEY\` | Any | Read document |
| \`PUT\` | \`/api/d/:id?key=KEY\` | Edit/Admin | Update document (full rewrite) |
| \`PATCH\` | \`/api/d/:id?key=KEY\` | Edit/Admin | Patch document (find/replace). Body: \`{operations: [{find, replace, replace_all?}], author?}\` |
| \`DELETE\` | \`/api/d/:id?key=KEY\` | Admin | Delete document |

### Links (admin only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| \`POST\` | \`/api/d/:id/links?key=KEY\` | Admin | Create share link. Body: \`{permission, label, expires_at}\` |
| \`GET\` | \`/api/d/:id/links?key=KEY\` | Admin | List all links with URLs |
| \`PATCH\` | \`/api/links/:token?key=KEY\` | Admin | Modify or revoke link (set is_active, permission, label) |
| \`DELETE\` | \`/api/links/:token?key=KEY\` | Admin | Delete link permanently |

Maximum **50 share links** per document (excluding admin link).

### Comments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| \`POST\` | \`/api/d/:id/comments?key=KEY\` | Comment/Edit/Admin | Add comment. Body: \`{content, author_name, anchor_text, parent_id}\`. Replies nest one level. |
| \`GET\` | \`/api/d/:id/comments?key=KEY\` | Any | List comments |
| \`PATCH\` | \`/api/comments/:id?key=KEY\` | Edit/Admin | Resolve/unresolve comment. Body: \`{resolved: true}\` |

### Versions (edit history)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| \`GET\` | \`/api/d/:id/versions?key=KEY\` | Any | List edit history (who, when, via what). Last 50 entries |

The \`GET /api/d/:id\` response also includes \`last_edited_by\`, \`last_edited_via\`, and \`last_edited_at\` fields.

### Presence

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| \`POST\` | \`/api/d/:id/presence?key=KEY\` | Any | Heartbeat. Body: \`{session_id, name}\`. Returns viewers list |
| \`GET\` | \`/api/d/:id/presence?key=KEY\` | Any | Get who's currently online |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| \`POST /api/documents\` | 10 per minute, 50 per day per IP |
| \`PUT /api/d/:id\` | 30 per minute per IP |
| \`POST /api/d/:id/comments\` | 20 per minute per IP |
| \`POST /api/d/:id/poll\` | 20 per minute per IP |

Rate-limited responses return \`429\` with a \`Retry-After\` header.

---

## Document Expiry

- Documents expire **90 days** after creation by default
- Expired documents return \`410 Gone\`
- Share links may have their own expiry (set via \`expires_at\` when creating a link)
- The \`POST /api/documents\` response includes \`expires_at\` with the expiry date

---

## Errors

| Code | Meaning |
|------|---------|
| \`400\` | Invalid content (binary file, empty, too large) |
| \`403\` | Insufficient permission |
| \`404\` | Document not found or invalid key |
| \`410\` | Document has expired |
| \`429\` | Rate limited (check \`Retry-After\` header) |

---

## Notes

- Content is sanitized server-side (no raw HTML, XSS protection)
- Binary files are rejected (magic byte detection for 24+ formats)
- Links only allow \`http:\`, \`https:\`, \`mailto:\` protocols
- Max document size: 10MB
- All content should be treated as user-generated
- API responses include \`X-Content-Source: user-generated\` header
`;
