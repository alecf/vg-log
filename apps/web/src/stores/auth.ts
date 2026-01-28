import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthUser {
  id: string;
  name: string;
  role: "parent" | "child";
  familyId: string;
}

interface AuthFamily {
  id: string;
  name: string;
  timezone: string;
}

interface AuthState {
  user: AuthUser | null;
  family: AuthFamily | null;
  isAuthenticated: boolean;
  usedInviteCodes: string[];
  login: (user: AuthUser, family: AuthFamily) => void;
  logout: () => void;
  markCodeAsUsed: (code: string) => void;
  isCodeUsed: (code: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      family: null,
      isAuthenticated: false,
      usedInviteCodes: [],
      login: (user, family) =>
        set({
          user,
          family,
          isAuthenticated: true,
        }),
      logout: () =>
        set({
          user: null,
          family: null,
          isAuthenticated: false,
        }),
      markCodeAsUsed: (code) =>
        set((state) => ({
          usedInviteCodes: state.usedInviteCodes.includes(code.toUpperCase())
            ? state.usedInviteCodes
            : [...state.usedInviteCodes, code.toUpperCase()],
        })),
      isCodeUsed: (code) => get().usedInviteCodes.includes(code.toUpperCase()),
    }),
    {
      name: "vg-log-auth",
    }
  )
);
