#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFile, writeFile, mkdir, chmod } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const BASE_URL = "https://mdshare.live";
const STORE_DIR = join(homedir(), ".mdshare-mcp");
const STORE_PATH = join(STORE_DIR, "documents.json");

// ---------- Local credential store ----------
// Records the admin credentials for docs uploaded via this MCP server so the
// LLM never needs to see the admin URL in tool responses. The store is a
// plain JSON file at ~/.mdshare-mcp/documents.json with mode 0600.

async function readStore() {
  try {
    const text = await readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code === "ENOENT") return [];
    // Corrupt or unreadable — return empty so tool calls don't crash.
    return [];
  }
}

async function writeStore(docs) {
  await mkdir(STORE_DIR, { recursive: true, mode: 0o700 });
  await writeFile(STORE_PATH, JSON.stringify(docs, null, 2), { mode: 0o600 });
  // Ensure mode even if the file already existed with different perms
  try { await chmod(STORE_PATH, 0o600); } catch {}
}

async function findDoc(id) {
  const docs = await readStore();
  return docs.find((d) => d.id === id) || null;
}

async function addDoc(record) {
  const docs = await readStore();
  const filtered = docs.filter((d) => d.id !== record.id);
  filtered.push(record);
  await writeStore(filtered);
}

async function resolveKey(documentId, providedKey) {
  if (providedKey) return providedKey;
  if (!documentId) return null;
  const doc = await findDoc(documentId);
  return doc?.admin_key || null;
}

function stripAdminFields(doc) {
  const { admin_key, admin_url, ...safe } = doc;
  return safe;
}

function parseAdminUrl(url) {
  const re = /^https:\/\/mdshare\.live\/d\/([a-zA-Z0-9_-]+)\?key=(adm_[a-zA-Z0-9_-]+)$/;
  const m = typeof url === "string" && url.match(re);
  return m ? { documentId: m[1], adminKey: m[2] } : null;
}

function extractTitleFromMarkdown(markdown, fallback = "Untitled") {
  const m = markdown.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : fallback;
}

function noKeyError(documentId) {
  return JSON.stringify({
    error: `No admin key found for document ${documentId}. Either (1) pass 'key' explicitly, (2) call register_document with the admin URL you have saved, or (3) call list_my_documents to see what this MCP server has stored locally.`,
  });
}

// ---------- API helper ----------

async function callApi(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": options.contentType || "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: text };
  }
}

// ---------- Tool definitions ----------

