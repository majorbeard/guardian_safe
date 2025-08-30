import { signal } from "@preact/signals";
import type { AuthState, User } from "../types";

export const authState = signal<AuthState>({
  isAuthenticated: false,
  user: null,
  loading: true,
});

export const authActions = {
  setUser: (user: User) => {
    authState.value = {
      isAuthenticated: true,
      user,
      loading: false,
    };
  },

  logout: () => {
    authState.value = {
      isAuthenticated: false,
      user: null,
      loading: false,
    };
  },

  setLoading: (loading: boolean) => {
    authState.value = {
      ...authState.value,
      loading,
    };
  },
};
