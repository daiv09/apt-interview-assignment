import { Order } from "@/lib/types";
import { STATUS_COLORS } from "@/lib/constants";

export function OrderTable({ filteredOrders }: { filteredOrders: Order[] }) {
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
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800"}`}>
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
