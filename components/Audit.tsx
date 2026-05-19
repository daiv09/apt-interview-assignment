import { History } from "lucide-react";
import { AuditLog } from "@/lib/types";

export function AuditConsole({ auditLogs }: { auditLogs: AuditLog[] }) {
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
