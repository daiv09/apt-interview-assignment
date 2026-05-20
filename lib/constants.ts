import { Order } from "./types";

export const STATUS_COLORS: Record<Order["status"], string> = {
  pending: "bg-yellow-200 text-yellow-800",
  shipped: "bg-blue-200 text-blue-800",
  delivered: "bg-green-200 text-green-800",
};

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws";
export const TOAST_DISCONNECT_ID = "ws-disconnect-alert-id";
