"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { toast, Toaster } from "sonner";
import {
  Loader2, Radio, Activity, History, Search, Clock
} from "lucide-react";
import Chart from "@/components/Chart";
import { Order, AuditLog, WebSocketMessage, HistoricalSnapshot } from "@/lib/types";

// ─── DATA CONTRACTS & CONFIGURATIONS ──────────────────────────────────────────

const statusColors: Record<Order["status"], string> = {
  pending: "bg-yellow-200 text-yellow-800",
  shipped: "bg-blue-200 text-blue-800",
  delivered: "bg-green-200 text-green-800",
};

const TOAST_DISCONNECT_ID = "ws-disconnect-alert-id";

// ─── MAIN DASHBOARD COMPONENT ────────────────────────────────────────────────

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [isGraphExpanded, setIsGraphExpanded] = useState(true);

  // Search and Filter Configurations
  const [searchQuery, setSearchQuery] = useState("");
  const [timeQuery, setTimeQuery] = useState("");

  // System Metric Indicators
  const [isConnected, setIsConnected] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [chartHistory, setChartHistory] = useState<HistoricalSnapshot[]>([]);

  // Deadlock Prevention References
  const loadingRef = useRef(true);
  const socketRef = useRef<WebSocket | null>(null);
  const connectionStateRef = useRef<"connected" | "disconnected" | "reconnecting">("disconnected");

  // Auditory System Feedback
  const playNotificationSound = useCallback((frequency = 600, duration = 0.1) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) { }
  }, []);

  // Centralized Aggregate Reduction Metrics Engine
  const metrics = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      shipped: orders.filter((o) => o.status === "shipped").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
    };
  }, [orders]);

  // WebSocket Connection Pipeline Handler
  const connectWebSocket = useCallback(() => {
    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING) {
        return;
      }
      socketRef.current.close();
    }

    const socket = new WebSocket("ws://localhost:8080");
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      setLoading(false);
      loadingRef.current = false;

      if (connectionStateRef.current !== "connected") {
        connectionStateRef.current = "connected";
        toast.dismiss(TOAST_DISCONNECT_ID);
        toast.success("Connected to trade data stream", {
          description: "Listening for real-time order ledger mutations...",
        });
      }
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as WebSocketMessage;
        const newOrder = payload.new;
        const oldOrder = payload.old;
        const eventTime = payload.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        setEventCount((prev) => prev + 1);

        setOrders((prevOrders) => {
          let updated = [...prevOrders];

          switch (payload.eventType) {
            case "INSERT":
              if (newOrder && !prevOrders.some((o) => o.id === newOrder.id)) {
                updated = [newOrder, ...prevOrders];
                playNotificationSound(800, 0.12);
                toast.success(`Order Created: #${newOrder.id}`, {
                  description: `${newOrder.customer_name} ordered ${newOrder.product_name}`,
                });
                setAuditLogs((prev) => [
                  { timestamp: eventTime, type: "INSERT", details: `Created Order #${newOrder.id} for ${newOrder.customer_name}` },
                  ...prev.slice(0, 49),
                ]);
              }
              break;

            case "UPDATE":
              if (newOrder) {
                const exists = prevOrders.some((o) => o.id === newOrder.id);
                updated = exists
                  ? prevOrders.map((o) => (o.id === newOrder.id ? newOrder : o))
                  : [newOrder, ...prevOrders];

                playNotificationSound(550, 0.1);
                toast.info(`Order Updated: #${newOrder.id}`, {
                  description: `Lifecycle advancement to status: ${newOrder.status.toUpperCase()}`,
                });
                setAuditLogs((prev) => [
                  { timestamp: eventTime, type: "UPDATE", details: `Updated Order #${newOrder.id} state to [${newOrder.status.toUpperCase()}]` },
                  ...prev.slice(0, 49),
                ]);
              }
              break;

            case "DELETE":
              if (oldOrder) {
                updated = prevOrders.filter((o) => o.id !== oldOrder.id);
                playNotificationSound(300, 0.15);
                toast.warning(`Order Removed: #${oldOrder.id}`, {
                  description: `Record scrubbed from current active execution ledger`,
                });
                setAuditLogs((prev) => [
                  { timestamp: eventTime, type: "DELETE", details: `Removed Order #${oldOrder.id} trace from layout grid` },
                  ...prev.slice(0, 49),
                ]);
              }
              break;
          }

          // Directly update time-series trends using precise functional execution paths
          const nextMetrics = {
            total: updated.length,
            pending: updated.filter((o) => o.status === "pending").length,
            shipped: updated.filter((o) => o.status === "shipped").length,
            delivered: updated.filter((o) => o.status === "delivered").length,
          };

          setChartHistory((prevHistory) => [
            ...prevHistory,
            {
              time: eventTime,
              "Total Orders": nextMetrics.total,
              "Pending Pool": nextMetrics.pending,
              "In Transit": nextMetrics.shipped,
              "Delivered Ledger": nextMetrics.delivered,
            }
          ].slice(-12));

          return updated;
        });

      } catch (err) {
        console.error("Error parsing real-time websocket event payload:", err);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      const retryDelay = loadingRef.current ? 200 : 1000;

      if (connectionStateRef.current === "connected") {
        connectionStateRef.current = "disconnected";
        toast.error("Stream connection dropped", {
          id: TOAST_DISCONNECT_ID,
          description: "Offline. Attempting background connection recovery...",
          duration: Infinity,
        });
      } else if (connectionStateRef.current === "disconnected") {
        connectionStateRef.current = "reconnecting";
        toast.error("Stream connection dropped", {
          id: TOAST_DISCONNECT_ID,
          description: `Re-verifying line connectivity in ${retryDelay}ms...`,
          duration: Infinity,
        });
      }

      setTimeout(() => connectWebSocket(), retryDelay);
    };
  }, [playNotificationSound]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, [connectWebSocket]);

  // Compute Active Search Matrix Selection Subsets
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = activeFilter === "all" || order.status === activeFilter;
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        order.id.toString().includes(searchLower) ||
        order.customer_name.toLowerCase().includes(searchLower) ||
        order.product_name.toLowerCase().includes(searchLower);

      const matchesTime = (order.updated_at || "").toLowerCase().includes(timeQuery.toLowerCase());
      return matchesStatus && matchesSearch && matchesTime;
    });
  }, [orders, activeFilter, searchQuery, timeQuery]);

  // HOISTED: Moved function declaration above the return statement to fix the ReferenceError
  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    toast(`Switched view criteria`, {
      description: `Showing orders matching: ${filter.toUpperCase()}`,
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#FFFFFF] p-8 shadow-2xl">

      {/* Dynamic Header Block */}
      <header className="w-full max-w-4xl flex flex-col items-center mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Dashboard</h1>
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-gray-600">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-indigo-600" />
            <span>Events Handled: <span className="font-bold text-gray-900">{eventCount}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Radio size={16} className={isConnected ? "text-green-600 animate-pulse" : "text-red-500"} />
            <span className={`font-semibold uppercase tracking-wider text-xs ${isConnected ? "text-green-600" : "text-red-500 animate-pulse"}`}>
              {isConnected ? "● Connected" : "● Offline / Reconnecting"}
            </span>
          </div>
        </div>
      </header>

      {/* Aggregate Statistics Matrix Panel */}
      <MetricsBoard metrics={metrics} />

      {/* Real-Time Analytics Graph Panel */}
      <Chart
        chartHistory={chartHistory}
        isExpanded={isGraphExpanded}
        onToggle={() => setIsGraphExpanded(!isGraphExpanded)}
      />

      {/* Advanced Filter Layout Module */}
      <FilterControls
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        timeQuery={timeQuery} setTimeQuery={setTimeQuery}
        activeFilter={activeFilter} handleFilterChange={handleFilterChange}
      />

      {/* Centralized Grid Section */}
      {loading ? (
        <div className="mt-12 flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-indigo-600" size={48} />
          <p className="text-sm font-medium text-gray-500">Connecting to trade data systems...</p>
        </div>
      ) : (
        <div className="w-full max-w-4xl space-y-6">
          <OrderTable filteredOrders={filteredOrders} />
          <AuditConsole auditLogs={auditLogs} />
        </div>
      )}

      <Toaster position="top-right" richColors />
    </div>
  );
}

