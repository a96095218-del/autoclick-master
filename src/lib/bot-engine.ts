import { TokenSession, GlobalStats, LogEntry, WebSocketMessage } from '@/types/bot';

const STORAGE_KEY = 'nano_bot_sessions';
const GOAL_CLICKS = 10_000_000;

type Listener = () => void;

class NanoBotEngine {
  private sessions: Map<string, TokenSession> = new Map();
  private wsConnections: Map<string, WebSocket[]> = new Map();
  private clickIntervals: Map<string, NodeJS.Timeout[]> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout[]> = new Map();
  private listeners: Set<Listener> = new Set();
  private logs: LogEntry[] = [];
  private logListeners: Set<Listener> = new Set();

  // Bulk register state
  private _bulkRegisterRunning = false;
  private _bulkRegisterStop = false;
  private _bulkRegistered = 0;
  private _bulkFailed = 0;
  private _bulkTotal = 0;
  
  public globalStats: GlobalStats = {
    totalEarnedNano: 0,
    totalClicks: 0,
    onlineUsers: 0,
    nanoPrice: 0,
  };

  constructor() {
    this.loadFromStorage();
    this.fetchNanoPrice();
    setInterval(() => this.fetchNanoPrice(), 30000);
  }

  private async fetchNanoPrice() {
    try {
      const res = await fetch('https://data.nanswap.com/nano-price');
      const price = await res.text();
      this.globalStats.nanoPrice = parseFloat(price);
      this.notify();
    } catch {}
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  subscribeLogs(listener: Listener) {
    this.logListeners.add(listener);
    return () => { this.logListeners.delete(listener); };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  private notifyLogs() {
    this.logListeners.forEach(l => l());
  }

  private addLog(tokenLabel: string, message: string, type: LogEntry['type'] = 'info') {
    this.logs.unshift({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      tokenLabel,
      message,
      type,
    });
    if (this.logs.length > 200) this.logs.length = 200;
    this.notifyLogs();
  }

  getLogs() { return this.logs; }

  getSessions(): TokenSession[] {
    return Array.from(this.sessions.values());
  }

  getSession(id: string): TokenSession | undefined {
    return this.sessions.get(id);
  }

  getTotalClicks(): number {
    let total = 0;
    this.sessions.forEach(s => total += s.clicks);
    return total;
  }

  getTotalEarned(): number {
    let total = 0;
    this.sessions.forEach(s => total += s.totalEarned);
    return total;
  }

  getProgress(): number {
    return Math.min(this.getTotalClicks() / GOAL_CLICKS * 100, 100);
  }

  private saveToStorage() {
    const data = Array.from(this.sessions.values()).map(s => ({
      ...s,
      isRunning: false,
      connectedWs: 0,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data: TokenSession[] = JSON.parse(raw);
      data.forEach(s => {
        s.isRunning = false;
        s.connectedWs = 0;
        this.sessions.set(s.id, s);
      });
    } catch {}
  }

  addToken(token: string, label?: string, referralCode?: string): TokenSession {
    const id = crypto.randomUUID();
    const session: TokenSession = {
      id,
      token,
      label: label || `Token-${this.sessions.size + 1}`,
      isRunning: false,
      wsCount: 3,
      clickSpeed: 100,
      currentNano: 0,
      totalEarned: 0,
      clicks: 0,
      clicksSinceCaptcha: 0,
      captchaRequired: false,
      connectedWs: 0,
      withdrawAddress: '',
      withdrawThreshold: 500,
      autoWithdraw: false,
      lastWithdrawTime: null,
      referralCode: referralCode || '',
    };
    this.sessions.set(id, session);
    this.saveToStorage();
    this.notify();
    this.addLog(session.label, 'Token added', 'success');
    return session;
  }

  removeToken(id: string) {
    this.stopToken(id);
    const s = this.sessions.get(id);
    if (s) this.addLog(s.label, 'Token removed', 'warning');
    this.sessions.delete(id);
    this.saveToStorage();
    this.notify();
  }

  updateTokenConfig(id: string, updates: Partial<Pick<TokenSession, 'wsCount' | 'clickSpeed' | 'withdrawAddress' | 'withdrawThreshold' | 'autoWithdraw' | 'label'>>) {
    const session = this.sessions.get(id);
    if (!session) return;
    Object.assign(session, updates);
    this.saveToStorage();
    this.notify();
  }

  startToken(id: string) {
    const session = this.sessions.get(id);
    if (!session || session.isRunning) return;

    session.isRunning = true;
    this.addLog(session.label, `Starting ${session.wsCount} WebSocket connections...`, 'info');

    const connections: WebSocket[] = [];
    const intervals: NodeJS.Timeout[] = [];
    const reconnects: NodeJS.Timeout[] = [];

    for (let i = 0; i < session.wsCount; i++) {
      this.connectWs(session, i, connections, intervals, reconnects);
    }

    this.wsConnections.set(id, connections);
    this.clickIntervals.set(id, intervals);
    this.reconnectTimeouts.set(id, reconnects);
    this.saveToStorage();
    this.notify();
  }

  private connectWs(
    session: TokenSession,
    index: number,
    connections: WebSocket[],
    intervals: NodeJS.Timeout[],
    reconnects: NodeJS.Timeout[]
  ) {
    if (!session.isRunning) return;
    
    const ws = new WebSocket(`wss://api.thenanobutton.com/ws?token=${session.token}`);
    connections[index] = ws;

    ws.onopen = () => {
      session.connectedWs = connections.filter(w => w?.readyState === WebSocket.OPEN).length;
      this.addLog(session.label, `WS #${index + 1} connected`, 'success');
      this.notify();

      // Start clicking - send probe click even during captcha to detect when it's cleared
      const interval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('c');
        }
      }, session.captchaRequired ? 5000 : session.clickSpeed);
      intervals[index] = interval;

      // When captcha state changes, restart interval with appropriate speed
      const checkCaptchaChange = setInterval(() => {
        if (intervals[index] !== interval) { clearInterval(checkCaptchaChange); return; }
        const currentIsCaptcha = session.captchaRequired;
        const currentSpeed = currentIsCaptcha ? 5000 : session.clickSpeed;
        // Restart interval if speed needs to change
        clearInterval(intervals[index]);
        const newInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('c');
          }
        }, currentSpeed);
        intervals[index] = newInterval;
      }, 3000);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WebSocketMessage = JSON.parse(event.data);
        
