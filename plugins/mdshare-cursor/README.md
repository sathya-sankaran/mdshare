# mdshare — Cursor plugin

Wraps the [mdshare-mcp](https://www.npmjs.com/package/mdshare-mcp) npm package so Cursor can upload markdown to [mdshare.live](https://mdshare.live) and return shareable URLs in one tool call.

## What it adds to Cursor

- 14 MCP tools for upload / read / edit / comment / version on markdown documents
- A skill (`mdshare-tools`) that activates on natural-language requests like *"share this markdown with my designer for feedback"* — Cursor picks the right tool, infers the right permission tier, returns a hosted URL

## Install

After this plugin is published to the Cursor Marketplace:

```
/add-plugin mdshare
```

## Permissions model

Every document gets four kinds of share links:

- **admin** — full control (revoke, regenerate keys)
- **edit** — modify content
- **comment** — add inline-anchored comments without editing
- **view** — read-only

No accounts. The link is the auth. Don't paste anything sensitive.

## Underlying MCP server

`npx -y mdshare-mcp` — published to npm, registered in the official MCP Registry as `io.github.sathya-sankaran/mdshare`.

## Links

- mdshare.live — https://mdshare.live
- Setup guide — https://mdshare.live/install-mdshare-plugin
- GitHub — https://github.com/urbanmorph/mdshare
- npm — https://www.npmjs.com/package/mdshare-mcp

## License

MIT
