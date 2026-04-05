#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const BASE_URL = "https://mdshare.live";

const TOOLS = [
  {
    name: "upload_markdown",
    description:
      "Upload markdown content to mdshare and get a shareable admin URL. Returns document_id, admin_key, admin_url, and expiry date.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Markdown content to upload" },
      },
      required: ["content"],
    },
  },
  {
    name: "read_document",
    description:
      "Read a markdown document from mdshare. Returns the content, title, last editor, and permission level.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: { type: "string", description: "Document ID" },
        key: { type: "string", description: "Access key (admin, edit, comment, or view)" },
      },
      required: ["document_id", "key"],
    },
  },
  {
    name: "update_document",
    description:
      "Update the content of an existing mdshare document. Requires edit or admin key.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: { type: "string", description: "Document ID" },
        key: { type: "string", description: "Edit or admin key" },
        content: { type: "string", description: "New markdown content" },
        author: { type: "string", description: "Your name (for edit attribution)" },
      },
      required: ["document_id", "key", "content"],
    },
  },
  {
    name: "patch_document",
    description:
      "Apply find/replace operations to a document without rewriting the full content. More efficient than update_document for small edits to large documents. Each find string must be unique unless replace_all is set.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: { type: "string", description: "Document ID" },
        key: { type: "string", description: "Edit or admin key" },
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
      required: ["document_id", "key", "operations"],
    },
  },
  {
    name: "generate_link",
    description:
      "Generate a share link for a document with specific permissions. Requires admin key.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: { type: "string", description: "Document ID" },
        key: { type: "string", description: "Admin key" },
        permission: {
          type: "string",
          enum: ["view", "edit", "comment"],
          description: "Permission level for the link",
        },
        label: { type: "string", description: "Optional label for the link" },
      },
      required: ["document_id", "key", "permission"],
    },
  },
  {
    name: "list_links",
    description:
      "List all share links for a document, including status (active/revoked), permission, and label. Requires admin key.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: { type: "string", description: "Document ID" },
        key: { type: "string", description: "Admin key" },
      },
      required: ["document_id", "key"],
    },
  },
  {
    name: "revoke_link",
    description:
      "Revoke a share link, making it permanently inactive. Use list_links first to find the token of the link to revoke. Requires admin key.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: { type: "string", description: "Document ID (for context)" },
        key: { type: "string", description: "Admin key" },
        link_token: { type: "string", description: "The token of the link to revoke (from list_links)" },
      },
      required: ["document_id", "key", "link_token"],
    },
  },
  {
    name: "list_comments",
    description:
      "List all comments on a document, including replies and resolution status.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: { type: "string", description: "Document ID" },
        key: { type: "string", description: "Any valid access key" },
      },
      required: ["document_id", "key"],
    },
  },
  {
    name: "post_comment",
    description:
      "Post a comment on a document, optionally anchored to specific text. Can also reply to an existing comment.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: { type: "string", description: "Document ID" },
        key: { type: "string", description: "Comment, edit, or admin key" },
        content: { type: "string", description: "Comment text" },
        author_name: { type: "string", description: "Your name" },
        anchor_text: { type: "string", description: "Text in the document this comment refers to" },
        parent_id: { type: "string", description: "ID of the comment to reply to (one level nesting)" },
      },
      required: ["document_id", "key", "content"],
    },
  },
  {
    name: "resolve_comment",
    description:
      "Resolve or unresolve a comment. Requires edit or admin key.",
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
      "Get the edit history of a document — who edited, when, and via what.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: { type: "string", description: "Document ID" },
        key: { type: "string", description: "Any valid access key" },
      },
      required: ["document_id", "key"],
    },
  },
];

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

async function handleTool(name, args) {
  switch (name) {
    case "upload_markdown": {
      const { data } = await callApi("/api/documents", {
        method: "POST",
        contentType: "text/markdown",
        body: args.content,
      });
      return JSON.stringify(data, null, 2);
    }

    case "read_document": {
      const { data } = await callApi(
        `/api/d/${args.document_id}?key=${args.key}`,
        { headers: { Accept: "text/markdown" }, contentType: "text/plain" }
      );
      return typeof data === "string" ? data : JSON.stringify(data, null, 2);
    }

    case "update_document": {
      const headers = {};
      if (args.author) headers["X-Author"] = args.author;
      const { data } = await callApi(
        `/api/d/${args.document_id}?key=${args.key}`,
        { method: "PUT", contentType: "text/markdown", body: args.content, headers }
      );
      return JSON.stringify(data, null, 2);
    }

    case "patch_document": {
      const body = { operations: args.operations };
      if (args.author) body.author = args.author;
      const { data } = await callApi(
        `/api/d/${args.document_id}?key=${args.key}`,
        { method: "PATCH", body: JSON.stringify(body) }
      );
      return JSON.stringify(data, null, 2);
    }

    case "generate_link": {
      const { data } = await callApi(
        `/api/d/${args.document_id}/links?key=${args.key}`,
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
      const { data } = await callApi(
        `/api/d/${args.document_id}/links?key=${args.key}`
      );
      return JSON.stringify(data, null, 2);
    }

    case "revoke_link": {
      const { data } = await callApi(
        `/api/links/${args.link_token}?key=${args.key}`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_active: false }),
        }
      );
      return JSON.stringify(data, null, 2);
    }

    case "list_comments": {
      const { data } = await callApi(
        `/api/d/${args.document_id}/comments?key=${args.key}`
      );
      return JSON.stringify(data, null, 2);
    }

    case "post_comment": {
      const body = {
        content: args.content,
        author_name: args.author_name || "AI Assistant",
        anchor_text: args.anchor_text || null,
        parent_id: args.parent_id || null,
      };
      const { data } = await callApi(
        `/api/d/${args.document_id}/comments?key=${args.key}`,
        { method: "POST", body: JSON.stringify(body) }
      );
      return JSON.stringify(data, null, 2);
    }

    case "resolve_comment": {
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
      const { data } = await callApi(
        `/api/d/${args.document_id}/versions?key=${args.key}`
      );
      return JSON.stringify(data, null, 2);
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// Start server
const server = new Server(
  { name: "mdshare", version: "1.1.0" },
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