        if (msg.type === 'init' && msg.session) {
          session.currentNano = msg.session.currentNano;
          session.totalEarned = msg.session.totalEarned;
          session.clicks = msg.session.clicks;
          session.clicksSinceCaptcha = msg.session.clicksSinceCaptcha;
          session.captchaRequired = msg.session.captchaRequired;
          if (msg.stats) {
            this.globalStats.totalEarnedNano = msg.stats.totalEarnedNano;
            this.globalStats.totalClicks = msg.stats.totalClicks;
            this.globalStats.onlineUsers = msg.stats.onlineUsers;
          }
        } else if (msg.type === 'click') {
          session.currentNano = msg.currentNano || session.currentNano;
          session.totalEarned = msg.totalEarned || session.totalEarned;
          session.clicksSinceCaptcha = msg.clicksSinceCaptcha || session.clicksSinceCaptcha;
          const wasCaptcha = session.captchaRequired;
          session.captchaRequired = msg.captchaRequired || false;
          session.clicks++;
          
          // Log captcha state changes
          if (session.captchaRequired && !wasCaptcha) {
            this.addLog(session.label, '🛑 CAPTCHA required! Clicking paused. Solve at thenanobutton.com', 'error');
          } else if (!session.captchaRequired && wasCaptcha) {
            this.addLog(session.label, '✅ Captcha cleared! Clicking resumed.', 'success');
          }
          
          // Auto-withdraw check
          if (session.autoWithdraw && session.withdrawAddress && session.currentNano >= session.withdrawThreshold) {
            this.withdraw(session.id);
          }
        } else if (msg.type === 'stats') {
          if (msg.totalEarnedNano) this.globalStats.totalEarnedNano = msg.totalEarnedNano;
          if (msg.totalClicks) this.globalStats.totalClicks = msg.totalClicks;
          if (msg.onlineUsers) this.globalStats.onlineUsers = msg.onlineUsers;
        } else if (msg.type === 'online') {
          if (msg.onlineUsers) this.globalStats.onlineUsers = msg.onlineUsers;
        }
        
