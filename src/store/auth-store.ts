'use client';

import { create } from 'zustand';
import { authApi, type AuthUser } from '@infrastructure/api/auth-api';

const AUTH_SYNC_DEBOUNCE_MS = 10_000;
const AUTH_SYNC_INTERVAL_MS = 3 * 60 * 1_000;
const AUTH_GUEST_SYNC_INTERVAL_MS = 60_000;
const AUTH_UNSUBSCRIBE_GRACE_MS = 750;

export interface AuthState {
  readonly user: AuthUser | null;
  readonly loading: boolean;
}

export interface AuthActions {
  _setSnapshot: (next: AuthState) => void;
  syncUser: (force?: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

export type AuthSlice = AuthState & AuthActions;

let syncPromise: Promise<void> | null = null;
let lastSyncAt = 0;
let syncInterval: number | null = null;
let syncStarted = false;
let unsubscribeTimer: number | null = null;
let authChangedHandler: (() => void) | null = null;
let visibilityHandler: (() => void) | null = null;
let refCount = 0;

export const useAuthStore = create<AuthSlice>()((set, get) => ({
  user: null,
  loading: true,

  _setSnapshot(next: AuthState): void {
    const { user: cur, loading: curLoading } = get();

    const sameUser =
      cur?.id === next.user?.id &&
      cur?.email === next.user?.email &&
      cur?.email_confirmed_at === next.user?.email_confirmed_at &&
      cur?.app_metadata?.role === next.user?.app_metadata?.role &&
      cur?.user_metadata?.avatar_url === next.user?.user_metadata?.avatar_url &&
      cur?.user_metadata?.picture === next.user?.user_metadata?.picture &&
      cur?.user_metadata?.full_name === next.user?.user_metadata?.full_name &&
      cur?.user_metadata?.name === next.user?.user_metadata?.name;

    if (sameUser && curLoading === next.loading) return;

    set({ user: next.user, loading: next.loading });
  },

  async syncUser(force = false): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!force && Date.now() - lastSyncAt < AUTH_SYNC_DEBOUNCE_MS) return;

    if (syncPromise) {
      await syncPromise;
      return;
    }

    syncPromise = (async () => {
      try {
        const data = await authApi.me();
        get()._setSnapshot({ user: data.user ?? null, loading: false });
      } catch {
        get()._setSnapshot({ user: null, loading: false });
      } finally {
        lastSyncAt = Date.now();
        syncPromise = null;
      }
    })();

    await syncPromise;
  },

  async logout(): Promise<void> {
    await authApi.logout();
    get()._setSnapshot({ user: null, loading: false });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth:changed'));
    }
  },
}));

function startAuthSync(): void {
  if (syncStarted || typeof window === 'undefined') return;
  syncStarted = true;

  void useAuthStore.getState().syncUser(true);

  authChangedHandler = () => void useAuthStore.getState().syncUser(true);

  visibilityHandler = () => {
    if (document.visibilityState !== 'visible') return;
    const { user } = useAuthStore.getState();
    if (!user && Date.now() - lastSyncAt < AUTH_GUEST_SYNC_INTERVAL_MS) return;
    void useAuthStore.getState().syncUser();
  };

  window.addEventListener('auth:changed', authChangedHandler);
  window.addEventListener('focus', visibilityHandler);
  document.addEventListener('visibilitychange', visibilityHandler);

  syncInterval = window.setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (!useAuthStore.getState().user) return;
    void useAuthStore.getState().syncUser();
  }, AUTH_SYNC_INTERVAL_MS);
}

function stopAuthSync(): void {
  if (!syncStarted || typeof window === 'undefined') return;
  syncStarted = false;

  if (authChangedHandler) window.removeEventListener('auth:changed', authChangedHandler);
  if (visibilityHandler) {
    window.removeEventListener('focus', visibilityHandler);
    document.removeEventListener('visibilitychange', visibilityHandler);
  }
  if (syncInterval !== null) window.clearInterval(syncInterval);

  authChangedHandler = null;
  visibilityHandler = null;
  syncInterval = null;
}
export function subscribeAuthSync(): () => void {
  if (unsubscribeTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(unsubscribeTimer);
    unsubscribeTimer = null;
  }

  refCount++;
  startAuthSync();

  return () => {
    refCount--;
    if (refCount > 0) return;

    if (typeof window === 'undefined') {
      stopAuthSync();
      return;
    }

    unsubscribeTimer = window.setTimeout(() => {
      unsubscribeTimer = null;
      if (refCount === 0) stopAuthSync();
    }, AUTH_UNSUBSCRIBE_GRACE_MS);
  };
}
