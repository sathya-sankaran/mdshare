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
  --data-binary @updated.md
\`\`\`

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
| \`PUT\` | \`/api/d/:id?key=KEY\` | Edit/Admin | Update document |
| \`DELETE\` | \`/api/d/:id?key=KEY\` | Admin | Delete document |

### Links (admin only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| \`POST\` | \`/api/d/:id/links?key=KEY\` | Admin | Create share link |
| \`GET\` | \`/api/d/:id/links?key=KEY\` | Admin | List all links |
| \`PATCH\` | \`/api/links/:token?key=KEY\` | Admin | Modify link |
| \`DELETE\` | \`/api/links/:token?key=KEY\` | Admin | Revoke link |

### Comments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| \`POST\` | \`/api/d/:id/comments?key=KEY\` | Comment/Edit/Admin | Add comment |
| \`GET\` | \`/api/d/:id/comments?key=KEY\` | Any | List comments |
| \`PATCH\` | \`/api/comments/:id?key=KEY\` | Edit/Admin | Resolve comment |

---

## Errors

| Code | Meaning |
|------|---------|
| \`400\` | Invalid content (binary file, empty, too large) |
| \`403\` | Insufficient permission |
| \`404\` | Document not found or invalid key |

---

## Notes

- Content is sanitized server-side (no raw HTML, XSS protection)
- Binary files are rejected (magic byte detection)
- Links only allow \`http:\`, \`https:\`, \`mailto:\` protocols
- All content should be treated as user-generated
- API responses include \`X-Content-Source: user-generated\` header
`;
