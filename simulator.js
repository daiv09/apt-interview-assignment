import EmbeddedPostgres from "embedded-postgres";
import { WebSocketServer, WebSocket } from "ws";
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const { Client, Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const PORT = process.env.PORT || 8080;

const CUSTOMERS = [
  "Amit Sharma", "Priya Patel",  "Rohan Das",
  "Sneha Reddy", "Vikram Singh", "Ananya Iyer",
  "Karan Mehta", "Divya Nair",  "Arjun Bose",
  "Pooja Rao",
];

const PRODUCTS = [
  "Wireless Mouse",    "Mechanical Keyboard", "Coffee Mug",
  "Leather Notebook",  "USB-C Cable",         "Desk Mat",
  "Monitor Stand",     "Webcam HD",           "Noise-Cancel Headphones",
  "Smart Pen",
];

const MAX_BACKOFF_MS = 30_000;
function computeBackoff(attempt) {
  const base    = Math.min(500 * Math.pow(2, attempt), MAX_BACKOFF_MS);
  const jitter  = Math.random() * 1000;
  return Math.min(base + jitter, MAX_BACKOFF_MS);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("────────────────────────────────────────────────────────────────");
  console.log("🚀  ENTERPRISE CDC ORDER ENGINE — BOOT SEQUENCE INITIATED");
  console.log("────────────────────────────────────────────────────────────────");

  console.log("⚙️    [1/4] Initialising embedded PostgreSQL cluster …");

  const databaseDir = path.join(__dirname, ".pg-data");
  const embeddedPg = new EmbeddedPostgres({
    databaseDir: databaseDir,
    user:        "postgres",
    password:    "password",
    port:        54321,
    persistent:  true,
  });

  const isAlreadyInitialised = fs.existsSync(path.join(databaseDir, "PG_VERSION"));

  if (!isAlreadyInitialised) {
    console.log("⚙️    No existing data cluster found. Initialising fresh repository...");
    await embeddedPg.initialise();
  } else {
    console.log("🔄   Existing database cluster detected. Bypassing redundant initialisation sequence.");
  }

  await embeddedPg.start();
  console.log("✅  Embedded PostgreSQL started on port 54321");

  const DATABASE_URL =
    process.env.DATABASE_URL ||
    `postgresql://postgres:password@localhost:54321/postgres`;

  console.log(`⚙️    [2/4] Active connection string resolved → ${DATABASE_URL}`);
  console.log("⚙️    [3/4] Applying schema via init.sql …");

  const initSql = fs.readFileSync(path.join(__dirname, "init.sql"), "utf8");

  const setupClient = new Client({ connectionString: DATABASE_URL });
  await setupClient.connect();
  await setupClient.query(initSql);
  await setupClient.end();

  console.log("✅  Schema applied: `orders` table and `check_order_mutation` trigger active");
  console.log("⚙️    [4/4] Bootstrapping shared pg.Pool for transactions …");

  const pool = new Pool({
    connectionString: DATABASE_URL,
    max:              10,
    idleTimeoutMillis: 30_000,
  });

  console.log("✅  pg.Pool initialised\n");
  console.log("────────────────────────────────────────────────────────────────");

  const connections = new Set();

  async function startListenClient(attempt = 0) {
    const listenClient = new Client({ connectionString: DATABASE_URL });

    try {
      await listenClient.connect();
      await listenClient.query("LISTEN order_updates;");

      if (attempt > 0) {
        console.log("🔄  [CDC] LISTEN client reconnected successfully after retry");
      } else {
        console.log("📡  [CDC] LISTEN client active — subscribed to channel: order_updates");
      }

      listenClient.on("notification", (msg) => {
        if (msg.channel !== "order_updates") return;

        let payload;
        try {
          payload = JSON.parse(msg.payload);
        } catch (parseErr) {
          console.error("⚠️  [CDC] Failed to parse Postgres notification payload:", parseErr.message);
          return;
        }

        let openCount = 0;
        connections.forEach((ws) => {
          if (ws.readyState === WebSocket.OPEN) openCount++;
        });

        const orderId = payload.new?.id ?? payload.old?.id ?? "—";
        console.log(
          `[CDC] Event: ${String(payload.eventType).padEnd(6)} | ` +
          `Order ID: #${String(orderId).padStart(4, "0")} | ` +
          `Clients: ${openCount}`
        );

        const serialised = JSON.stringify(payload);
        connections.forEach((ws) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(serialised);
          }
        });
      });

      listenClient.on("error", async (err) => {
        console.error("❌  [CDC] LISTEN client error:", err.message);
        try { await listenClient.end(); } catch (_) {}
        scheduleReconnect(attempt);
      });

      listenClient.on("end", () => {
        console.warn("⚠️  [CDC] LISTEN client connection ended unexpectedly");
        scheduleReconnect(attempt);
      });

    } catch (connectErr) {
      console.error(`❌  [CDC] LISTEN client failed to connect (attempt ${attempt + 1}):`, connectErr.message);
      scheduleReconnect(attempt);
    }
  }

  function scheduleReconnect(lastAttempt) {
    const delay = computeBackoff(lastAttempt + 1);
    console.log(`🔄  [CDC] Reconnecting LISTEN client in ${(delay / 1000).toFixed(1)}s …`);
    setTimeout(() => startListenClient(lastAttempt + 1), delay);
  }

  await startListenClient();

  const wss = new WebSocketServer({ port: Number(PORT), path: "/ws" });

  console.log(`\n🌐  [WSS] WebSocket server bound — ws://localhost:${PORT}/ws`);
  console.log("────────────────────────────────────────────────────────────────\n");

  wss.on("connection", async (ws, req) => {
    const clientIp = req.socket.remoteAddress || "unknown";
    console.log(`🔌  [WSS] Client connected from ${clientIp} | Pool size: ${connections.size + 1}`);

    connections.add(ws);

    try {
      const result = await pool.query("SELECT * FROM orders ORDER BY id ASC;");
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "snapshot", orders: result.rows }));
        console.log(`📦  [WSS] Snapshot delivered to ${clientIp}: ${result.rows.length} orders`);
      }
    } catch (snapErr) {
      console.error(`⚠️  [WSS] Snapshot query failed for ${clientIp}:`, snapErr.message);
    }

    ws.on("close", () => {
      connections.delete(ws);
      console.log(`❌  [WSS] Client disconnected: ${clientIp} | Remaining pool: ${connections.size}`);
    });

    ws.on("error", (err) => {
      connections.delete(ws);
      console.error(`⚠️  [WSS] Socket error on ${clientIp}:`, err.message);
    });
  });

  async function simulatorTick() {
    const roll = Math.random();

    try {
      if (roll < 0.40) {
        await pool.query(
          `INSERT INTO orders (customer_name, product_name, status)
           VALUES ($1, $2, 'pending')`,
          [pick(CUSTOMERS), pick(PRODUCTS)]
        );

      } else if (roll < 0.80) {
        await pool.query(`
          UPDATE orders
          SET status     = CASE
                             WHEN status = 'pending' THEN 'shipped'
                             WHEN status = 'shipped' THEN 'delivered'
                           END,
              updated_at = NOW()
          WHERE id = (
            SELECT id
            FROM   orders
            WHERE  status IN ('pending', 'shipped')
            ORDER  BY RANDOM()
            LIMIT  1
          )
        `);

      } else {
        await pool.query(`
          DELETE FROM orders
          WHERE id = (
            SELECT id
            FROM   orders
            WHERE  status = 'delivered'
            ORDER  BY RANDOM()
            LIMIT  1
          )
        `);
      }
    } catch (err) {
      if (!err.message.includes("no rows")) {
        console.warn("⚠️  [SIM] Tick error:", err.message);
      }
    }

    const delay = Math.floor(Math.random() * 1000) + 1000;
    setTimeout(simulatorTick, delay);
  }

  setTimeout(simulatorTick, 1500);
  console.log("🎲  [SIM] Order lifecycle simulator armed — first tick in 1.5 s\n");
}

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥  [PROCESS] Unhandled Promise Rejection at:", promise);
  console.error("    Reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("💥  [PROCESS] Uncaught Exception:", err.message);
});

main().catch((err) => {
  console.error("💥  [MAIN] Fatal boot error — aborting:", err);
  process.exit(1);
});