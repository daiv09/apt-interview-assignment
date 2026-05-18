import { WebSocketServer } from 'ws';

const customers = ['Amit Sharma', 'Priya Patel', 'Rohan Das', 'Sneha Reddy', 'Vikram Singh', 'Ananya Iyer'];
const products = ['Wireless Mouse', 'Mechanical Keyboard', 'Coffee Mug', 'Leather Notebook', 'USB-C Cable', 'Desk Mat'];
const statuses = ['pending', 'shipped', 'delivered'];

let mockIdCounter = 1001;

const wss = new WebSocketServer({ port: 8080 });
console.log("────────────────────────────────────────────────────────");
console.log("🚀 HIGH-FREQUENCY SIMULATED TRADING ENGINE BOOTED");
console.log("📡 Listening for frontend connections on ws://localhost:8080...");
console.log("────────────────────────────────────────────────────────\n");

const connectedClients = new Set();

wss.on('connection', (ws) => {
  console.log("🔌 Frontend connected successfully!");
  connectedClients.add(ws);

  ws.on('close', () => {
    console.log("❌ Frontend disconnected.");
    connectedClients.delete(ws);
  });
});

function generateLiveEvent() {
  try {
    const randomCustomer = customers[floor(Math.random() * customers.length)];
    const randomProduct = products[floor(Math.random() * products.length)];
    
    // Higher random weight for updates and creations to preserve and evolve table history
    let eventType = Math.random() > 0.4 ? "INSERT" : (Math.random() > 0.3 ? "UPDATE" : "DELETE");
    
    // Guard clause: If no IDs exist yet, force an INSERT to seed data safely
    if (mockIdCounter === 1001) {
      eventType = "INSERT";
    }

    let mockPayload = {};

    if (eventType === "INSERT") {
      mockPayload = {
        eventType,
        new: {
          id: mockIdCounter++,
          customer_name: randomCustomer,
          product_name: randomProduct,
          status: "pending"
        }
      };
    } else if (eventType === "UPDATE") {
      // Pick an existing active simulated order ID dynamically
      const targetId = floor(Math.random() * (mockIdCounter - 1001)) + 1001;
      mockPayload = {
        eventType,
        new: {
          id: targetId,
          customer_name: randomCustomer,
          product_name: randomProduct,
          status: statuses[floor(Math.random() * statuses.length)]
        }
      };
    } else {
      // Pick an existing order ID to clean/delete from view layout
      const targetId = floor(Math.random() * (mockIdCounter - 1001)) + 1001;
      mockPayload = {
        eventType,
        old: { id: targetId }
      };
    }

    const stringifiedPayload = JSON.stringify(mockPayload);
    connectedClients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(stringifiedPayload);
      }
    });

    console.log(`[BROADCAST] Event: ${eventType.padEnd(6)} | Target Order ID: #${mockPayload.new?.id || mockPayload.old?.id}`);

  } catch (err) {
    console.error("⚠️ Local Stream Exception caught:", err.message || err);
  }

  // Increased frequency: Generates variations rapidly every 0.5s to 1.5s
  const randomDelay = Math.floor(Math.random() * 1000) + 500;
  setTimeout(generateLiveEvent, randomDelay);
}

function floor(num) { 
  return Math.floor(num); 
}

generateLiveEvent();