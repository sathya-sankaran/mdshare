import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProsemirrorNode } from "@tiptap/pm/model";

export interface CommentAnchor {
  id: string;
  anchorText: string;
}

const commentHighlightKey = new PluginKey("commentHighlight");

/**
 * Build a flat map of { text, pos } for the entire document,
 * collapsing all text nodes with their absolute positions.
 * This lets us search for anchor text that spans across nodes/paragraphs.
 */
function buildTextMap(doc: ProsemirrorNode): { text: string; positions: number[] } {
  // positions[i] = the document position for character i in the concatenated text
  const chars: string[] = [];
  const positions: number[] = [];

  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      for (let i = 0; i < node.text.length; i++) {
        chars.push(node.text[i]);
        positions.push(pos + i);
      }
    } else if (node.isBlock && chars.length > 0) {
      // Insert a space between blocks so "end of paragraph" + "start of next"
      // doesn't accidentally concatenate words
      chars.push(" ");
      positions.push(-1); // sentinel — not a real position
    }
  });

  return { text: chars.join(""), positions };
}

/**
 * Normalize anchor text for matching: collapse whitespace/newlines into single spaces.
 */
function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export const CommentHighlight = Extension.create({
  name: "commentHighlight",

  addStorage() {
    return {
      anchors: [] as CommentAnchor[],
      activeCommentId: null as string | null,
      _prevActiveId: null as string | null,
      _prevAnchorCount: 0,
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: commentHighlightKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldSet) {
            const anchors = extension.storage.anchors as CommentAnchor[];
            const activeId = extension.storage.activeCommentId as string | null;

            if (anchors.length === 0) return DecorationSet.empty;

            // Skip rebuild if doc hasn't changed and no metadata updates
            if (!tr.docChanged && oldSet !== DecorationSet.empty) {
              // Only rebuild if activeId changed (check via a stored ref)
              const prevActiveId = extension.storage._prevActiveId;
              const prevAnchorCount = extension.storage._prevAnchorCount;
              if (activeId === prevActiveId && anchors.length === prevAnchorCount) {
                return oldSet;
              }
            }
            extension.storage._prevActiveId = activeId;
            extension.storage._prevAnchorCount = anchors.length;

            const doc = tr.doc;
            const { text: fullText, positions } = buildTextMap(doc);
            const normalizedFull = normalize(fullText);
            const decorations: Decoration[] = [];

            for (const anchor of anchors) {
              if (!anchor.anchorText) continue;

              const normalizedAnchor = normalize(anchor.anchorText);
              if (!normalizedAnchor) continue;

              // Find the anchor in the normalized full text
              const idx = normalizedFull.indexOf(normalizedAnchor);
              if (idx === -1) continue;

              // Map back to document positions, skipping sentinel positions (-1)
              // We need to find real character positions for the match range
              let realCharIndex = 0;
              let startDocPos = -1;
              let endDocPos = -1;

              // Walk through the original fullText to map normalized index to positions
              let normalizedIdx = 0;
              let matchStart = -1;
              let matchEnd = -1;

              // Rebuild the normalized-to-original index mapping
              const origChars: { char: string; posIdx: number }[] = [];
              for (let i = 0; i < fullText.length; i++) {
                origChars.push({ char: fullText[i], posIdx: i });
              }

              // Normalize and track positions
              let normI = 0;
              let inWhitespace = false;
              const normToOrig: number[] = []; // normToOrig[normalizedIndex] = original index

              // Skip leading whitespace
              let origI = 0;
              while (origI < fullText.length && /\s/.test(fullText[origI])) origI++;

              for (; origI < fullText.length; origI++) {
                const ch = fullText[origI];
                if (/\s/.test(ch)) {
                  if (!inWhitespace) {
                    normToOrig.push(origI);
                    inWhitespace = true;
                  }
                } else {
                  normToOrig.push(origI);
                  inWhitespace = false;
                }
              }

              if (idx >= normToOrig.length) continue;

              const origStart = normToOrig[idx];
              const origEnd = normToOrig[Math.min(idx + normalizedAnchor.length - 1, normToOrig.length - 1)];

              if (origStart === undefined || origEnd === undefined) continue;

              // Get document positions, filtering out sentinel positions
              startDocPos = positions[origStart];
              endDocPos = positions[origEnd];

              if (startDocPos === -1 || endDocPos === -1 || startDocPos === undefined || endDocPos === undefined) continue;

              const isActive = anchor.id === activeId;

              // Create inline decorations — they handle spanning across nodes automatically
              try {
                decorations.push(
                  Decoration.inline(startDocPos, endDocPos + 1, {
                    class: isActive
                      ? "comment-highlight comment-highlight-active"
                      : "comment-highlight",
                    "data-comment-id": anchor.id,
                  })
                );
              } catch {
                // If positions are invalid (e.g. cross block boundaries in a way
                // ProseMirror doesn't like), just skip this anchor
              }
            }

            return DecorationSet.create(doc, decorations);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state) || DecorationSet.empty;
          },
          handleClick(view, pos, event) {
            const target = event.target as HTMLElement;
            const el = target.closest("[data-comment-id]") as HTMLElement | null;
            const commentId = el?.getAttribute("data-comment-id");
            if (commentId) {
              window.dispatchEvent(
                new CustomEvent("comment-highlight-click", {
                  detail: { commentId },
                })
              );
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});
