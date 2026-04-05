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

## Tools

| Tool | What it does |
|------|-------------|
| `upload_markdown` | Upload markdown, get shareable admin URL |
| `read_document` | Read a document by ID + key |
| `update_document` | Update content (edit/admin key) |
| `patch_document` | Find/replace operations without rewriting the full document |
| `generate_link` | Create view/edit/comment link (admin key) |
| `list_links` | List all share links with status (admin key) |
| `revoke_link` | Revoke a share link permanently (admin key) |
| `list_comments` | See all comments and replies |
| `post_comment` | Add a comment, optionally anchored to text |
| `resolve_comment` | Resolve or unresolve a comment |
| `get_versions` | See edit history (who, when) |

## What to say

- "Upload my-notes.md to mdshare and give me an edit link"
- "Read this mdshare document and summarize the comments"
- "Incorporate the feedback and resolve the comments"
- "Share this markdown with view-only access"
- "Revoke the edit link I shared earlier"
- "List all links for this document"
- "Who edited this document last?"

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
