import { WebSocketServer } from "ws";

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

let mockIdCounter = 1001;

const wss = new WebSocketServer({ port: 8080 });
console.log("────────────────────────────────────────────────────────");
console.log("🚀 SIMULATED TRADING ORDER ENGINE BOOTED");
console.log("📡 Streaming live mutations natively down WebSocket clients...");
console.log("────────────────────────────────────────────────────────\n");

const connectedClients = new Set();

wss.on("connection", (ws) => {
  console.log("🔌 Frontend connected successfully!");
  connectedClients.add(ws);

  ws.on("close", () => {
    console.log("❌ Frontend disconnected.");
    connectedClients.delete(ws);
  });
});

function getTimestamp() {
  return new Date().toLocaleTimeString();
}

function generateLiveEvent() {
  try {
    const randomCustomer =
      customers[Math.floor(Math.random() * customers.length)];
    const randomProduct = products[Math.floor(Math.random() * products.length)];

    let eventType =
      Math.random() > 0.4
        ? "INSERT"
        : Math.random() > 0.3
          ? "UPDATE"
          : "DELETE";
    if (mockIdCounter === 1001) eventType = "INSERT";

    let mockPayload = { eventType, timestamp: getTimestamp() };

    if (eventType === "INSERT") {
      mockPayload.new = {
        id: mockIdCounter++,
        customer_name: randomCustomer,
        product_name: randomProduct,
        status: "pending",
        updated_at: getTimestamp(),
      };
    } else if (eventType === "UPDATE") {
      // Prevent running math operations on a zero-bound stack range window
      const range = mockIdCounter - 1001;
      const targetId =
        range > 0 ? Math.floor(Math.random() * range) + 1001 : 1001;

      mockPayload.new = {
        id: targetId,
        customer_name: randomCustomer,
        product_name: randomProduct,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        updated_at: getTimestamp(),
      };
    } else {
      const range = mockIdCounter - 1001;
      const targetId =
        range > 0 ? Math.floor(Math.random() * range) + 1001 : 1001;
      mockPayload.old = { id: targetId };
    }

    const stringifiedPayload = JSON.stringify(mockPayload);
    connectedClients.forEach((client) => {
      if (client.readyState === 1) {
        // 1 === WebSocket.OPEN
        client.send(stringifiedPayload);
      }
    });

    console.log(
      `[BROADCAST] ${eventType.padEnd(6)} | Order ID: #${mockPayload.new?.id || mockPayload.old?.id}`,
    );
  } catch (err) {
    console.error("⚠️ Local Stream Exception caught:", err.message || err);
  }

  const randomDelay = Math.floor(Math.random() * 1000) + 500;
  setTimeout(generateLiveEvent, randomDelay);
}

generateLiveEvent();
