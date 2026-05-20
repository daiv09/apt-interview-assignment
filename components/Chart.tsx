"use client";
import { useState, useEffect } from "react";
import { LineChart as ChartIcon, ChevronDown, ChevronUp } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { HistoricalSnapshot } from "../lib/types";

interface ChartProps {
    chartHistory: HistoricalSnapshot[];
    isExpanded: boolean;
    onToggle: () => void;
}

export default function Chart({ chartHistory, isExpanded, onToggle }: ChartProps) {
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    return (
        <section className="w-full max-w-4xl bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between focus:outline-none group text-left"
                aria-expanded={isExpanded}
            >
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2 group-hover:text-gray-700 transition-colors">
                    <ChartIcon size={16} className="text-indigo-600" />
                    Real-Time Volatility & Logistics Velocity Monitor
                </h2>
                <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </button>

            {/* Maintained in the background DOM when closed so data vectors stream fluidly */}
            <div
                className={`w-full transition-all duration-300 ease-in-out overflow-hidden ${
                    isExpanded ? "h-64 mt-4 opacity-100" : "h-0 opacity-0 pointer-events-none"
                }`}
                aria-hidden={!isExpanded}
            >
                {/* 
                  CRITICAL FIX: Explicitly wrap inside an absolute physical height block 
                  when expanded to ensure ResponsiveContainer calculates sizes perfectly.
                */}
                {hasMounted && chartHistory.length > 0 ? (
                    <div className="w-full h-64 min-h-[256px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} tickLine={false} />
                                <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "none" }}
                                    labelStyle={{ color: "#94a3b8", fontSize: "11px", fontWeight: "bold" }}
                                    itemStyle={{ fontSize: "12px", padding: "2px 0" }}
                                />
                                <Line type="monotone" dataKey="Total Orders" stroke="#0f172a" strokeWidth={2.5} dot={false} animationDuration={0} />
                                <Line type="monotone" dataKey="Pending Pool" stroke="#eab308" strokeWidth={2} dot={false} animationDuration={0} />
                                <Line type="monotone" dataKey="In Transit" stroke="#3b82f6" strokeWidth={2} dot={false} animationDuration={0} />
                                <Line type="monotone" dataKey="Delivered Ledger" stroke="#22c55e" strokeWidth={2} dot={false} animationDuration={0} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="w-full h-64 min-h-[256px] flex items-center justify-center border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                        <p className="text-xs text-gray-400 italic">Gathering operational trace points for trend tracking...</p>
                    </div>
                )}
            </div>
        </section>
    );
}