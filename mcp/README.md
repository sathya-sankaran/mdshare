# mdshare-mcp

MCP server for [mdshare](https://mdshare.live) — share markdown instantly, free.

Works with Claude, ChatGPT/Codex, Gemini CLI, Cursor, and Windsurf.

## Install

```
npx mdshare-mcp
```

Or add to your AI tool's config:

```json
{
  "mcpServers": {
    "mdshare": {
      "command": "npx",
      "args": ["mdshare-mcp"]
    }
  }
}
```

Config file locations:
- **Claude:** `~/.claude/claude_desktop_config.json`
- **Codex CLI:** `~/.codex/config.json`
- **Gemini CLI:** `~/.gemini/settings.json`
- **Cursor:** `~/.cursor/mcp.json`
- **Windsurf:** `~/.codeium/windsurf/mcp_config.json`

For **Claude Code / Claude Desktop**, you can skip manual config and install via the bundled plugin:

```
/plugin marketplace add urbanmorph/mdshare
/plugin install mdshare@urbanmorph
```

## Tools

| Tool | What it does |
|------|-------------|
| `upload_markdown` | Upload markdown by `file_path` (preferred for files on disk) or inline `content`. Returns a share link (default permission: `comment`). Admin credential is stored locally — see below. |
| `read_document` | Read a document by ID + key, optionally save to `output_path` on disk |
| `update_document` | Update content (edit/admin key) |
| `patch_document` | Find/replace operations without rewriting the full document |
| `generate_link` | Create view/edit/comment link (admin key) |
| `list_links` | List all share links with status (admin key) |
| `revoke_link` | Revoke a share link permanently (admin key) |
| `list_comments` | See all comments and replies |
| `post_comment` | Add a comment, optionally anchored to text |
| `resolve_comment` | Resolve or unresolve a comment |
| `get_versions` | See edit history (who, when) |
| `list_my_documents` | List documents you've uploaded via this MCP server on this machine. No admin credential leaked. |
| `get_admin_url` | Retrieve the admin URL for a previously-uploaded document. **Only call when the user explicitly asks.** |
| `register_document` | Register a previously-saved admin URL into the local store for resume |

### `key` is optional on most tools

As of v1.3.0, the `key` parameter is optional on every tool except `resolve_comment`. If you created the document via this MCP server (or registered it with `register_document`), the admin key is loaded from the local store automatically. Pass `key` explicitly when you want to act as a non-admin user (e.g., posting a comment with an edit-level key).

## Local credential store

v1.3.0 introduces a local credential store so the admin URL never needs to appear in chat responses.

**Where:** `~/.mdshare-mcp/documents.json` (chmod 0600, owner-readable only)

**What's in it:** for every doc you upload via this MCP server, a record with `{id, title, admin_key, admin_url, share_url, share_permission, created_at, expires_at}`.

**What this buys you:**

- **No admin-URL leaks.** `upload_markdown` returns only the read/comment share link. The admin URL stays on disk.
- **Cross-session resume.** Days or weeks later, call `patch_document` or `post_comment` with just the `document_id` — the stored admin key is used automatically. No pasting, no re-logging-in.
- **Ask for the admin URL on demand.** If you need the admin URL for a specific doc (to save in Notion, paste into an email, etc.), just say so — the LLM will call `get_admin_url` and return it.

**Moving between machines:** copy `~/.mdshare-mcp/documents.json` to the same path on the new machine. That's it — no remote sync, no accounts.

**Already have admin URLs saved elsewhere?** Use `register_document` to add them to the store. For bulk import, ask the LLM to scan your notes folder with its built-in file-search tools and call `register_document` for each URL found.

## What to say

- "Upload my-notes.md to mdshare and give me a share link"
- "Upload my-notes.md with edit permission so my team can work on it"
- "Save this mdshare document to /tmp/notes.md"
- "Read this mdshare document and summarize the comments"
- "Incorporate the feedback and resolve the comments" (uses stored admin key)
- "Share this markdown with view-only access"
- "Revoke the edit link I shared earlier"
- "List all links for this document"
- "Who edited this document last?"
- **"Resume the doc I made yesterday about Safe Routes to School"** — LLM calls `list_my_documents`, finds it, then operates on it without re-pasting
- **"Give me the admin URL for the Safe Routes doc so I can save it to my Notion"** — explicit ask, LLM calls `get_admin_url`
- **"Scan ~/notes for mdshare admin URLs and register them all"** — LLM uses its built-in file tools to find the URLs, then calls `register_document` for each

## Tip: file_path beats inline content

For files already on disk, the tool reads them directly via `file_path` rather than echoing every byte through the conversation. This is dramatically faster for AI workflows because the LLM doesn't need to generate the entire file as a tool-call parameter. Same applies in reverse for downloads via `output_path`.

## Without MCP

Works with any AI chatbot via curl:

```
Read https://mdshare.live/docs/raw to learn the mdshare API,
then upload this markdown and give me a share link.
```

## Links

- **App:** https://mdshare.live
- **API Docs:** https://mdshare.live/docs
- **GitHub:** https://github.com/urbanmorph/mdshare
