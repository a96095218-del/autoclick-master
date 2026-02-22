import { useState } from 'react';
import { useBotSessions, useBotLogs } from '@/hooks/use-bot';
import { TokenCard } from '@/components/TokenCard';
import { LogPanel } from '@/components/LogPanel';
import { Play, Square, Plus, Download, Zap, Users, TrendingUp, Target, UserPlus, Upload, Trash2, Settings } from 'lucide-react';

const GOAL = 10_000_000;

const Index = () => {
  const {
    sessions, globalStats, totalClicks, totalEarned, progress,
    addToken, startAll, stopAll, withdrawAll, registerAccount, importTokens,
    removeAll, setAllWithdrawAddress, setAllReferralCode,
    bulkRegister, stopBulkRegister, bulkRegisterState,
  } = useBotSessions();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newToken, setNewToken] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newRef, setNewRef] = useState('');
  const [registerRef, setRegisterRef] = useState('');
  const [globalAddress, setGlobalAddress] = useState('');
  const [globalRef, setGlobalRef] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkRef, setBulkRef] = useState('');
  const [bulkAddress, setBulkAddress] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  const handleAddToken = () => {
    if (!newToken.trim()) return;
    addToken(newToken.trim(), newLabel.trim() || undefined, newRef.trim() || undefined);
    setNewToken('');
    setNewLabel('');
    setNewRef('');
    setShowAddModal(false);
  };

  const handleRegister = async () => {
    const token = await registerAccount(registerRef.trim() || undefined);
    if (token) {
      setNewToken(token);
      setShowAddModal(true);
    }
  };

  const handleImportFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.csv,.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      importTokens(text);
    };
    input.click();
  };


  const runningCount = sessions.filter(s => s.isRunning).length;
  const totalWs = sessions.reduce((a, s) => a + s.connectedWs, 0);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Zap className="w-6 h-6 text-neon-green" />
          <h1 className="font-display text-2xl font-bold text-glow-green">
            NanoBot <span className="text-neon-cyan">Manager</span>
          </h1>
        </div>
        <p className="text-xs text-muted-foreground font-mono">
          Auto-clicker for The Nano Button • {sessions.length} tokens • {runningCount} active • {totalWs} WS connections
        </p>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatBox icon={<Target className="w-4 h-4" />} label="Your Clicks" value={totalClicks.toLocaleString()} color="green" />
        <StatBox icon={<TrendingUp className="w-4 h-4" />} label="Your Earned" value={`Ӿ${totalEarned.toLocaleString()}`} color="cyan" />
        <StatBox icon={<Users className="w-4 h-4" />} label="Online" value={globalStats.onlineUsers.toLocaleString()} color="yellow" />
        <StatBox icon={<Zap className="w-4 h-4" />} label="Global Clicks" value={globalStats.totalClicks.toLocaleString()} color="purple" />
        <StatBox icon={<TrendingUp className="w-4 h-4" />} label="XNO Price" value={`$${globalStats.nanoPrice.toFixed(4)}`} color="cyan" />
      </div>

      {/* Progress Bar */}
      <div className="mb-6 border border-border rounded-lg bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground font-mono">Progress to 10M clicks</span>
          <span className="text-xs font-semibold text-neon-green">{progress.toFixed(2)}%</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-neon-green to-neon-cyan rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
          <span>{totalClicks.toLocaleString()}</span>
          <span>{GOAL.toLocaleString()}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neon-green/10 text-neon-green text-xs font-semibold hover:bg-neon-green/20 transition-colors border border-neon-green/20"
        >
          <Plus className="w-3.5 h-3.5" /> Add Token
        </button>
        <button
          onClick={handleRegister}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neon-purple/10 text-neon-purple text-xs font-semibold hover:bg-neon-purple/20 transition-colors border border-neon-purple/20"
        >
          <UserPlus className="w-3.5 h-3.5" /> Register 1
        </button>
        <button
          onClick={() => setShowBulkModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neon-purple/10 text-neon-purple text-xs font-semibold hover:bg-neon-purple/20 transition-colors border border-neon-purple/20"
        >
          <Users className="w-3.5 h-3.5" /> Bulk Register
        </button>
        <button
          onClick={startAll}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neon-green/10 text-neon-green text-xs font-semibold hover:bg-neon-green/20 transition-colors border border-neon-green/20"
        >
          <Play className="w-3.5 h-3.5" /> Start All
        </button>
        <button
          onClick={stopAll}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neon-red/10 text-neon-red text-xs font-semibold hover:bg-neon-red/20 transition-colors border border-neon-red/20"
        >
          <Square className="w-3.5 h-3.5" /> Stop All
        </button>
        <button
          onClick={handleImportFile}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neon-yellow/10 text-neon-yellow text-xs font-semibold hover:bg-neon-yellow/20 transition-colors border border-neon-yellow/20"
        >
          <Upload className="w-3.5 h-3.5" /> Import File
        </button>
        <button
          onClick={withdrawAll}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neon-cyan/10 text-neon-cyan text-xs font-semibold hover:bg-neon-cyan/20 transition-colors border border-neon-cyan/20"
        >
          <Download className="w-3.5 h-3.5" /> WD All
        </button>
        <button
          onClick={() => { if (confirm('Remove ALL tokens?')) removeAll(); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors border border-destructive/20"
        >
          <Trash2 className="w-3.5 h-3.5" /> Remove All
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-xs font-semibold hover:text-foreground transition-colors border border-border"
        >
          <Settings className="w-3.5 h-3.5" /> Settings
        </button>
      </div>

      {/* Global Settings */}
      {showSettings && (
        <div className="mb-6 border border-border rounded-lg bg-card p-4 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Global Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">WD Address (all tokens)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={globalAddress}
                  onChange={(e) => setGlobalAddress(e.target.value)}
                  placeholder="nano_..."
                  className="flex-1 bg-muted border border-border rounded px-2 py-1.5 text-xs focus:border-primary outline-none font-mono"
                />
                <button
                  onClick={() => { if (globalAddress.trim()) setAllWithdrawAddress(globalAddress.trim()); }}
                  className="px-3 py-1.5 rounded bg-neon-cyan/10 text-neon-cyan text-xs font-semibold hover:bg-neon-cyan/20 transition-colors"
                >
                  Set All
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Referral Code (all tokens)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={globalRef}
                  onChange={(e) => setGlobalRef(e.target.value)}
                  placeholder="CsXN2w"
                  className="flex-1 bg-muted border border-border rounded px-2 py-1.5 text-xs focus:border-primary outline-none"
                />
                <button
                  onClick={() => { if (globalRef.trim()) setAllReferralCode(globalRef.trim()); }}
                  className="px-3 py-1.5 rounded bg-neon-purple/10 text-neon-purple text-xs font-semibold hover:bg-neon-purple/20 transition-colors"
                >
                  Set All
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Register Ref</label>
              <input
                type="text"
                value={registerRef}
                onChange={(e) => setRegisterRef(e.target.value)}
                placeholder="CsXN2w"
                className="w-full bg-muted border border-border rounded px-2 py-1.5 text-xs focus:border-primary outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Token Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {sessions.length === 0 && (
          <div className="col-span-full text-center py-16 border border-dashed border-border rounded-lg">
            <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No tokens added yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add a token or register a new account to start clicking</p>
          </div>
        )}
        {sessions.map(s => (
          <TokenCard key={s.id} sessionId={s.id} />
        ))}
      </div>

      {/* Log Panel */}
      <LogPanel />

      {/* Add Token Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
            <h2 className="font-display font-bold text-lg mb-4 text-neon-green">Add Token</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Token (UUID)</label>
                <input
                  type="text"
                  value={newToken}
                  onChange={(e) => setNewToken(e.target.value)}
                  placeholder="ed491027-f565-4b6c-840d-91dd5a4b0be0"
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none font-mono"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Label (optional)</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="My Bot 1"
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Referral Code (optional)</label>
                <input
                  type="text"
                  value={newRef}
                  onChange={(e) => setNewRef(e.target.value)}
                  placeholder="CsXN2w"
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={handleAddToken}
                className="flex-1 py-2 rounded-lg bg-neon-green text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Add Token
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Register Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
            <h2 className="font-display font-bold text-lg mb-4 text-neon-purple">
              {bulkRegisterState.running ? '⏳ Registering...' : '🚀 Bulk Register'}
            </h2>

            {bulkRegisterState.running ? (
              <div className="space-y-4">
                <div className="text-sm text-center">
                  <span className="text-neon-green font-semibold">{bulkRegisterState.registered}</span>
                  <span className="text-muted-foreground"> success / </span>
                  <span className="text-neon-red font-semibold">{bulkRegisterState.failed}</span>
                  <span className="text-muted-foreground"> failed / </span>
                  <span className="font-semibold">{bulkRegisterState.total}</span>
                  <span className="text-muted-foreground"> total</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-neon-purple to-neon-cyan rounded-full transition-all"
                    style={{ width: `${((bulkRegisterState.registered + bulkRegisterState.failed) / bulkRegisterState.total) * 100}%` }}
                  />
                </div>
                <button
                  onClick={() => stopBulkRegister()}
                  className="w-full py-2 rounded-lg bg-neon-red/10 text-neon-red font-semibold text-sm hover:bg-neon-red/20 transition-colors"
                >
                  Stop
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Number of accounts (10-50)</label>
                  <input
                    type="number"
                    value={bulkCount}
                    onChange={(e) => setBulkCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 10)))}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
                    min={1} max={50}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Referral Code</label>
                  <input
                    type="text"
                    value={bulkRef}
                    onChange={(e) => setBulkRef(e.target.value)}
                    placeholder="CsXN2w"
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">WD Address (optional, auto-enable)</label>
                  <input
                    type="text"
                    value={bulkAddress}
                    onChange={(e) => setBulkAddress(e.target.value)}
                    placeholder="nano_..."
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none font-mono"
                  />
                </div>
                <div className="flex gap-2 mt-5">
                  <button
                    onClick={() => {
                      bulkRegister(bulkCount, {
                        referralCode: bulkRef.trim() || undefined,
                        autoStart: true,
                        withdrawAddress: bulkAddress.trim() || undefined,
                      });
                    }}
                    className="flex-1 py-2 rounded-lg bg-neon-purple text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
                  >
                    Start ({bulkCount} accounts)
                  </button>
                  <button
                    onClick={() => setShowBulkModal(false)}
                    className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!bulkRegisterState.running && (
              <button
                onClick={() => setShowBulkModal(false)}
                className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function StatBox({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    green: 'text-neon-green border-neon-green/20',
    cyan: 'text-neon-cyan border-neon-cyan/20',
    yellow: 'text-neon-yellow border-neon-yellow/20',
    purple: 'text-neon-purple border-neon-purple/20',
    red: 'text-neon-red border-neon-red/20',
  };

  return (
    <div className={`border rounded-lg bg-card p-3 ${colorMap[color] || ''}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={colorMap[color]?.split(' ')[0]}>{icon}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-sm font-semibold font-mono ${colorMap[color]?.split(' ')[0]}`}>{value}</p>
    </div>
  );
}

export default Index;
