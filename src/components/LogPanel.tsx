import { useBotLogs } from '@/hooks/use-bot';

export function LogPanel() {
  const logs = useBotLogs();

  const typeColors = {
    info: 'text-muted-foreground',
    success: 'text-neon-green',
    error: 'text-neon-red',
    warning: 'text-neon-yellow',
  };

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
        <span className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider">Live Log</span>
      </div>
      <div className="h-48 overflow-y-auto p-2 space-y-0.5 text-[11px] font-mono">
        {logs.length === 0 && (
          <p className="text-muted-foreground text-center py-8">No logs yet...</p>
        )}
        {logs.map(log => (
          <div key={log.id} className="flex gap-2 leading-relaxed">
            <span className="text-muted-foreground shrink-0">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            <span className="text-neon-cyan shrink-0">[{log.tokenLabel}]</span>
            <span className={typeColors[log.type]}>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
