@AGENTS.md

# mdshare

## Project Philosophy

mdshare is deliberately minimal. The core value is: upload markdown, get a link, share it. That's it.

**Design principles:**
- **Simple over powerful** — if a feature needs explanation, it's too complex
- **Zero friction** — no login, no setup, no configuration. Paste and go.
- **Invisible infrastructure** — users shouldn't know or care about the tech stack
- **Features earn their place** — every feature must make the core flow faster or clearer. If it adds a button, menu, or step, it needs strong justification.
- **Don't build what users haven't asked for** — resist speculative features

**What mdshare is NOT:**
- Not a Google Docs competitor (no real-time cursors, no track changes)
- Not a CMS or wiki
- Not a note-taking app
- Not a collaboration platform with user accounts

**When evaluating new features, ask:**
1. Does this make upload → share → collaborate faster?
2. Can a first-time user figure it out without instructions?
3. Does it add UI clutter?
4. Could this be solved by the user's existing tools instead?

## Tech Stack

- Next.js 16 on Cloudflare Workers (via OpenNext)
- Cloudflare D1 (SQLite), Durable Objects (WebSocket)
- Tiptap editor with tiptap-markdown
- Tailwind CSS v4
- CI/CD: GitHub Actions → auto-deploy on push to main

## Key Files

- `lib/sanitize.ts` — content sanitization pipeline (security-critical)
- `lib/tokens.ts` — token generation and verification
- `lib/permissions.ts` — permission resolution from tokens
- `app/api/` — all REST API routes
- `app/d/[id]/document-view.tsx` — main document page (largest component)
- `components/editor/` — Tiptap editor, toolbar, comments, highlights

## Cloudflare Token

The project uses its own Cloudflare API token (separate from other projects).
Store in `.dev.vars` for local dev. CI/CD uses GitHub secrets.
Prefix wrangler commands with the token: `CLOUDFLARE_API_TOKEN=... npx wrangler ...`
