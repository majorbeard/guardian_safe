import { signal, computed } from "@preact/signals";

interface MobileUser {
  id: string;
  username: string;
  driver_name?: string;
  safe_id: string;
  safe: {
    id: string;
    serial_number: string;
    status: string;
    battery_level: number;
    is_locked: boolean;
    tracking_device_id?: string;
  };
  is_active: boolean;
  created_at: string;
}

interface MobileAuthState {
  user: MobileUser | null;
  loading: boolean;
  isAuthenticated: boolean;
}

// Auth state signal
export const authState = signal<MobileAuthState>({
  user: null,
  loading: true,
  isAuthenticated: false,
});

// Computed values
export const currentUser = computed(() => authState.value.user);
export const currentSafe = computed(() => authState.value.user?.safe);
export const isAuthenticated = computed(() => authState.value.isAuthenticated);
export const isLoading = computed(() => authState.value.loading);

// Auth actions
export const authActions = {
  setUser: (user: MobileUser | null) => {
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

  updateUser: (updates: Partial<MobileUser>) => {
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
