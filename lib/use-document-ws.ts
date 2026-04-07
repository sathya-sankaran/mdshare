
import { useEffect, useRef, useState, useCallback } from "react";

interface UseDocumentWSOptions {
  documentId: string;
  tokenKey: string;
  onContentUpdate: (content: string, contentHash: string) => void;
  enabled: boolean;
}

interface UseDocumentWSReturn {
  broadcastUpdate: (content: string, contentHash: string) => void;
  presenceCount: number;
  connected: boolean;
}

/**
 * WebSocket hook for real-time document updates.
 * Falls back to polling if WebSocket connection fails.
 */
export function useDocumentWS({
  documentId,
  tokenKey,
  onContentUpdate,
  enabled,
}: UseDocumentWSOptions): UseDocumentWSReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [presenceCount, setPresenceCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const onContentUpdateRef = useRef(onContentUpdate);
  onContentUpdateRef.current = onContentUpdate;

  const connect = useCallback(() => {
    if (!enabled) return;

    // Build WebSocket URL
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/ws/${documentId}?key=${tokenKey}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "update") {
            onContentUpdateRef.current(data.content, data.content_hash);
          }

          if (data.type === "presence") {
            setPresenceCount(data.count);
          }
        } catch {
          // Ignore invalid messages
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WebSocket not available (e.g., local dev without DO support)
      setConnected(false);
    }
  }, [documentId, tokenKey, enabled]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const broadcastUpdate = useCallback(
    (content: string, contentHash: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "update",
            content,
            content_hash: contentHash,
          })
        );
      }
    },
    []
  );

  return { broadcastUpdate, presenceCount, connected };
}