const TOOLS = [
  {
    name: "upload_markdown",
    description:
      "Upload markdown to mdshare and receive a shareable link. The response contains a read/comment/edit share link (default permission: comment) that the user can share with others. The admin credential (full control) is stored locally in ~/.mdshare-mcp/documents.json and is NOT returned in this response — if the user explicitly asks to see or save the admin URL, call get_admin_url. PREFER file_path over content for files already on disk — reads directly from disk without transmitting content through this conversation, which is dramatically faster for files larger than ~1KB.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Absolute path to a local markdown file. PREFERRED for any file already on disk — bypasses inline content transmission entirely.",
        },
        content: {
          type: "string",
          description: "Inline markdown content. Only use this for short snippets composed in the conversation. For files on disk, use file_path instead.",
        },
        share_permission: {
          type: "string",
          enum: ["view", "comment", "edit"],
          description: "Permission level for the share link returned to the user. Default 'comment' — recipients can read and comment. Use 'view' for read-only, 'edit' for full write access.",
        },
      },
    },
  },
  {
    name: "read_document",
    description:
      "Read a markdown document from mdshare. Returns the content, title, last editor, and permission level. If the document was uploaded via this MCP server, 'key' is optional — the admin key will be loaded from local storage. If output_path is provided, the content is written to that local file path and a small summary is returned instead of the full content — much faster for large documents.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: { type: "string", description: "Document ID" },
        key: { type: "string", description: "Access key (admin, edit, comment, or view). Optional if the document is in this MCP server's local store." },
        output_path: {
          type: "string",
          description: "Optional. Absolute local file path to write the document content to. When provided, the response is a small summary (saved_to, bytes) instead of the full content.",
        },
      },
      required: ["document_id"],
    },
  },
  {
    name: "update_document",
    description:
      "Update the content of an existing mdshare document. Requires edit or admin permission. If the document is in this MCP server's local store, 'key' is optional — the admin key will be used automatically.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: { type: "string", description: "Document ID" },
        key: { type: "string", description: "Edit or admin key. Optional if the document is in this MCP server's local store." },
        content: { type: "string", description: "New markdown content" },
        author: { type: "string", description: "Your name (for edit attribution)" },
      },
      required: ["document_id", "content"],
    },
  },
  {
    name: "patch_document",
    description:
      "Apply find/replace operations to a document without rewriting the full content. More efficient than update_document for small edits to large documents. Each find string must be unique unless replace_all is set. If the document is in this MCP server's local store, 'key' is optional.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: { type: "string", description: "Document ID" },
        key: { type: "string", description: "Edit or admin key. Optional if the document is in this MCP server's local store." },
        operations: {
          type: "array",
          description: "Find/replace operations to apply sequentially",
          items: {
            type: "object",
            properties: {
              find: { type: "string", description: "Text to find (must be unique in document)" },
              replace: { type: "string", description: "Text to replace with" },
              replace_all: { type: "boolean", description: "Replace all occurrences (default false)" },
            },
            required: ["find", "replace"],
          },
        },
        author: { type: "string", description: "Your name (for edit attribution)" },
      },
      required: ["document_id", "operations"],
    },
  },
  {
    name: "generate_link",
    description:
      "Generate a share link for a document with specific permissions. Requires admin access. If the document is in this MCP server's local store, 'key' is optional.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: { type: "string", description: "Document ID" },
        key: { type: "string", description: "Admin key. Optional if the document is in this MCP server's local store." },
        permission: {
          type: "string",
          enum: ["view", "edit", "comment"],
          description: "Permission level for the link",
        },
        label: { type: "string", description: "Optional label for the link" },
      },
      required: ["document_id", "permission"],
    },
  },
  {
    name: "list_links",
    description:
      "List all share links for a document, including status (active/revoked), permission, and label. Requires admin access. If the document is in this MCP server's local store, 'key' is optional.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: { type: "string", description: "Document ID" },
        key: { type: "string", description: "Admin key. Optional if the document is in this MCP server's local store." },
      },
      required: ["document_id"],
    },
  },
  {
    name: "revoke_link",
    description:
      "Revoke a share link, making it permanently inactive. Use list_links first to find the token of the link to revoke. Requires admin access. If the document is in this MCP server's local store, 'key' is optional.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: { type: "string", description: "Document ID (used to look up the admin key when 'key' is omitted)" },
        key: { type: "string", description: "Admin key. Optional if the document is in this MCP server's local store." },
        link_token: { type: "string", description: "The token of the link to revoke (from list_links)" },
      },
      required: ["document_id", "link_token"],
    },
  },
  {
    name: "list_comments",
    description:
      "List all comments on a document, including replies and resolution status. If the document is in this MCP server's local store, 'key' is optional.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: { type: "string", description: "Document ID" },
        key: { type: "string", description: "Any valid access key. Optional if the document is in this MCP server's local store." },
      },
      required: ["document_id"],
    },
  },
  {
    name: "post_comment",
    description:
      "Post a comment on a document, optionally anchored to specific text. Can also reply to an existing comment. If the document is in this MCP server's local store, 'key' is optional.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: { type: "string", description: "Document ID" },
        key: { type: "string", description: "Comment, edit, or admin key. Optional if the document is in this MCP server's local store." },
        content: { type: "string", description: "Comment text" },
        author_name: { type: "string", description: "Your name" },
        anchor_text: { type: "string", description: "Text in the document this comment refers to" },
        parent_id: { type: "string", description: "ID of the comment to reply to (one level nesting)" },
      },
      required: ["document_id", "content"],
    },
  },
  {
    name: "resolve_comment",
    description:
      "Resolve or unresolve a comment. Requires edit or admin permission. Key must be provided explicitly because comments are addressed by comment_id — the MCP server can't look up the parent document.",
    inputSchema: {
      type: "object",
      properties: {
        comment_id: { type: "string", description: "Comment ID to resolve" },
        key: { type: "string", description: "Edit or admin key for the document" },
        resolved: { type: "boolean", description: "true to resolve, false to unresolve" },
      },
      required: ["comment_id", "key", "resolved"],
    },
  },
  {
    name: "get_versions",
    description:
      "Get the edit history of a document — who edited, when, and via what. If the document is in this MCP server's local store, 'key' is optional.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: { type: "string", description: "Document ID" },
        key: { type: "string", description: "Any valid access key. Optional if the document is in this MCP server's local store." },
      },
      required: ["document_id"],
    },
  },
  {
    name: "list_my_documents",
    description:
      "List documents you've previously uploaded via this MCP server on this machine. Returns document_id, title, share_url, share_permission, created_at, and expires_at for each — does NOT return the admin credential. Use this to help the user find and resume older documents without re-pasting admin URLs. Does NOT include documents created via the mdshare web UI or via direct API calls from other clients — only those created by this MCP server. Returns an empty array on a fresh install or after the local store has been cleared.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_admin_url",
    description:
      "Retrieve the admin URL for a document previously uploaded via this MCP server. The admin URL grants full control and is equivalent to a password. ONLY call this tool when the user explicitly asks to see, save, or copy the admin URL — for example: 'give me the admin URL', 'save the admin link to my notes', 'what's the owner credential'. DO NOT call this as part of normal upload, share, or collaboration flows; the admin URL should never be surfaced to the user unless directly requested.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: { type: "string", description: "Document ID (from upload_markdown response or list_my_documents)" },
      },
      required: ["document_id"],
    },
  },
  {
    name: "register_document",
    description:
      "Register an mdshare admin URL you already have saved (in notes, chat history, emails, etc.) so it can be resumed without re-pasting the key every time. Takes an admin URL of the form https://mdshare.live/d/{id}?key=adm_..., verifies it against the live API, and stores it in ~/.mdshare-mcp/documents.json. Only accepts admin URLs (adm_ prefix) — view/comment/edit share links will be rejected. For bulk registration across many files, use the LLM's built-in file reading and search tools to find admin URLs, then call this tool once per URL found.",
    inputSchema: {
      type: "object",
      properties: {
        admin_url: {
          type: "string",
          description: "Full admin URL: https://mdshare.live/d/{id}?key=adm_{token}",
        },
      },
      required: ["admin_url"],
    },
  },
];

