import { useEffect, useState, useCallback, useRef } from 'react';
import { botEngine } from '@/lib/bot-engine';
import { TokenSession, LogEntry } from '@/types/bot';

export function useBotSessions() {
  const [, setTick] = useState(0);
  
  useEffect(() => {
    return botEngine.subscribe(() => setTick(t => t + 1));
  }, []);

  return {
    sessions: botEngine.getSessions(),
    globalStats: botEngine.globalStats,
    totalClicks: botEngine.getTotalClicks(),
    totalEarned: botEngine.getTotalEarned(),
    progress: botEngine.getProgress(),
    addToken: botEngine.addToken.bind(botEngine),
    removeToken: botEngine.removeToken.bind(botEngine),
    updateTokenConfig: botEngine.updateTokenConfig.bind(botEngine),
    startToken: botEngine.startToken.bind(botEngine),
    stopToken: botEngine.stopToken.bind(botEngine),
    startAll: botEngine.startAll.bind(botEngine),
    stopAll: botEngine.stopAll.bind(botEngine),
    withdraw: botEngine.withdraw.bind(botEngine),
    withdrawAll: botEngine.withdrawAll.bind(botEngine),
    registerAccount: botEngine.registerAccount.bind(botEngine),
    forceRefresh: botEngine.forceRefresh.bind(botEngine),
    importTokens: botEngine.importTokens.bind(botEngine),
    removeAll: botEngine.removeAll.bind(botEngine),
    setAllWithdrawAddress: botEngine.setAllWithdrawAddress.bind(botEngine),
    setAllReferralCode: botEngine.setAllReferralCode.bind(botEngine),
  };
}

export function useBotLogs() {
  const [, setTick] = useState(0);
  useEffect(() => {
    return botEngine.subscribeLogs(() => setTick(t => t + 1));
  }, []);

  return botEngine.getLogs();
}
