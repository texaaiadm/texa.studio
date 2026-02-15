// ws-shim.js
// In the browser, we use the native WebSocket
const WebSocket = globalThis.WebSocket;
export { WebSocket };
export default WebSocket;