        this.saveToStorage();
        this.notify();
      } catch {}
    };

    ws.onclose = () => {
      session.connectedWs = connections.filter(w => w?.readyState === WebSocket.OPEN).length;
      if (intervals[index]) clearInterval(intervals[index]);
      this.notify();

      // Auto-reconnect
      if (session.isRunning) {
        this.addLog(session.label, `WS #${index + 1} disconnected, reconnecting in 3s...`, 'warning');
        const timeout = setTimeout(() => {
          if (session.isRunning) {
            this.connectWs(session, index, connections, intervals, reconnects);
          }
        }, 3000);
        reconnects.push(timeout);
      }
    };

    ws.onerror = () => {
      this.addLog(session.label, `WS #${index + 1} error`, 'error');
    };
  }

  stopToken(id: string) {
    const session = this.sessions.get(id);
    if (!session) return;

    session.isRunning = false;
    session.connectedWs = 0;

    const connections = this.wsConnections.get(id) || [];
    connections.forEach(ws => { try { ws?.close(); } catch {} });
    this.wsConnections.delete(id);

    const intervals = this.clickIntervals.get(id) || [];
    intervals.forEach(i => clearInterval(i));
    this.clickIntervals.delete(id);

    const reconnects = this.reconnectTimeouts.get(id) || [];
    reconnects.forEach(t => clearTimeout(t));
    this.reconnectTimeouts.delete(id);

    this.addLog(session.label, 'Stopped', 'warning');
    this.saveToStorage();
    this.notify();
  }

  startAll() {
    this.sessions.forEach(s => {
      if (!s.isRunning) this.startToken(s.id);
    });
  }

  stopAll() {
    this.sessions.forEach(s => {
      if (s.isRunning) this.stopToken(s.id);
    });
  }

  removeAll() {
    const ids = Array.from(this.sessions.keys());
    ids.forEach(id => this.removeToken(id));
    this.addLog('System', `🗑️ Removed all ${ids.length} tokens`, 'warning');
  }

  setAllWithdrawAddress(address: string) {
    this.sessions.forEach(s => {
      s.withdrawAddress = address;
      s.autoWithdraw = true;
    });
    this.saveToStorage();
    this.notify();
    this.addLog('System', `📬 Set WD address for all ${this.sessions.size} tokens`, 'success');
  }

  setAllReferralCode(code: string) {
    this.sessions.forEach(s => {
      s.referralCode = code;
    });
    this.saveToStorage();
    this.notify();
    this.addLog('System', `🔗 Set referral code "${code}" for all tokens`, 'success');
  }

  async withdraw(id: string, manual = false) {
    const session = this.sessions.get(id);
    if (!session) return;
    
    if (!session.withdrawAddress) {
      this.addLog(session.label, 'No withdraw address set!', 'error');
      return;
    }

    if (session.currentNano <= 0) {
      this.addLog(session.label, 'No balance to withdraw', 'warning');
      return;
    }

    try {
      const amount = session.currentNano;
      this.addLog(session.label, `Withdrawing ${amount} Nyano...`, 'info');
      
      const res = await fetch('https://api.thenanobutton.com/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: session.token,
          address: session.withdrawAddress,
          amount,
        }),
      });

      const data = await res.json();
      if (data.success) {
        session.currentNano = data.remaining;
        session.totalEarned = data.totalEarned;
        session.lastWithdrawTime = Date.now();
        this.addLog(session.label, `✓ ${data.message} TX: ${data.txHash?.slice(0, 16)}...`, 'success');
      } else {
        this.addLog(session.label, `Withdraw failed: ${data.message || 'Unknown error'}`, 'error');
      }
    } catch (e: any) {
      this.addLog(session.label, `Withdraw error: ${e.message}`, 'error');
    }

    this.saveToStorage();
    this.notify();
  }

  async withdrawAll() {
    const promises = Array.from(this.sessions.values())
      .filter(s => s.withdrawAddress && s.currentNano > 0)
      .map(s => this.withdraw(s.id, true));
    await Promise.allSettled(promises);
  }

  forceRefresh(id: string) {
    const session = this.sessions.get(id);
    if (!session) return;
    
    this.addLog(session.label, '🔄 Force refresh: reconnecting all WS & resetting captcha...', 'info');
    
    // Stop everything
    const wasRunning = session.isRunning;
    this.stopToken(id);
    
    // Reset captcha state
    session.captchaRequired = false;
    session.clicksSinceCaptcha = 0;
    this.saveToStorage();
    this.notify();
    
    // Restart if was running
    if (wasRunning) {
      setTimeout(() => this.startToken(id), 500);
    }
    
    this.addLog(session.label, '✅ Force refresh complete', 'success');
  }

  importTokens(tokensText: string, defaultAddress?: string) {
    const lines = tokensText.split(/[\n,]+/).map(l => l.trim()).filter(Boolean);
    let added = 0;
    for (const line of lines) {
      // Support format: "token" or "token label" or just UUID
      const parts = line.split(/\s+/);
      const token = parts[0];
      if (!token || token.length < 10) continue;
      
      // Skip if already exists
      const exists = Array.from(this.sessions.values()).some(s => s.token === token);
      if (exists) {
        this.addLog('System', `Token ${token.slice(0, 8)}... already exists, skipping`, 'warning');
        continue;
      }
      
      const label = parts[1] || `Import-${this.sessions.size + 1}`;
      const session = this.addToken(token, label);
      if (defaultAddress) {
        this.updateTokenConfig(session.id, { withdrawAddress: defaultAddress, autoWithdraw: true });
      }
      added++;
    }
    this.addLog('System', `📥 Imported ${added} tokens from ${lines.length} lines`, 'success');
    return added;
  }

  async registerAccount(referralCode?: string): Promise<string | null> {
    try {
      const ref = referralCode || '';
      const res = await fetch(`https://api.thenanobutton.com/api/session?ref=${ref}`);
      const data = await res.json();
      if (data.token) {
        this.addLog('System', `New account registered: ${data.token.slice(0, 8)}...`, 'success');
        return data.token;
      }
    } catch (e: any) {
      this.addLog('System', `Register failed: ${e.message}`, 'error');
    }
    return null;
  }

  // ============ BULK REGISTER ============
  async bulkRegister(count: number, options: { referralCode?: string; autoStart?: boolean; withdrawAddress?: string; delayMs?: number }) {
    if (this._bulkRegisterRunning) {
      this.addLog('System', 'Bulk register already running!', 'error');
      return;
    }

    const { referralCode, autoStart = true, withdrawAddress, delayMs = 300 } = options;
    this._bulkRegisterRunning = true;
    this._bulkRegisterStop = false;
    this._bulkRegistered = 0;
    this._bulkFailed = 0;
    this._bulkTotal = count;
    this.notify();

    this.addLog('System', `🚀 Bulk register: creating ${count} accounts...`, 'info');

    for (let i = 0; i < count && !this._bulkRegisterStop; i++) {
      try {
        const token = await this.registerAccount(referralCode);
        if (token) {
          const session = this.addToken(token, `Bulk-${this._bulkRegistered + 1}`, referralCode);
          if (withdrawAddress) {
            this.updateTokenConfig(session.id, { withdrawAddress, autoWithdraw: true });
          }
          if (autoStart) {
            this.startToken(session.id);
          }
          this._bulkRegistered++;
        } else {
          this._bulkFailed++;
        }
      } catch {
        this._bulkFailed++;
      }

      if ((i + 1) % 5 === 0) {
        this.addLog('System', `Progress: ${this._bulkRegistered} ok, ${this._bulkFailed} failed / ${count}`, 'info');
      }

      this.notify();
      await new Promise(r => setTimeout(r, delayMs));
    }

    this._bulkRegisterRunning = false;
    this.addLog('System', `✅ Bulk register done: ${this._bulkRegistered} success, ${this._bulkFailed} failed`, 'success');
    this.notify();
  }

  stopBulkRegister() {
    this._bulkRegisterStop = true;
    this.addLog('System', '⏹ Bulk register stopped', 'warning');
    this.notify();
  }

  getBulkRegisterState() {
    return {
      running: this._bulkRegisterRunning,
      registered: this._bulkRegistered,
      failed: this._bulkFailed,
      total: this._bulkTotal,
    };
  }
}

// Singleton
export const botEngine = new NanoBotEngine();
