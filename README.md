# mdshare

Share markdown instantly. Free. No login required.

**Live:** [mdshare.live](https://mdshare.live) | **API Docs:** [mdshare.live/docs](https://mdshare.live/docs)

---

## What is mdshare?

Upload a markdown file, get shareable links with different permissions, collaborate in a WYSIWYG editor. Zero accounts, zero setup. Works from the browser, terminal, or any AI chatbot.

## Features

- **Zero login** -- everything is link-based, no accounts needed
- **Four permission levels** -- Admin, Edit, Comment, View -- each with its own shareable link
- **WYSIWYG editor** -- rich text editing with formatting toolbar, tables, code blocks
- **Inline comments** -- select text, leave comments anchored to specific sections with highlights
- **Live presence** -- see who's currently viewing the document
- **Real-time updates** -- changes appear across all connected browsers, tab title flashes on updates
- **Display names** -- set once, used for comments, edits, and presence
- **API & AI-friendly** -- full REST API, works with curl and AI chatbots
- **Content sanitization** -- XSS protection, binary file rejection, protocol whitelist
- **Rate limiting** -- abuse prevention on all write endpoints
- **Link expiry** -- optional expiration dates on share links
- **Recent documents** -- quickly access previously visited docs from the landing page
- **Keyboard shortcuts** -- Cmd+B/I/E for formatting, Cmd+\\ for comments, Cmd+D to download
- **Mobile responsive** -- touch-friendly, collapsible panels, works on phones and tablets
- **Rich link previews** -- Open Graph tags for Slack, WhatsApp, and social media

## Quick Start

### Upload via browser

Go to [mdshare.live](https://mdshare.live), paste or drag-drop a `.md` file, and get your share links.

### Upload via curl

```bash
curl -X POST https://mdshare.live/api/documents \
  -H "Content-Type: text/markdown" \
  --data-binary @your-file.md
```

Response:
```json
{
  "document_id": "abc123",
  "admin_key": "adm_xK9mQ4r8...",
  "admin_url": "https://mdshare.live/d/abc123?key=adm_xK9mQ4r8..."
}
```

### Read a document

```bash
curl -H "Accept: text/markdown" \
  "https://mdshare.live/api/d/{id}?key={key}"
```

### Update a document

```bash
curl -X PUT "https://mdshare.live/api/d/{id}?key={edit_or_admin_key}" \
  -H "Content-Type: text/markdown" \
  --data-binary @updated.md
```

### Generate a share link

```bash
curl -X POST "https://mdshare.live/api/d/{id}/links?key={admin_key}" \
  -H "Content-Type: application/json" \
  -d '{"permission": "edit", "label": "for-team"}'
```

### View edit history

```bash
curl "https://mdshare.live/api/d/{id}/versions?key={key}"
```

Returns who edited, when, and via what (browser/api). The main GET endpoint also includes `last_edited_by` for quick checks.

## Permissions

| Key prefix | Level | Can do |
|-----------|-------|--------|
| `adm_` | Admin | Full control + manage links + delete |
| `edt_` | Edit | Read + write + comment |
| `cmt_` | Comment | Read + add comments |
| `viw_` | View | Read only |

Links are freely forwardable. The admin key is the master key -- save it.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 16 (App Router) |
| Hosting | Cloudflare Workers (via OpenNext) |
| Database | Cloudflare D1 (SQLite) |
| Real-time | Cloudflare Durable Objects (WebSocket) |
| Editor | Tiptap + tiptap-markdown |
| Styling | Tailwind CSS v4 |
| CI/CD | GitHub Actions |

## Local Development

```bash
git clone https://github.com/urbanmorph/mdshare.git
cd mdshare
npm install

# Create a .dev.vars file with your Cloudflare API token
echo "CLOUDFLARE_API_TOKEN=your_token" > .dev.vars

# Apply local D1 migrations
npx wrangler d1 migrations apply mdshare-db --local

# Start dev server
npm run dev -- -p 3737
```

## Deployment

Pushes to `main` auto-deploy via GitHub Actions to Cloudflare Workers.

Manual deploy:
```bash
CLOUDFLARE_API_TOKEN=your_token npx opennextjs-cloudflare build && npx opennextjs-cloudflare deploy
```

## API Documentation

Full API docs at [mdshare.live/docs](https://mdshare.live/docs).

Raw markdown version:
```bash
curl https://mdshare.live/docs/raw
```

## License

MIT
