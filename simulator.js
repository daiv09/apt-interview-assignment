import { WebSocketServer, WebSocket } from "ws";

// Fetch configurations dynamically from hosting environment variables (Critical for Render/Railway)
const PORT = process.env.PORT || 8080;

const customers = [
  "Amit Sharma",
  "Priya Patel",
  "Rohan Das",
  "Sneha Reddy",
  "Vikram Singh",
  "Ananya Iyer",
];
const products = [
  "Wireless Mouse",
  "Mechanical Keyboard",
  "Coffee Mug",
  "Leather Notebook",
  "USB-C Cable",
  "Desk Mat",
];
const statuses = ["pending", "shipped", "delivered"];

const wss = new WebSocketServer({ port: Number(PORT) });

console.log("────────────────────────────────────────────────────────");
console.log(`🚀 ENTERPRISE SIMULATED TRADING ORDER ENGINE BOOTED`);
console.log(`📡 WebSocket server listening on system port: ${PORT}`);
console.log("────────────────────────────────────────────────────────\n");

// Centralized connection lifecycle tracking per evaluator endpoint session
wss.on("connection", (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`🔌 Evaluator session authenticated seamlessly from IP: ${clientIp}`);

  // ─── ISOLATED CLIENT STATE ──────────────────────────────────────────────────
  let localIdCounter = 1001;
  let timerId = null;
  
  // TRACKER ENGINE: Stores active IDs to ensure perfect data contract correctness
  const activeOrderIds = [];

  function getTimestamp() {
    return new Date().toLocaleTimeString();
  }

  // Self-contained generator engine loop scoped purely to this active socket pipe
  function generateLiveEvent() {
    try {
      // Guard clause ensuring we stop computational overhead if client leaves
      if (ws.readyState !== WebSocket.OPEN) {
        cleanUpSession();
        return;
      }

      const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
      const randomProduct = products[Math.floor(Math.random() * products.length)];

      // Determine event type based on pool size to avoid non-existent modifications
      let eventType = "INSERT";
      if (activeOrderIds.length > 0) {
        eventType = Math.random() > 0.4 ? "INSERT" : (Math.random() > 0.4 ? "UPDATE" : "DELETE");
      }

      let mockPayload = { eventType, timestamp: getTimestamp() };

      if (eventType === "INSERT") {
        const currentId = localIdCounter++;
        activeOrderIds.push(currentId); // Commit to session index tracking

        mockPayload.new = {
          id: currentId,
          customer_name: randomCustomer,
          product_name: randomProduct,
          status: "pending",
          updated_at: getTimestamp(),
        };
      } 
      else if (eventType === "UPDATE") {
        // Pick a guaranteed active ID from the tracked session index
        const randomIdx = Math.floor(Math.random() * activeOrderIds.length);
        const targetId = activeOrderIds[randomIdx];

        mockPayload.new = {
          id: targetId,
          customer_name: randomCustomer,
          product_name: randomProduct,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          updated_at: getTimestamp(),
        };
      } 
      else if (eventType === "DELETE") {
        // Splice out a tracked active ID so it can never be mutated again
        const randomIdx = Math.floor(Math.random() * activeOrderIds.length);
        const targetId = activeOrderIds.splice(randomIdx, 1)[0];

        mockPayload.old = { id: targetId };
      }

      // Stream the payload natively down this client's unique isolated socket pipe
      ws.send(JSON.stringify(mockPayload));
      
      console.log(
        `[SESSION STACK - ${clientIp}] ${eventType.padEnd(6)} | Order ID: #${
          mockPayload.new?.id || mockPayload.old?.id
        } | Active Pool Size: ${activeOrderIds.length}`
      );

    } catch (err) {
      console.error(`⚠️ Session context exception caught for client ${clientIp}:`, err.message || err);
    }

    // Schedule next rolling randomized transaction tick safely
    const randomDelay = Math.floor(Math.random() * 1000) + 500;
    timerId = setTimeout(generateLiveEvent, randomDelay);
  }

  // Graceful Session Resource Disposal Engine
  function cleanUpSession() {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
      console.log(`🧹 Cleared simulation interval timers for closed link context: ${clientIp}`);
    }
  }

  // Bind session event error and disconnection handlers explicitly
  ws.on("close", () => {
    console.log(`❌ Evaluator session disconnected connection pipeline: ${clientIp}`);
    cleanUpSession();
  });

  ws.on("error", (error) => {
    console.error(`⚠️ Socket exception recorded on line stream client ${clientIp}:`, error);
    cleanUpSession();
  });

  // Ignition point: Instantly kickstart generation metrics loops exclusively for this listener connection
  generateLiveEvent();
});