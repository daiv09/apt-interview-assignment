export function MetricsBoard({ metrics }: { metrics: { total: number; pending: number; shipped: number; delivered: number } }) {
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
