'use client';

import { useEffect, useCallback, useRef } from 'react';
import { isAxiosError } from 'axios';
import { useAuth } from '@hooks/use-auth';
import { useAuthStore } from '@store/auth-store';
import { authApi } from '@infrastructure/api/auth-api';

const HEARTBEAT_INTERVAL_MS = 3 * 60 * 1000;
const HEARTBEAT_LEASE_REFRESH_MS = 20_000;
const HEARTBEAT_LEASE_MS = 75_000;

type HeartbeatLease = {
  tabId: string;
  expiresAt: number;
};

function logHeartbeatError(context: string, error: unknown) {
  console.error(`[heartbeat] ${context}`, error);
}

function isUnauthorizedHeartbeatError(error: unknown) {
  return isAxiosError(error) && error.response?.status === 401;
}

function generateTabId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseLease(raw: string | null): HeartbeatLease | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as HeartbeatLease;
    if (!parsed || typeof parsed.tabId !== 'string' || typeof parsed.expiresAt !== 'number') return null;
    return parsed;
  } catch (error) {
    logHeartbeatError('Falha ao interpretar lease do heartbeat.', error);
    return null;
  }
}

export function useHeartbeat(currentContent?: string) {
  const { user, loading } = useAuth();
  const userId = user?.id || null;
  const inFlightRef = useRef(false);
  const tabIdRef = useRef<string>(generateTabId());
  const isLeaderRef = useRef(false);
  const leaseKeyRef = useRef<string | null>(null);

  const claimLeadership = useCallback(() => {
    const leaseKey = leaseKeyRef.current;
    if (!leaseKey || typeof window === 'undefined') return true;

    try {
      const now = Date.now();
      const currentLease = parseLease(window.localStorage.getItem(leaseKey));
      const canClaim =
        !currentLease ||
        currentLease.expiresAt <= now ||
        currentLease.tabId === tabIdRef.current;

      if (!canClaim) {
        isLeaderRef.current = false;
        return false;
      }

      const nextLease: HeartbeatLease = {
        tabId: tabIdRef.current,
        expiresAt: now + HEARTBEAT_LEASE_MS,
      };
      window.localStorage.setItem(leaseKey, JSON.stringify(nextLease));

      const confirmedLease = parseLease(window.localStorage.getItem(leaseKey));
      const isLeader = confirmedLease?.tabId === tabIdRef.current;
      isLeaderRef.current = Boolean(isLeader);
      return Boolean(isLeader);
    } catch (error) {
      logHeartbeatError('Falha ao disputar lideranca do heartbeat.', error);
      isLeaderRef.current = true;
      return true;
    }
  }, []);

  const releaseLeadership = useCallback(() => {
    const leaseKey = leaseKeyRef.current;
    if (!leaseKey || typeof window === 'undefined') return;

    try {
      const currentLease = parseLease(window.localStorage.getItem(leaseKey));
      if (currentLease?.tabId === tabIdRef.current) {
        window.localStorage.removeItem(leaseKey);
      }
    } catch (error) {
      logHeartbeatError('Falha ao liberar lideranca do heartbeat.', error);
    } finally {
      isLeaderRef.current = false;
    }
  }, []);

  const sendHeartbeat = useCallback(async (content?: string) => {
    if (loading) return;
    if (!userId) return;
    if (document.visibilityState !== 'visible') return;
    if (!claimLeadership()) return;
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    try {
      await authApi.heartbeat({ currentContent: content });
    } catch (error) {
      if (isUnauthorizedHeartbeatError(error)) {
        releaseLeadership();
        await useAuthStore.getState().syncUser(true);
        return;
      }

      logHeartbeatError('Falha ao enviar heartbeat.', error);
    } finally {
      inFlightRef.current = false;
    }
  }, [claimLeadership, loading, releaseLeadership, userId]);

  useEffect(() => {
    if (loading) return;
    if (!userId) return;
    leaseKeyRef.current = `explorer:heartbeat-leader:${userId}`;
    const renewLeadership = () => {
      void claimLeadership();
    };
    renewLeadership();

    const leaseRenewInterval = window.setInterval(
      renewLeadership,
      HEARTBEAT_LEASE_REFRESH_MS,
    );

    const onStorageChange = (event: StorageEvent) => {
      const leaseKey = leaseKeyRef.current;
      if (!leaseKey || event.key !== leaseKey) return;
      const currentLease = parseLease(event.newValue);
      isLeaderRef.current = currentLease?.tabId === tabIdRef.current;
    };
    window.addEventListener('storage', onStorageChange);

    if (document.visibilityState === 'visible') {
      void sendHeartbeat(currentContent);
    }

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      renewLeadership();
      void sendHeartbeat(currentContent);
    };

    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void sendHeartbeat(currentContent);
    }, HEARTBEAT_INTERVAL_MS);

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('storage', onStorageChange);
      clearInterval(leaseRenewInterval);
      clearInterval(interval);
      releaseLeadership();
      leaseKeyRef.current = null;
    };
  }, [claimLeadership, currentContent, loading, releaseLeadership, sendHeartbeat, userId]);

  return { sendHeartbeat };
}
