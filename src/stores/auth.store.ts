import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@/schemas/user.schema";
import type { LoginForm, TokenResponse, MeResponse } from "@/schemas/auth.schema";
import * as authService from "@/services/auth.service";

export type LoginResult =
  | { status: "authenticated" }
  | { status: "incomplete"; step: number; role: string };

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  /** Temp token used between multi-step registration steps. */
  tempToken: string | null;
  /** Which registration step to resume from (set after login with incomplete registration). */
  registrationStep: number | null;

  // Actions
  login: (data: LoginForm) => Promise<LoginResult>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setUser: (user: User | null) => void;
  setTokens: (tokens: TokenResponse) => Promise<void>;
  setTempToken: (token: string) => void;
  clearTempToken: () => void;
  clearRegistrationStep: () => void;
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
      registrationStep: null,

      login: async (data): Promise<LoginResult> => {
        set({ isLoading: true });
        try {
          const response = await authService.login(data);

          // Incomplete registration — backend returned a temp token with a step
          if ("temp_token" in response) {
            set({
              isLoading: false,
              tempToken: response.temp_token,
              registrationStep: response.registration_step ?? 2,
            });
            return {
              status: "incomplete",
              step: response.registration_step ?? 2,
              role: data.role,
            };
          }

          // Full login — fetch user identity
          const me = await authService.getMe(response.access_token);
          set({
            user: meToUser(me),
            isAuthenticated: true,
            isLoading: false,
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            tempToken: null,
            registrationStep: null,
          });
          return { status: "authenticated" };
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
          registrationStep: null,
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
            registrationStep: null,
          });
        } catch {
          set({
            isAuthenticated: true,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            tempToken: null,
            registrationStep: null,
          });
        }
      },

      setTempToken: (token) => set({ tempToken: token }),
      clearTempToken: () => set({ tempToken: null }),
      clearRegistrationStep: () => set({ registrationStep: null }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
