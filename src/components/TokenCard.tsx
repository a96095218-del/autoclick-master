import { useState } from 'react';
import { useBotSessions } from '@/hooks/use-bot';
import { Play, Square, Plus, Trash2, Settings, Zap, Download, ChevronDown, ChevronUp } from 'lucide-react';

export function TokenCard({ sessionId }: { sessionId: string }) {
  const { sessions, startToken, stopToken, removeToken, updateTokenConfig, withdraw } = useBotSessions();
  const [expanded, setExpanded] = useState(false);
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return null;

  const statusColor = session.isRunning
    ? session.connectedWs > 0 ? 'bg-neon-green' : 'bg-neon-yellow'
    : 'bg-muted-foreground';

  return (
    <div className="border border-border rounded-lg bg-card p-4 hover:border-glow-green transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${statusColor} ${session.isRunning ? 'animate-pulse' : ''}`} />
          <h3 className="font-display font-semibold text-sm">{session.label}</h3>
          <span className="text-xs text-muted-foreground font-mono">
            {session.token.slice(0, 8)}...
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {session.isRunning ? (
            <button
              onClick={() => stopToken(session.id)}
              className="p-1.5 rounded bg-neon-red/10 text-neon-red hover:bg-neon-red/20 transition-colors"
              title="Stop"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => startToken(session.id)}
              className="p-1.5 rounded bg-neon-green/10 text-neon-green hover:bg-neon-green/20 transition-colors"
              title="Start"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => withdraw(session.id, true)}
            className="p-1.5 rounded bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 transition-colors"
            title="Withdraw"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => { if (confirm('Remove token?')) removeToken(session.id); }}
            className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            title="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-muted-foreground">Balance</span>
          <p className="text-neon-green font-semibold text-glow-green">{session.currentNano.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Earned</span>
          <p className="text-neon-cyan font-semibold">{session.totalEarned.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Clicks</span>
          <p className="font-semibold">{session.clicks.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-muted-foreground">WS</span>
          <p className={`font-semibold ${session.connectedWs > 0 ? 'text-neon-green' : 'text-muted-foreground'}`}>
            {session.connectedWs}/{session.wsCount}
          </p>
        </div>
      </div>

      {session.captchaRequired && (
        <div className="mt-2 text-xs text-neon-yellow bg-neon-yellow/10 px-2 py-1 rounded">
          ⚠️ Captcha required
        </div>
      )}

      {session.autoWithdraw && (
        <div className="mt-2 text-xs text-neon-cyan bg-neon-cyan/10 px-2 py-1 rounded">
          Auto-WD @ {session.withdrawThreshold} Nyano → {session.withdrawAddress.slice(0, 16)}...
        </div>
      )}

      {/* Expanded config */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Label</label>
              <input
                type="text"
                value={session.label}
                onChange={(e) => updateTokenConfig(session.id, { label: e.target.value })}
                className="w-full bg-muted border border-border rounded px-2 py-1 text-xs focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Click Speed (ms)</label>
              <input
                type="number"
                value={session.clickSpeed}
                onChange={(e) => updateTokenConfig(session.id, { clickSpeed: Math.max(10, parseInt(e.target.value) || 100) })}
                className="w-full bg-muted border border-border rounded px-2 py-1 text-xs focus:border-primary outline-none"
                min={10}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">WS Connections</label>
              <input
                type="number"
                value={session.wsCount}
                onChange={(e) => updateTokenConfig(session.id, { wsCount: Math.max(1, Math.min(10, parseInt(e.target.value) || 3)) })}
                className="w-full bg-muted border border-border rounded px-2 py-1 text-xs focus:border-primary outline-none"
                min={1}
                max={10}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">WD Threshold</label>
              <input
                type="number"
                value={session.withdrawThreshold}
                onChange={(e) => updateTokenConfig(session.id, { withdrawThreshold: parseInt(e.target.value) || 500 })}
                className="w-full bg-muted border border-border rounded px-2 py-1 text-xs focus:border-primary outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Withdraw Address</label>
            <input
              type="text"
              value={session.withdrawAddress}
              onChange={(e) => updateTokenConfig(session.id, { withdrawAddress: e.target.value })}
              placeholder="nano_..."
              className="w-full bg-muted border border-border rounded px-2 py-1 text-xs focus:border-primary outline-none font-mono"
            />
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={session.autoWithdraw}
              onChange={(e) => updateTokenConfig(session.id, { autoWithdraw: e.target.checked })}
              className="accent-neon-green"
            />
            <span>Auto-Withdraw</span>
          </label>
        </div>
      )}
    </div>
  );
}
