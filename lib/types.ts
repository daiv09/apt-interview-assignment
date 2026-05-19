export type Order = {
  id: number;
  customer_name: string;
  product_name: string;
  status: "pending" | "shipped" | "delivered";
  updated_at: string;
};

export type AuditLog = {
  timestamp: string;
  type: "INSERT" | "UPDATE" | "DELETE";
  details: string;
};

export type WebSocketMessage = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new?: Order;
  old?: { id: number };
  timestamp?: string;
};

export type HistoricalSnapshot = {
  time: string;
  "Total Orders": number;
  "Pending Pool": number;
  "In Transit": number;
  "Delivered Ledger": number;
};