// ─── MODULARIZED SUB-COMPONENTS ──────────────────────────────────────────────

function MetricsBoard({ metrics }: { metrics: { total: number; pending: number; shipped: number; delivered: number } }) {
  const layout = [
    { label: "Total Orders", val: metrics.total, borderColor: "border-gray-200", textColor: "text-slate-900" },
    { label: "Pending Pool", val: metrics.pending, borderColor: "border-yellow-200", textColor: "text-yellow-700" },
    { label: "In Transit", val: metrics.shipped, borderColor: "border-blue-200", textColor: "text-blue-700" },
    { label: "Delivered Ledger", val: metrics.delivered, borderColor: "border-green-200", textColor: "text-green-700" }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-4xl mb-6">
      {layout.map((card, idx) => (
        <div key={idx} className={`bg-white p-5 rounded-xl border ${card.borderColor} shadow-sm transition-all`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{card.label}</p>
          <p className={`text-2xl font-bold mt-1 font-mono ${card.textColor}`}>{card.val}</p>
        </div>
      ))}
    </div>
  );
}

function FilterControls({
  searchQuery, setSearchQuery,
  timeQuery, setTimeQuery,
  activeFilter, handleFilterChange
}: {
  searchQuery: string; setSearchQuery: (v: string) => void;
  timeQuery: string; setTimeQuery: (v: string) => void;
  activeFilter: string; handleFilterChange: (v: string) => void;
}) {
  return (
    <>
      <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID, customer name, item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
          />
        </div>
        <div className="relative">
          <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filter by time window (e.g. 12:45)..."
            value={timeQuery}
            onChange={(e) => setTimeQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
          />
        </div>
      </div>

      <div className="mb-4 flex space-x-2">
        {["all", "pending", "shipped", "delivered"].map((status) => (
          <button
            key={status}
            onClick={() => handleFilterChange(status)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeFilter === status ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800"
              }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>
    </>
  );
}

function OrderTable({ filteredOrders }: { filteredOrders: Order[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last System Update</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {filteredOrders.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-10 text-center text-sm font-medium text-gray-400">
                No records actively match the current view criteria.
              </td>
            </tr>
          ) : (
            filteredOrders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">#{order.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{order.customer_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{order.product_name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${statusColors[order.status] || "bg-gray-100 text-gray-800"}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-400 group-hover:text-gray-600 transition-colors">{order.updated_at}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function AuditConsole({ auditLogs }: { auditLogs: AuditLog[] }) {
  return (
    <div className="bg-slate-900 rounded-lg p-5 overflow-hidden shadow-xl border border-slate-800">
      <h3 className="text-slate-200 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
        <History size={14} className="text-amber-400" />
        Autonomous Transaction Log Feed (Audit Trail)
      </h3>

      <div className="h-40 overflow-y-auto font-mono text-xs space-y-1.5 text-left [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {auditLogs.length === 0 ? (
          <p className="text-slate-500 italic py-4">Awaiting WebSocket streaming updates pipeline activation...</p>
        ) : (
          auditLogs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-3 text-slate-300">
              <span className="text-slate-500 select-none">[{log.timestamp}]</span>
              <span className={`font-bold px-1 rounded text-[10px] ${log.type === "INSERT" ? "text-green-400 bg-green-950/50" :
                  log.type === "UPDATE" ? "text-blue-400 bg-blue-950/50" : "text-rose-400 bg-rose-950/50"
                }`}>
                {log.type}
              </span>
              <span className="text-slate-300 break-all">{log.details}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}