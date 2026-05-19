import { Search, Clock } from "lucide-react";

interface FilterControlsProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  timeQuery: string;
  setTimeQuery: (v: string) => void;
  activeFilter: string;
  handleFilterChange: (v: string) => void;
}

export function FilterControls({
  searchQuery,
  setSearchQuery,
  timeQuery,
  setTimeQuery,
  activeFilter,
  handleFilterChange,
}: FilterControlsProps) {
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
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeFilter === status ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>
    </>
  );
}
