import { create } from 'zustand';
import { UserProfile, AuthTokens } from '@stargate/shared';

interface AuthState {
  user: UserProfile | null;
  tokens: AuthTokens | null;
  setAuth: (user: UserProfile, tokens: AuthTokens) => void;
  clearAuth: () => void;
  updateUser: (user: UserProfile) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tokens: null,
  setAuth: (user, tokens) => {
    localStorage.setItem('refreshToken', tokens.refreshToken);
    set({ user, tokens });
  },
  clearAuth: () => {
    localStorage.removeItem('refreshToken');
    set({ user: null, tokens: null });
  },
  updateUser: (user) => set({ user }),
}));
