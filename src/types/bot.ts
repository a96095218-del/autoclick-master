export interface TokenSession {
  id: string;
  token: string;
  label: string;
  isRunning: boolean;
  wsCount: number;
  clickSpeed: number; // ms between clicks
  currentNano: number;
  totalEarned: number;
  clicks: number;
  clicksSinceCaptcha: number;
  captchaRequired: boolean;
  connectedWs: number;
  withdrawAddress: string;
  withdrawThreshold: number;
  autoWithdraw: boolean;
  lastWithdrawTime: number | null;
  referralCode: string;
}

export interface WebSocketMessage {
  type: 'init' | 'click' | 'stats' | 'online' | 'withdrawal' | 'leaderboard' | 'captcha';
  amount?: number;
  currentNano?: number;
  totalEarned?: number;
  clicks?: number;
  clicksSinceCaptcha?: number;
  captchaRequired?: boolean;
  stats?: {
    totalEarnedNano: number;
    totalClicks: number;
    onlineUsers: number;
  };
  session?: {
    currentNano: number;
    totalEarned: number;
    clicks: number;
    clicksSinceCaptcha: number;
    captchaRequired: boolean;
  };
  onlineUsers?: number;
  totalEarnedNano?: number;
  totalClicks?: number;
}

export interface GlobalStats {
  totalEarnedNano: number;
  totalClicks: number;
  onlineUsers: number;
  nanoPrice: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  tokenLabel: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}
