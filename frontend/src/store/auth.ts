import { signal, computed } from "@preact/signals";
import type { User, AuthState } from "../types";

// Auth state signal
export const authState = signal<AuthState>({
  user: null,
  loading: true,
  isAuthenticated: false,
});

// Computed values
export const currentUser = computed(() => authState.value.user);
export const isOwner = computed(() => authState.value.user?.role === "owner");
export const isAdmin = computed(() => authState.value.user?.role === "admin");
export const isAuthenticated = computed(() => authState.value.isAuthenticated);
export const isLoading = computed(() => authState.value.loading);

// Auth actions
export const authActions = {
  setUser: (user: User | null) => {
    authState.value = {
      user,
      loading: false,
      isAuthenticated: !!user,
    };
  },

  setLoading: (loading: boolean) => {
    authState.value = {
      ...authState.value,
      loading,
    };
  },

  logout: () => {
    authState.value = {
      user: null,
      loading: false,
      isAuthenticated: false,
    };
  },

  updateUser: (updates: Partial<User>) => {
    if (authState.value.user) {
      authState.value = {
        ...authState.value,
        user: {
          ...authState.value.user,
          ...updates,
        },
      };
    }
  },
};
