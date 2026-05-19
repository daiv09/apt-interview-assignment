# 🚀 Apt Real-Time Order Dashboard

An enterprise-grade, real-time trading order dashboard powered by a simulated transaction engine. This project features a full-stack WebSocket architecture that streams order mutations (inserts, updates, and deletes) natively from a background simulator to a highly responsive, modern Next.js dashboard UI.

---

## 📸 Media Showcase & Demos

> [!NOTE]
> *User-provided media and video demonstration walkthroughs are hosted in this section.*

### 🖼️ UI Screenshots & Photos
*(Place your application screenshots or dashboard photos here to showcase the visual layout)*
- **Main Dashboard View:** `![Dashboard Main Overview](./public/dashboard-preview.png)`
- **Ledger Mutation Alert:** `![Toast Notification Alert](./public/toast-alert.png)`

### 🎥 Video Demonstration & Walkthrough
*(Embed or link your screen recording showing the real-time websocket updates and audio feedback here)*
- **Direct Video Link:** `[Watch the Walkthrough Video](./public/demo-walkthrough.mp4)`

---

## 🛠️ System Architecture

The project consists of two core components operating in tandem:

1. **The Order Simulation Engine (`simulator.js`):** A lightweight Node.js WebSocket server running on port `8080`. It generates simulated trading events (INSERT, UPDATE, DELETE) at random intervals (500ms – 1500ms) and broadcasts them to all connected frontend clients.
2. **The Order Dashboard UI (`app/page.tsx`):** A client-side Next.js dashboard utilizing React. It opens a persistent WebSocket connection to the simulator, processes the event pipeline, manages order state dynamically, and offers advanced analytics, search, filtering, and auditory feedback.
```mermaid
sequenceDiagram
    autonumber
    participant Simulator as 🚀 simulator.js (WS Server)
    participant Client as 🖥️ Dashboard Component (Next.js)
    participant User as 👤 End User

    Note over Simulator: Generates random order mutations<br/>(INSERT, UPDATE, DELETE) every 500ms - 1500ms
    Simulator->>Client: Broadcast JSON Message over WebSocket (ws://localhost:8080)
    
    activate Client
    Note over Client: onmessage handler catches payload,<br/>increments eventCount, & updates state
    
    par Section 1: Updates UI State Ledger
        Client->>Client: Recalculate useMemo() Metrics Board
        Client->>Client: Apply Search/Time Filters to Grid Table
        Client->>Client: Prepend item to Autonomous Audit Trail Feed
    and Section 2: Triggers User Feedback Pipeline
        Client->>User: Play AudioContext Synthesizer Chime
        Client->>User: Animate Sonner Toast Notification Card
    end
    deactivate Client
```

---

## ✨ Key Features

### 1. Real-Time Data Streaming & Resilient Pipeline
*   **Persistent WebSockets:** Establishes a native WebSocket connection on `ws://localhost:8080`.
*   **Automatic Reconnect Logic:** If the stream drops, the client automatically attempts reconnection within `200ms` (during initial load) or `1000ms` (during live operation), showing clear UI connection state warnings.

### 2. Metrics & Analytics Board
*   Four interactive summary cards displaying real-time aggregates:
    *   **Total Orders:** Full count of active items in the ledger.
    *   **Pending Pool:** Orders awaiting processing (Yellow card).
    *   **In Transit:** Shipped orders currently en route (Blue card).
    *   **Delivered Ledger:** Successfully completed deliveries (Green card).

### 3. Auditory Ledger Alerts (Sonic Branding)
The dashboard uses the browser’s native `AudioContext` API to generate distinct synthesizer alerts for each event type, giving operators immediate acoustic situational awareness:
*   🟢 **INSERT Events:** High-pitched chime (`800 Hz`, `120ms` duration) indicates new orders entering the pool.
*   🔵 **UPDATE Events:** Mid-pitched hum (`550 Hz`, `100ms` duration) signals status changes or transitions.
*   🔴 **DELETE Events:** Low-pitched drop (`300 Hz`, `150ms` duration) warns of order removals.

### 4. Advanced Live Filters & Search
*   **Status Filter Tabs:** Switch between showing All, Pending, Shipped, or Delivered orders instantly.
*   **Text Search Box:** Filter orders dynamically by Order ID, Customer Name, or Product Name.
*   **Time-Window Filter:** A dedicated input to filter records by their system update timestamp (e.g., `12:45`).

### 5. Autonomous Audit Trail Panel
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

### WebSocket Message Interface
```typescript
type WebSocketMessage = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new?: Order;
  old?: { id: number };
  timestamp?: string;
};
```

---

## ⚡ Getting Started & Running Locally

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) (v18 or higher recommended) installed.

### 2. Installation
Clone the repository and install the project dependencies:
```bash
npm install
```

### 3. Running the Project

You can run both the Next.js development server and the WebSocket trading simulator concurrently with a single command:
```bash
npm run dev:all
```

Alternatively, you can run them in separate terminal sessions:

*   **Start the WebSocket simulator:**
    ```bash
    node simulator.js
    ```
*   **Start the Next.js dashboard UI:**
    ```bash
    npm run dev
    ```

Once running:
*   Open [http://localhost:3000](http://localhost:3000) to view the live dashboard.
*   The simulator broadcasts to port `8080`.

---

## 📁 Repository Layout
```
├── app/
│   ├── layout.tsx     # Next.js Root Layout
│   └── page.tsx       # Real-Time Dashboard UI component
├── public/            # Static assets & media placeholder folder
├── simulator.js       # WebSocket Server & Trading Generator script
├── package.json       # Dependencies, scripts, and build configurations
└── README.md          # Project documentation (this file)
```