// ---------- Tool handlers ----------

async function handleTool(name, args) {
  switch (name) {
    case "upload_markdown": {
      let body;
      let filenameTitle = null;
      if (args.file_path) {
        body = await readFile(args.file_path, "utf-8");
        const base = args.file_path.split("/").pop() || "";
        filenameTitle = base.replace(/\.mdx?$/i, "") || null;
      } else if (args.content) {
        body = args.content;
      } else {
        return JSON.stringify({ error: "Must provide either file_path or content" });
      }

      const sharePermission = args.share_permission || "comment";
      if (!["view", "comment", "edit"].includes(sharePermission)) {
        return JSON.stringify({ error: "share_permission must be 'view', 'comment', or 'edit'" });
      }

      // 1. Create document — receive admin credentials
      const createRes = await callApi("/api/documents", {
        method: "POST",
        contentType: "text/markdown",
        body,
      });
      if (createRes.status !== 201 && createRes.status !== 200) {
        return JSON.stringify({ error: "Failed to create document", status: createRes.status, details: createRes.data });
      }
      const created = createRes.data;
      const documentId = created.document_id;
      const adminKey = created.admin_key;
      const adminUrl = created.admin_url;
      const expiresAt = created.expires_at;

      // Title comes from markdown heading, falling back to filename, then 'Untitled'
      const title = extractTitleFromMarkdown(body, filenameTitle || "Untitled");

      // 2. Generate a share link with the requested permission
      const linkRes = await callApi(
        `/api/d/${documentId}/links?key=${adminKey}`,
        {
          method: "POST",
          body: JSON.stringify({
            permission: sharePermission,
            label: "shared-via-mcp",
          }),
        }
      );

      const createdAt = new Date().toISOString();
      const record = {
        id: documentId,
        title,
        admin_key: adminKey,
        admin_url: adminUrl,
        share_url: null,
        share_permission: sharePermission,
        created_at: createdAt,
        expires_at: expiresAt,
      };

      if (linkRes.status === 201 || linkRes.status === 200) {
        record.share_url = linkRes.data.url;
      }

      // 3. Persist to local store. If this fails, we must surface the admin
      // URL because the credential would otherwise be lost.
      try {
        await addDoc(record);
      } catch (err) {
        return JSON.stringify({
          error: "Local credential storage failed — save this admin URL immediately, otherwise full control of the document will be lost. This is an exceptional error state.",
          document_id: documentId,
          admin_url_to_save_manually: adminUrl,
          expires_at: expiresAt,
          storage_error: err.message,
        }, null, 2);
      }

      if (!record.share_url) {
        // Doc created and stored, but share link generation failed
        return JSON.stringify({
          document_id: documentId,
          title,
          share_url: null,
          expires_at: expiresAt,
          warning: "Document created but share link generation failed. The admin credential was stored locally — call generate_link (no key needed) to create a share link now.",
        }, null, 2);
      }

      return JSON.stringify({
        document_id: documentId,
        title,
        share_url: record.share_url,
        share_permission: sharePermission,
        expires_at: expiresAt,
        note: `Share this link with anyone. Link permission: ${sharePermission}. The admin credential is stored locally; call get_admin_url only if the user explicitly asks for it.`,
      }, null, 2);
    }

    case "read_document": {
      const key = await resolveKey(args.document_id, args.key);
      if (!key) return noKeyError(args.document_id);
      const { data } = await callApi(
        `/api/d/${args.document_id}?key=${key}`,
        { headers: { Accept: "text/markdown" }, contentType: "text/plain" }
      );
      const content = typeof data === "string" ? data : JSON.stringify(data, null, 2);
      if (args.output_path && typeof data === "string") {
        await writeFile(args.output_path, content, "utf-8");
        return JSON.stringify({
          saved_to: args.output_path,
          bytes: Buffer.byteLength(content, "utf-8"),
        }, null, 2);
      }
      return content;
    }

    case "update_document": {
      const key = await resolveKey(args.document_id, args.key);
      if (!key) return noKeyError(args.document_id);
      const headers = {};
      if (args.author) headers["X-Author"] = args.author;
      const { data } = await callApi(
        `/api/d/${args.document_id}?key=${key}`,
        { method: "PUT", contentType: "text/markdown", body: args.content, headers }
      );
      return JSON.stringify(data, null, 2);
    }

    case "patch_document": {
      const key = await resolveKey(args.document_id, args.key);
      if (!key) return noKeyError(args.document_id);
      // Some MCP clients serialize array parameters as JSON strings instead of
      // native arrays. Parse defensively so both cases work.
      let operations = args.operations;
      if (typeof operations === "string") {
        try {
          operations = JSON.parse(operations);
        } catch {
          return JSON.stringify({
            error: "operations must be an array or a JSON-encoded array string",
          });
        }
      }
      if (!Array.isArray(operations) || operations.length === 0) {
        return JSON.stringify({
          error: "operations must be a non-empty array of {find, replace} objects",
        });
      }
      const body = { operations };
      if (args.author) body.author = args.author;
      const { data } = await callApi(
        `/api/d/${args.document_id}?key=${key}`,
        { method: "PATCH", body: JSON.stringify(body) }
      );
      return JSON.stringify(data, null, 2);
    }

    case "generate_link": {
      const key = await resolveKey(args.document_id, args.key);
      if (!key) return noKeyError(args.document_id);
      const { data } = await callApi(
        `/api/d/${args.document_id}/links?key=${key}`,
        {
          method: "POST",
          body: JSON.stringify({
            permission: args.permission,
            label: args.label || null,
          }),
        }
      );
      return JSON.stringify(data, null, 2);
    }

    case "list_links": {
      const key = await resolveKey(args.document_id, args.key);
      if (!key) return noKeyError(args.document_id);
      const { data } = await callApi(
        `/api/d/${args.document_id}/links?key=${key}`
      );
      return JSON.stringify(data, null, 2);
    }

    case "revoke_link": {
      const key = await resolveKey(args.document_id, args.key);
      if (!key) return noKeyError(args.document_id);
      const { data } = await callApi(
        `/api/links/${args.link_token}?key=${key}`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_active: false }),
        }
      );
      return JSON.stringify(data, null, 2);
    }

    case "list_comments": {
      const key = await resolveKey(args.document_id, args.key);
      if (!key) return noKeyError(args.document_id);
      const { data } = await callApi(
        `/api/d/${args.document_id}/comments?key=${key}`
      );
      return JSON.stringify(data, null, 2);
    }

    case "post_comment": {
      const key = await resolveKey(args.document_id, args.key);
      if (!key) return noKeyError(args.document_id);
      const body = {
        content: args.content,
        author_name: args.author_name || "AI Assistant",
        anchor_text: args.anchor_text || null,
        parent_id: args.parent_id || null,
      };
      const { data } = await callApi(
        `/api/d/${args.document_id}/comments?key=${key}`,
        { method: "POST", body: JSON.stringify(body) }
      );
      return JSON.stringify(data, null, 2);
    }

    case "resolve_comment": {
      // Key is still required — comments are addressed by comment_id, no
      // parent document_id context to look up.
      const { data } = await callApi(
        `/api/comments/${args.comment_id}?key=${args.key}`,
        {
          method: "PATCH",
          body: JSON.stringify({ resolved: args.resolved }),
        }
      );
      return JSON.stringify(data, null, 2);
    }

    case "get_versions": {
      const key = await resolveKey(args.document_id, args.key);
      if (!key) return noKeyError(args.document_id);
      const { data } = await callApi(
        `/api/d/${args.document_id}/versions?key=${key}`
      );
      return JSON.stringify(data, null, 2);
    }

    case "list_my_documents": {
      const docs = await readStore();
      // Strip admin credentials before returning to the LLM
      const safe = docs.map(stripAdminFields);
      return JSON.stringify({ documents: safe, count: safe.length }, null, 2);
    }

    case "get_admin_url": {
      if (!args.document_id) {
        return JSON.stringify({ error: "document_id is required" });
      }
      const doc = await findDoc(args.document_id);
      if (!doc) {
        return JSON.stringify({
          error: `No stored record for document ${args.document_id}. If you have the admin URL saved elsewhere, use register_document to add it to the local store first.`,
        });
      }
      return JSON.stringify({
        document_id: doc.id,
        title: doc.title,
        admin_url: doc.admin_url,
      }, null, 2);
    }

    case "register_document": {
      const parsed = parseAdminUrl(args.admin_url);
      if (!parsed) {
        return JSON.stringify({
          error: "Invalid admin URL format. Expected https://mdshare.live/d/{id}?key=adm_{token}. Only admin URLs (adm_ prefix) are accepted — view/comment/edit share links cannot be registered.",
        });
      }
      // Verify against the live API before storing
      const verify = await callApi(
        `/api/d/${parsed.documentId}?key=${parsed.adminKey}`,
        { headers: { Accept: "application/json" } }
      );
      if (verify.status !== 200 || typeof verify.data !== "object") {
        return JSON.stringify({
          error: `Verification failed (HTTP ${verify.status}). The document may have expired, been deleted, or the admin key may be wrong. Not stored.`,
        });
      }
      const docData = verify.data;
      // Merge with existing record (if any) so re-registering a doc that was
      // previously uploaded via upload_markdown doesn't clobber its share_url,
      // share_permission, or the original ISO-format created_at.
      const existing = await findDoc(parsed.documentId);
      const title = docData.title || existing?.title || extractTitleFromMarkdown(docData.content || "", "Untitled");
      const record = {
        id: parsed.documentId,
        title,
        admin_key: parsed.adminKey,
        admin_url: args.admin_url,
        share_url: existing?.share_url || null,
        share_permission: existing?.share_permission || null,
        created_at: existing?.created_at || docData.created_at || new Date().toISOString(),
        expires_at: docData.expires_at || existing?.expires_at || null,
      };
      try {
        await addDoc(record);
      } catch (err) {
        return JSON.stringify({
          error: "Failed to write to local store",
          storage_error: err.message,
        });
      }
      return JSON.stringify({
        document_id: record.id,
        title: record.title,
        registered: true,
        already_existed: !!existing,
        expires_at: record.expires_at,
      }, null, 2);
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ---------- Server setup ----------

const server = new Server(
  { name: "mdshare", version: "1.3.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await handleTool(name, args);
    return { content: [{ type: "text", text: result }] };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
