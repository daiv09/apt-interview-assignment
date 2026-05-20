# 🚀 Apt Real-Time Order Dashboard

An enterprise-grade, real-time trading order dashboard powered by a **Change Data Capture (CDC) pipeline**. This project features a full-stack architecture where an embedded PostgreSQL instance serves as the single source of truth — order mutations are detected by database triggers, broadcast via `LISTEN/NOTIFY`, and relayed passively to a responsive Next.js dashboard over WebSockets.

---

## 🌐 Live Production Deployments

The full-stack application has been successfully decoupled and deployed across dedicated cloud infrastructure environments:

* **⚡ Frontend Dashboard (Hosted on Vercel):** [https://apt-interview-assignment.vercel.app/](https://apt-interview-assignment.vercel.app/)
* **📡 WebSocket Simulation Engine (Hosted on Render):** `wss://apt-interview-assignment.onrender.com`

> ### ⏳ Operational Note: Cold Starts
> Because the background trading simulator is hosted on **Render's Free Tier**, the server automatically container-sleeps during periods of inactivity. 
> 
> * **First Load Delay:** When opening the dashboard for the first time, please allow **50+ seconds** for the Render instance to wake up.
> * **Live Ignition:** Once active, the status indicator will flip to green (`● Connected`), and live transaction streams will instantly populate.

---

## 📸 Media Showcase & Demos

- **Main Dashboard View:** ![Dashboard Main Overview](./public/display/full-preview.png)
- **Closed Graph Dashboard:** ![Closed Graph View](./public/display/close-graph-full-preview.png)
- **Filtered Dashboard:** ![Filtered Data View](./public/display/filter-preview.png)
- **Disconnected Dashboard:** ![Disconnected Dashboard View](./public/display/disconnected-between-preview.png)

### 🎥 Video Demonstration & Walkthrough

<video src="./public/display/demo.mp4" width="100%" controls>
  Your browser does not support the video tag.
</video>

---

## 🛠️ System Architecture

The project is built on a three-layer CDC pipeline where the **WebSocket server acts purely as a passive relay** — it never manufactures mock data. Every event originates from a real PostgreSQL trigger.

### Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        simulator.js (Node.js)                         │
│                                                                       │
│  ┌─────────────────────┐    ┌──────────────────────────────────────┐  │
│  │  Embedded PostgreSQL │    │  Order Lifecycle Simulator (Section C)│ │
│  │  (embedded-postgres) │◄───│  INSERT 40% / UPDATE 40% / DELETE 20%│ │
│  │                      │    │  1000–2000ms jittered interval       │ │
│  │  ┌────────────────┐  │    └──────────────────────────────────────┘ │
│  │  │ orders table   │  │                                             │
│  │  │ + CDC trigger  │──┼──► pg_notify('order_updates', payload)      │
│  │  └────────────────┘  │              │                              │
│  └─────────────────────┘              │                              │
│                                        ▼                              │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  LISTEN Client (Section A) — Dedicated pg.Client                 │ │
│  │  Receives notifications → JSON parse → broadcast to WS clients   │ │
│  │  Auto-reconnect with exponential backoff (cap 30s)               │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                        │                              │
│                                        ▼                              │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  WebSocket Server (Section B) — ws://localhost:8080/ws           │ │
│  │  On connect: sends { type: "snapshot", orders: [...] }           │ │
│  │  On notify:  relays trigger payload to all open sockets          │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Next.js Dashboard (app/page.tsx) — http://localhost:3000             │
│  Receives snapshot on connect + live CDC deltas                       │
│  Renders metrics, order table, charts, audit trail                    │
└────────────────────────────────────────────────────────────────────────┘
```

### Sequence Flow

```mermaid
sequenceDiagram
    autonumber
    participant Sim as 🎲 Simulator Loop
    participant PG as 🐘 Embedded PostgreSQL
    participant Trigger as ⚡ CDC Trigger
    participant Listen as 📡 LISTEN Client
    participant WSS as 🌐 WebSocket Server
    participant UI as 🖥️ Dashboard (Next.js)

    Note over Sim: Runs every 1000–2000ms<br/>(randomised jitter)
    Sim->>PG: INSERT / UPDATE / DELETE via pg.Pool

    PG->>Trigger: AFTER ROW trigger fires
    Trigger->>Trigger: Build JSON payload (eventType, new/old, timestamp)
    Trigger->>PG: pg_notify('order_updates', payload)

    PG-->>Listen: Notification delivered on channel
    Listen->>Listen: JSON.parse(msg.payload)
    Listen->>WSS: Forward to all open connections

    WSS->>UI: WebSocket .send(payload)

    activate UI
    par State Updates
        UI->>UI: Apply INSERT / UPDATE / DELETE to order state
        UI->>UI: Recalculate metrics via useMemo()
        UI->>UI: Append to audit trail
    and User Feedback
        UI->>UI: Play AudioContext chime
        UI->>UI: Show Sonner toast notification
    end
    deactivate UI
```

### Key Design Principle

> **The WebSocket server is a passive relay.** It is strictly forbidden from manually broadcasting mock data. It only listens to the Postgres `LISTEN` notification pipe (`order_updates`) and forwards exactly what the database triggers emit. This ensures a true CDC architecture where the database is always the single source of truth.

---

## ⚡ Getting Started & Running Locally

### 1. Prerequisites

| Requirement | Minimum Version | Notes |
|---|---|---|
| **Node.js** | v18+ | Required for ESM module support |
| **npm** | v9+ | Comes bundled with Node.js |

> **No external PostgreSQL installation required.** The simulator uses [`embedded-postgres`](https://www.npmjs.com/package/embedded-postgres) which downloads and manages a real PostgreSQL binary automatically on first run.

### 2. Installation

Clone the repository and install all dependencies:

```bash
git clone https://github.com/your-repo/apt-assignment.git
cd apt-assignment
npm install
```

### 3. Environment Configuration (Optional)

Copy the example environment file:

```bash
cp .env.example .env.local
```

The default configuration works out of the box — the embedded PostgreSQL starts on port `54321` and the WebSocket server on port `8080`. You only need to edit `.env.local` if you want to:

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | *(embedded PG auto-configured)* | Override to use an external PostgreSQL instance |
| `PORT` | `8080` | WebSocket server port |
| `NEXT_PUBLIC_WS_URL` | *(auto-detected)* | Override frontend WebSocket endpoint for production |

### 4. Running the Project

#### One Command (Recommended)

Start both the Next.js frontend and the CDC simulator concurrently:

```bash
npm run dev:all
```

#### Separate Terminals (Alternative)

**Terminal 1 — CDC Simulator + Embedded PostgreSQL:**
```bash
node simulator.js
```

**Terminal 2 — Next.js Dashboard UI:**
```bash
npm run dev
```

### 5. What Happens When You Run It

Here is the exact boot sequence when you execute `npm run dev:all`:

#### Simulator Boot (`node simulator.js`)

```
Step 1 ─ Embedded PostgreSQL cluster initialises
         → Downloads PG binary on first run (~30s one-time)
         → Creates data directory at .pg-data/
         → Starts PostgreSQL on port 54321

Step 2 ─ Connection string resolved
         → Uses embedded instance (postgresql://postgres:password@localhost:54321/postgres)
         → Or falls back to DATABASE_URL env var if explicitly set

Step 3 ─ Schema applied (init.sql)
         → Creates `orders` table if not exists
         → Installs `notify_order_mutation()` trigger function
         → Binds `check_order_mutation` trigger (AFTER INSERT/UPDATE/DELETE)

Step 4 ─ Three subsystems start concurrently:

         [Section A] CDC LISTEN Client
         → Dedicated pg.Client subscribes to LISTEN order_updates
         → Parses every Postgres notification and broadcasts to WS clients
         → Auto-reconnects with exponential backoff (capped at 30s)

         [Section B] WebSocket Server
         → Binds on ws://localhost:8080/ws
         → On new client: queries SELECT * FROM orders and sends snapshot
         → Maintains active connections in a Set (auto-cleanup on disconnect)

         [Section C] Order Lifecycle Simulator
         → Fires every 1000–2000ms (randomised jitter)
         → 40% chance: INSERT new order (random customer + product, status=pending)
         → 40% chance: UPDATE a random pending/shipped order (advance status)
         → 20% chance: DELETE a random delivered order
```

#### Frontend Boot (`next dev`)

```
→ Next.js dev server starts on http://localhost:3000
→ Dashboard opens a WebSocket to ws://localhost:8080/ws
→ Receives initial snapshot: { type: "snapshot", orders: [...] }
→ Then receives live CDC deltas as the simulator mutates the database
→ Each delta is a trigger-emitted event: { eventType, new?, old?, timestamp }
```

#### Console Output (Example)

Once running, you'll see structured logs like:

```
────────────────────────────────────────────────────────────────
🚀  ENTERPRISE CDC ORDER ENGINE — BOOT SEQUENCE INITIATED
────────────────────────────────────────────────────────────────
⚙️   [1/4] Initialising embedded PostgreSQL cluster …
✅  Embedded PostgreSQL started on port 54321
⚙️   [2/4] Active connection string resolved → postgresql://...
⚙️   [3/4] Applying schema via init.sql …
✅  Schema applied: `orders` table and `check_order_mutation` trigger active
⚙️   [4/4] Bootstrapping shared pg.Pool for transactions …
✅  pg.Pool initialised

📡  [CDC] LISTEN client active — subscribed to channel: order_updates
🌐  [WSS] WebSocket server bound — ws://localhost:8080/ws
🎲  [SIM] Order lifecycle simulator armed — first tick in 1.5 s

🔌  [WSS] Client connected from ::1 | Pool size: 1
📦  [WSS] Snapshot delivered to ::1: 0 orders
[CDC] Event: INSERT | Order ID: #0001 | Clients: 1
[CDC] Event: INSERT | Order ID: #0002 | Clients: 1
[CDC] Event: UPDATE | Order ID: #0001 | Clients: 1
[CDC] Event: DELETE | Order ID: #0003 | Clients: 1
```

### 6. Accessing the Dashboard

Once both processes are running:

| Service | URL | Description |
|---|---|---|
| **Dashboard UI** | [http://localhost:3000](http://localhost:3000) | Live order dashboard |
| **WebSocket** | `ws://localhost:8080/ws` | Raw CDC stream endpoint |
| **Embedded PG** | `localhost:54321` | PostgreSQL (user: `postgres`, pass: `password`) |

---

## ✨ Key Features

### 1. Change Data Capture Pipeline
*   **Embedded PostgreSQL:** Zero external dependency — a full PostgreSQL binary runs inside the Node.js process via `embedded-postgres`.
*   **Database Triggers:** A PL/pgSQL function fires on every INSERT, UPDATE, and DELETE, assembling a JSON payload matching the frontend's exact WebSocket contract.
*   **LISTEN/NOTIFY:** The CDC core subscribes to the `order_updates` channel and passively relays database events to WebSocket clients.

### 2. Real-Time Data Streaming & Resilient Pipeline
*   **Initial Snapshot:** On connect, the server queries `SELECT * FROM orders` and delivers the full state as `{ type: "snapshot", orders: [...] }`.
*   **Live CDC Deltas:** After the snapshot, all database mutations are streamed as trigger-emitted events in real time.
*   **Automatic Reconnect Logic:** The LISTEN client reconnects with exponential backoff (capped at 30s). The frontend reconnects within `200ms` (initial) or `1000ms` (live operation).

### 3. Metrics & Analytics Board
*   Four interactive summary cards displaying real-time aggregates:
    *   **Total Orders:** Full count of active items in the ledger.
    *   **Pending Pool:** Orders awaiting processing (Yellow card).
    *   **In Transit:** Shipped orders currently en route (Blue card).
    *   **Delivered Ledger:** Successfully completed deliveries (Green card).

### 4. Auditory Ledger Alerts (Sonic Branding)
The dashboard uses the browser's native `AudioContext` API to generate distinct synthesizer alerts for each event type, giving operators immediate acoustic situational awareness:
*   🟢 **INSERT Events:** High-pitched chime (`800 Hz`, `120ms` duration) indicates new orders entering the pool.
*   🔵 **UPDATE Events:** Mid-pitched hum (`550 Hz`, `100ms` duration) signals status changes or transitions.
*   🔴 **DELETE Events:** Low-pitched drop (`300 Hz`, `150ms` duration) warns of order removals.

### 5. Advanced Live Filters & Search
*   **Status Filter Tabs:** Switch between showing All, Pending, Shipped, or Delivered orders instantly.
*   **Text Search Box:** Filter orders dynamically by Order ID, Customer Name, or Product Name.
*   **Time-Window Filter:** A dedicated input to filter records by their system update timestamp (e.g., `12:45`).

### 6. Autonomous Audit Trail Panel
*   A terminal-style console panel displaying a running audit log of the last 50 transactions.
*   Color-coded labels indicate the action type (`INSERT`, `UPDATE`, `DELETE`) with exact timestamps and descriptions.

---

## 🗃️ Data Schema Contracts

### Order Interface
```typescript
type Order = {
  id: number;
  customer_name: string;
  product_name: string;
  status: "pending" | "shipped" | "delivered";
  updated_at: string;
};
```

### WebSocket Message Interface (CDC Delta)
```typescript
type WebSocketMessage = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new?: Order;             // Present on INSERT and UPDATE
  old?: { id: number };    // Present on DELETE only
  timestamp?: string;      // ISO 8601 UTC string
};
```

### Snapshot Message (Initial Handshake)
```typescript
type SnapshotMessage = {
  type: "snapshot";
  orders: Order[];
};
```

### PostgreSQL Schema (init.sql)
```sql
CREATE TABLE IF NOT EXISTS orders (
  id            SERIAL        PRIMARY KEY,
  customer_name TEXT          NOT NULL,
  product_name  TEXT          NOT NULL,
  status        TEXT          NOT NULL CHECK (status IN ('pending', 'shipped', 'delivered')),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
```

---

## 📂 Available Scripts

| Script | Command | Description |
|---|---|---|
| **dev** | `npm run dev` | Start Next.js development server only |
| **dev:all** | `npm run dev:all` | Start both Next.js and the CDC simulator concurrently |
| **db:init** | `npm run db:init` | Apply `init.sql` to an external PostgreSQL via `$DATABASE_URL` |
| **build** | `npm run build` | Production build of the Next.js frontend |
| **start** | `npm run start` | Start the production Next.js server |
| **lint** | `npm run lint` | Run ESLint across the codebase |

---

## 📁 Repository Layout

```
apt-assignment/
├── app/
│   ├── globals.css        # Global styles and Tailwind base
│   ├── layout.tsx         # Next.js root layout
│   └── page.tsx           # Main dashboard UI component
├── components/
│   ├── Audit.tsx          # Audit trail panel component
│   ├── Chart.tsx          # Real-time analytics chart
│   ├── Filter.tsx         # Status filter tabs and search
│   ├── Metrics.tsx        # Summary metrics cards
│   └── OrderTable.tsx     # Live order data table
├── hooks/
│   ├── useOrdersWebSocket.ts   # WebSocket lifecycle management hook
│   └── useAudioNotification.ts # AudioContext synthesizer hook
├── lib/
│   ├── constants.ts       # App-wide constants and WS URL resolution
│   └── types.ts           # TypeScript type definitions
├── public/                # Static assets and media
│
│── init.sql               # PostgreSQL CDC schema (table + trigger)
│── simulator.js           # CDC pipeline: embedded PG + LISTEN relay + WS server
│── .env.example           # Environment variable template
├── package.json           # Dependencies, scripts, and configuration
└── README.md              # Project documentation (this file)
```

---

## 🔧 Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Database** | PostgreSQL (via `embedded-postgres`) | Embedded, zero-config relational store |
| **CDC Mechanism** | PL/pgSQL Triggers + `LISTEN/NOTIFY` | Row-level change data capture |
| **Backend** | Node.js + `pg` + `ws` | Database client, WebSocket server |
| **Frontend** | Next.js 16 + React 19 | Dashboard UI framework |
| **Styling** | Tailwind CSS 4 | Utility-first CSS |
| **Charts** | Recharts | Real-time analytics visualization |
| **Notifications** | Sonner | Toast notification system |
