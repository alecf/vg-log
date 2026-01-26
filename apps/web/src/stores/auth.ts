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
  login: (user: AuthUser, family: AuthFamily) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      family: null,
      isAuthenticated: false,
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
    }),
    {
      name: "vg-log-auth",
    }
  )
);
