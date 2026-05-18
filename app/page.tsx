"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Order = {
  id: number;
  customer_name: string;
  product_name: string;
  status: "pending" | "shipped" | "delivered";
};

type WebSocketMessage = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new?: Order;
  old?: { id: number };
};

const statusColors: Record<Order["status"], string> = {
  pending: "bg-yellow-200 text-yellow-800",
  shipped: "bg-blue-200 text-blue-800",
  delivered: "bg-green-200 text-green-800"
};

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Synthesizes a clean audio chime without utilizing asset files
  const playNotificationSound = (frequency = 600, duration = 0.1) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Audio Context playback context initialization blocked by browser autoplay rules.", e);
    }
  };

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080");

    socket.onopen = () => {
      console.log("📡 WebSocket pipeline authenticated. Listening to transaction changes...");
      setLoading(false);
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as WebSocketMessage;
        const newOrder = payload.new;
        const oldOrder = payload.old;

        switch (payload.eventType) {
          case "INSERT":
            if (!newOrder) return;
            setOrders((prev) => [newOrder, ...prev]);

            // High pitch sound for new orders
            playNotificationSound(800, 0.12);
            toast.success(`New order #${newOrder.id} received`, {
              description: `${newOrder.customer_name} ordered ${newOrder.product_name}`,
            });
            break;

          case "UPDATE":
            if (!newOrder) return;
            setOrders((prev) => {
              // Fallback optimization: If item is missing due to a fresh app reload, append it to prevent lost data visibility
              const exists = prev.some((o) => o.id === newOrder.id);
              if (!exists) return [...prev, newOrder];
              return prev.map((o) => (o.id === newOrder.id ? newOrder : o));
            });

            // Mid pitch sound for lifecycle updates
            playNotificationSound(550, 0.1);
            toast.info(`Order #${newOrder.id} status changed`, {
              description: `Shifted to: ${newOrder.status.toUpperCase()}`,
            });
            break;

          case "DELETE":
            if (!oldOrder) return;
            setOrders((prev) => prev.filter((o) => o.id !== oldOrder.id));

            // Flat pitch drop for tracking removals
            playNotificationSound(300, 0.15);
            toast.warning(`Order record removed`, {
              description: `Order Track #${oldOrder.id} scrubbed from history`,
            });
            break;

          default:
            break;
        }
      } catch (err) {
        console.error("Error parsing real-time websocket event payload:", err);
      }
    };

    socket.onerror = (error) => {
      toast.error("WebSocket server connection failed.");
      console.error("🚨 REAL ERROR DETECTED:", error);
      setLoading(false);
    };

    socket.onclose = () => {
      console.log("📡 WebSocket connection stream dropped.");
    };

    return () => {
      socket.close();
    };
  }, []);

  const filteredOrders =
    activeFilter === "all"
      ? orders
      : orders.filter((o) => o.status === activeFilter);

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#FFFFFF] p-8 shadow-2xl">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Order Dashboard</h1>

      {/* View Segment Controllers */}
      <div className="mb-4 flex space-x-2">
        {["all", "pending", "shipped", "delivered"].map((status) => (
          <button
            key={status}
            onClick={() => setActiveFilter(status)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeFilter === status
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-800"
              }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-12 flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-indigo-600" size={48} />
          <p className="text-sm font-medium text-gray-500">Connecting to trade data systems...</p>
        </div>
      ) : (
        <div className="w-full max-w-4xl overflow-x-auto rounded-lg border border-gray-200 shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm font-medium text-gray-400">
                    No records actively match the current view criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                      #{order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                      {order.customer_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.product_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${statusColors[order.status] || "bg-gray-100 text-gray-800"}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}