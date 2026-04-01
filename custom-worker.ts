// Custom worker entry point that exports both the OpenNext handler
// and our Durable Object class for document WebSocket connections.

// @ts-ignore - .open-next/worker.js is generated at build time
import { default as handler } from "./.open-next/worker.js";

// Re-export the OpenNext handler as default
export default handler;

// Export our Durable Object class
export { DocumentWebSocket } from "./worker/document-ws";
