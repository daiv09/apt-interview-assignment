"use client";

import { useState, useMemo } from "react";
import { toast, Toaster } from "sonner";
import { Loader2, Radio, Activity } from "lucide-react";

import { useOrdersWebSocket } from "@/hooks/useOrdersWebSocket";
import { MetricsBoard } from "@/components/Metrics";
import { FilterControls } from "@/components/Filter";
import { OrderTable } from "@/components/OrderTable";
import { AuditConsole } from "@/components/Audit";
import Chart from "@/components/Chart";

export default function Dashboard() {
  const {
    orders,
    auditLogs,
    chartHistory,
    isConnected,
    eventCount,
    loading
  } = useOrdersWebSocket();

  // Local UI State
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [isGraphExpanded, setIsGraphExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeQuery, setTimeQuery] = useState("");

  // Centralized Aggregate Reduction Metrics Engine
  const metrics = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      shipped: orders.filter((o) => o.status === "shipped").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
    };
  }, [orders]);

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