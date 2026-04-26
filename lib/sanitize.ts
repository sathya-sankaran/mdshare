import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import type { Root, Node, Link, Image } from "mdast";

const ALLOWED_PROTOCOLS = ["http:", "https:", "mailto:"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_NESTING_DEPTH = 20;

// Magic bytes for common binary formats
const BINARY_SIGNATURES: [number[], string][] = [
  [[0x89, 0x50, 0x4e, 0x47], "PNG image"],
  [[0xff, 0xd8, 0xff], "JPEG image"],
  [[0x47, 0x49, 0x46, 0x38], "GIF image"],
  [[0x25, 0x50, 0x44, 0x46], "PDF document"],
  [[0x50, 0x4b, 0x03, 0x04], "ZIP/DOCX/XLSX archive"],
  [[0x50, 0x4b, 0x05, 0x06], "ZIP archive"],
  [[0x52, 0x61, 0x72, 0x21], "RAR archive"],
  [[0x1f, 0x8b], "GZIP compressed"],
  [[0x42, 0x5a, 0x68], "BZIP2 compressed"],
  [[0x7f, 0x45, 0x4c, 0x46], "ELF executable"],
  [[0x4d, 0x5a], "Windows executable"],
  [[0xfe, 0xed, 0xfa, 0xce], "Mach-O binary"],
  [[0xfe, 0xed, 0xfa, 0xcf], "Mach-O 64-bit binary"],
  [[0xcf, 0xfa, 0xed, 0xfe], "Mach-O binary (reversed)"],
  [[0xca, 0xfe, 0xba, 0xbe], "Java class / Mach-O fat binary"],
  [[0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70], "MP4/MOV video"],
  [[0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], "MP4 video"],
  [[0x49, 0x44, 0x33], "MP3 audio"],
  [[0x4f, 0x67, 0x67, 0x53], "OGG audio"],
  [[0x52, 0x49, 0x46, 0x46], "WAV/AVI/WebP"],
  [[0x00, 0x61, 0x73, 0x6d], "WebAssembly binary"],
  [[0x37, 0x7a, 0xbc, 0xaf], "7-Zip archive"],
  [[0xfd, 0x37, 0x7a, 0x58, 0x5a], "XZ compressed"],
  [[0xd0, 0xcf, 0x11, 0xe0], "MS Office legacy (DOC/XLS/PPT)"],
];

// Dangerous Unicode ranges. The 'misleading character class' and 'control regex'
// rules below flag exactly what this code is supposed to match — joiner sequences
// and control bytes — so they're disabled with intent.
const BIDI_CHARS =
  /[\u202A-\u202E\u2066-\u2069\u200F\u200E\u061C\u2067\u2068]/g;
// eslint-disable-next-line no-misleading-character-class
const ZERO_WIDTH_CHARS = /[\u200B\u200C\u200D\uFEFF]/g;
const DANGEROUS_CONTROL_CHARS =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

/**
 * Validate that raw bytes are plausible markdown (plain text), not a binary format.
 * Call this on the raw input BEFORE converting to string, or on the Uint8Array.
 */
export function validateIsText(bytes: Uint8Array): void {
  // 1. Check magic bytes against known binary signatures
  for (const [signature, label] of BINARY_SIGNATURES) {
    if (bytes.length >= signature.length) {
      const matches = signature.every((b, i) => bytes[i] === b);
      if (matches) {
        throw new Error(`Rejected: content is a ${label}, not markdown`);
      }
    }
  }

  // 2. Check for null bytes (strong indicator of binary content)
  //    Sample first 8KB to avoid scanning huge files
  const sampleSize = Math.min(bytes.length, 8192);
  let nullCount = 0;
  let controlCount = 0;

  for (let i = 0; i < sampleSize; i++) {
    const b = bytes[i];
    if (b === 0x00) {
      nullCount++;
    }
    // Control chars excluding tab (0x09), newline (0x0A), carriage return (0x0D)
    if (b < 0x09 || (b > 0x0d && b < 0x20 && b !== 0x1b)) {
      controlCount++;
    }
  }

  if (nullCount > 0) {
    throw new Error(
      "Rejected: content contains null bytes (binary file detected)"
    );
  }

  // 3. If >10% of sampled bytes are control characters, likely not text
  if (sampleSize > 0 && controlCount / sampleSize > 0.1) {
    throw new Error(
      "Rejected: content has too many control characters (binary file detected)"
    );
  }

  // 4. Verify the bytes decode as valid UTF-8
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(
      "Rejected: content is not valid UTF-8 text"
    );
  }
}

/**
 * Full sanitization pipeline for markdown content.
 * Strips raw HTML, validates links, removes dangerous Unicode, enforces limits.
 */
export async function sanitizeMarkdown(input: string): Promise<string> {
  // 0. Validate this is actually text content
  const bytes = new TextEncoder().encode(input);
  validateIsText(bytes);

  // 1. Enforce size limit
  if (bytes.length > MAX_SIZE_BYTES) {
    throw new Error("Content exceeds maximum size of 10MB");
  }

  // 2. Strip dangerous control characters (keep tabs and newlines)
  let cleaned = input.replace(DANGEROUS_CONTROL_CHARS, "");

  // 3. Strip dangerous Unicode
  cleaned = cleaned.replace(BIDI_CHARS, "");
  cleaned = cleaned.replace(ZERO_WIDTH_CHARS, "");

  // 4. Parse markdown to AST
  const tree = unified().use(remarkParse).parse(cleaned);

  // 5. Walk AST and sanitize
  sanitizeNode(tree, 0);

  // 6. Serialize back to clean markdown
  const result = await unified().use(remarkStringify).stringify(tree);

  return result;
}

function sanitizeNode(node: Node, depth: number): void {
  // Enforce nesting depth
  if (depth > MAX_NESTING_DEPTH) {
    if ("children" in node) {
      (node as Root).children = [];
    }
    return;
  }

  // Strip raw HTML nodes
  if (node.type === "html") {
    // Replace HTML node with empty text
    (node as { type: string; value?: string }).type = "text";
    (node as { value?: string }).value = "";
    return;
  }

  // Validate link URLs
  if (node.type === "link") {
    const link = node as Link;
    if (!isAllowedUrl(link.url)) {
      link.url = "#";
    }
  }

  // Validate image URLs
  if (node.type === "image") {
    const img = node as Image;
    if (!isAllowedUrl(img.url)) {
      img.url = "#";
    }
  }

  // Recurse into children
  if ("children" in node && Array.isArray((node as Root).children)) {
    for (const child of (node as Root).children) {
      sanitizeNode(child, depth + 1);
    }
  }
}

function isAllowedUrl(url: string): boolean {
  if (!url) return true; // empty is fine

  // Relative URLs are ok
  if (url.startsWith("/") || url.startsWith("#") || url.startsWith("?")) {
    return true;
  }

  // Check protocol
  try {
    const parsed = new URL(url);
    return ALLOWED_PROTOCOLS.includes(parsed.protocol);
  } catch {
    // If URL doesn't parse, check if it starts with a dangerous protocol
    const lower = url.toLowerCase().trim();
    if (
      lower.startsWith("javascript:") ||
      lower.startsWith("data:") ||
      lower.startsWith("vbscript:") ||
      lower.startsWith("file:") ||
      lower.startsWith("blob:")
    ) {
      return false;
    }
    return true; // relative paths, anchors, etc.
  }
}

/**
 * Compute SHA-256 hash of content for change detection.
 */
export async function contentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
