import { create } from 'zustand';
import { api, type LoginResult } from '@/services/api';
import { refreshSession } from '@/services/http';
import type { PublicUser } from '@/types';

/**
 * Autentifikatsiya holati. Tokenlar HttpOnly cookie'larda — JavaScript ularni
 * ko'rmaydi va saqlamaydi. Bu yerda faqat serverdan olingan ochiq profil ma'lumotlari.
 */
interface AuthState {
  user: PublicUser | null;
  status: 'idle' | 'loading' | 'ready';
  unread: number;
  init: () => Promise<void>;
  setUser: (user: PublicUser | null) => void;
  applyLogin: (res: LoginResult) => { mfaToken?: string };
  logout: () => Promise<void>;
  refreshUnread: () => Promise<void>;
}

const HINT_KEY = 'erizon-session-hint';

function setHint(on: boolean) {
  try {
    if (on) localStorage.setItem(HINT_KEY, '1');
    else localStorage.removeItem(HINT_KEY);
  } catch {
    /* e'tiborsiz */
  }
}

function hasHint(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return false;
  }
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  status: 'idle',
  unread: 0,
  init: async () => {
    if (get().status !== 'idle') return;
    set({ status: 'loading' });
    try {
      let { user } = await api.auth.me();
      // Access token muddati tugagan bo'lsa (15 daq), refresh token orqali jimgina yangilaymiz
      if (!user && hasHint() && (await refreshSession())) user = (await api.auth.me()).user;
      setHint(!!user);
      set({ user, status: 'ready' });
      if (user) void get().refreshUnread();
    } catch {
      set({ status: 'ready' });
    }
  },
  setUser: (user) => {
    setHint(!!user);
    set({ user, status: 'ready' });
    if (!user) set({ unread: 0 });
  },
  applyLogin: (res) => {
    if ('mfaRequired' in res) return { mfaToken: res.mfaToken };
    get().setUser(res.user);
    void get().refreshUnread();
    return {};
  },
  logout: async () => {
    try {
      await api.auth.logout();
    } finally {
      get().setUser(null);
    }
  },
  refreshUnread: async () => {
    if (!get().user) return;
    try {
      const r = await api.me.notifications();
      set({ unread: r.unread });
    } catch {
      /* e'tiborsiz */
    }
  },
}));

export function useCurrentUser(): PublicUser | null {
  return useAuthStore((s) => s.user);
}
