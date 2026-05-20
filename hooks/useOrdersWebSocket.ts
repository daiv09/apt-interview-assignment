"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Order, AuditLog, HistoricalSnapshot, WebSocketMessage } from "@/lib/types";
import { WS_URL, TOAST_DISCONNECT_ID } from "@/lib/constants";
import { useAudioNotification } from "./useAudioNotification";

export function useOrdersWebSocket() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [chartHistory, setChartHistory] = useState<HistoricalSnapshot[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const { playNotificationSound } = useAudioNotification();

  const loadingRef = useRef(true);
  const socketRef = useRef<WebSocket | null>(null);
  const connectionStateRef = useRef<"connected" | "disconnected" | "reconnecting">("disconnected");

  // Keep refs for current state to avoid stale closures in the WebSocket handler
  const ordersRef = useRef(orders);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const connectWebSocket = useCallback(() => {
    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING) {
        return;
      }
      socketRef.current.close();
    }

    if (connectionStateRef.current === "reconnecting") {
      console.log("ℹ️ [WS] Pipeline backend offline. Retrying background line connection...");
    }

    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
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
        const payload = JSON.parse(event.data);
        const eventTime = payload.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        if (payload.type === "snapshot") {
          const snapshotOrders = (payload.orders || []) as Order[];
          setOrders(snapshotOrders);
          setLoading(false);
          loadingRef.current = false;

          const snapMetrics = {
            total: snapshotOrders.length,
            pending: snapshotOrders.filter((o) => o.status === "pending").length,
            shipped: snapshotOrders.filter((o) => o.status === "shipped").length,
            delivered: snapshotOrders.filter((o) => o.status === "delivered").length,
          };

          setChartHistory([
            {
              time: eventTime,
              "Total Orders": snapMetrics.total,
              "Pending Pool": snapMetrics.pending,
              "In Transit": snapMetrics.shipped,
              "Delivered Ledger": snapMetrics.delivered,
            }
          ]);
          return;
        }

        const typedPayload = payload as WebSocketMessage;
        const newOrder = typedPayload.new;
        const oldOrder = typedPayload.old;

        setEventCount((prev) => prev + 1);

        const currentOrders = ordersRef.current;
        let updatedOrders = [...currentOrders];
        let hasChanged = false;

        switch (typedPayload.eventType) {
          case "INSERT":
            if (newOrder && !currentOrders.some((o) => o.id === newOrder.id)) {
              updatedOrders = [newOrder, ...currentOrders];
              hasChanged = true;
              
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
              const exists = currentOrders.some((o) => o.id === newOrder.id);
              updatedOrders = exists
                ? currentOrders.map((o) => (o.id === newOrder.id ? newOrder : o))
                : [newOrder, ...currentOrders];
              hasChanged = true;

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
              updatedOrders = currentOrders.filter((o) => o.id !== oldOrder.id);
              hasChanged = true;

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

        if (hasChanged) {
          setOrders(updatedOrders);
          
          const nextMetrics = {
            total: updatedOrders.length,
            pending: updatedOrders.filter((o) => o.status === "pending").length,
            shipped: updatedOrders.filter((o) => o.status === "shipped").length,
            delivered: updatedOrders.filter((o) => o.status === "delivered").length,
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
        }

      } catch (err) {
        console.error("Error parsing real-time websocket event payload:", err);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      const retryDelay = loadingRef.current ? 200 : 2000;
      connectionStateRef.current = "reconnecting";
      setTimeout(() => connectWebSocket(), retryDelay);
    };

    socket.onerror = () => {
      // Intentionally empty no-op handler to suppress the unhandled browser network logging traces in next dev
    };
  }, [playNotificationSound]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, [connectWebSocket]);

  return {
    orders,
    auditLogs,
    chartHistory,
    isConnected,
    eventCount,
    loading,
  };
}