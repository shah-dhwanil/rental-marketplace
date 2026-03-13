import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@/schemas/user.schema";
import type { LoginForm, TokenResponse, MeResponse } from "@/schemas/auth.schema";
import * as authService from "@/services/auth.service";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  /** Temp token used between multi-step registration steps. */
  tempToken: string | null;

  // Actions
  login: (data: LoginForm) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setUser: (user: User | null) => void;
  setTokens: (tokens: TokenResponse) => Promise<void>;
  setTempToken: (token: string) => void;
  clearTempToken: () => void;
}

/** Map the API's /auth/me response to the frontend User shape. */
function meToUser(me: MeResponse): User {
  const parts = me.name.trim().split(/\s+/);
  return {
    id: me.user_id,
    email: me.email_id,
    firstName: parts[0] ?? me.name,
    lastName: parts.slice(1).join(" ") || "",
    role: me.role as User["role"],
    addresses: [],
    emailVerified: false,
    phoneVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
      refreshToken: null,
      tempToken: null,

      login: async (data) => {
        set({ isLoading: true });
        try {
          const tokens = await authService.login(data);
          const me = await authService.getMe(tokens.access_token);
          set({
            user: meToUser(me),
            isAuthenticated: true,
            isLoading: false,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            tempToken: null,
          });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
          tempToken: null,
        });
      },

      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },

      /**
       * Called after a successful final registration step.
       * Stores tokens and fetches the full user identity.
       */
      setTokens: async (tokens) => {
        try {
          const me = await authService.getMe(tokens.access_token);
          set({
            user: meToUser(me),
            isAuthenticated: true,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            tempToken: null,
          });
        } catch {
          // Even if /me fails, store the tokens
          set({
            isAuthenticated: true,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            tempToken: null,
          });
        }
      },

      setTempToken: (token) => set({ tempToken: token }),
      clearTempToken: () => set({ tempToken: null }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
