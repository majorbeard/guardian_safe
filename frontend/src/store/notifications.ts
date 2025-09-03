import { signal } from "@preact/signals";

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  duration?: number;
}

export const toasts = signal<Toast[]>([]);

export const notificationActions = {
  addToast: (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    toasts.value = [...toasts.value, { ...toast, id }];
  },

  removeToast: (id: string) => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  },

  clearAll: () => {
    toasts.value = [];
  },

  success: (title: string, message: string, duration?: number) =>
    notificationActions.addToast({ type: "success", title, message, duration }),

  error: (title: string, message: string, duration?: number) =>
    notificationActions.addToast({ type: "error", title, message, duration }),

  warning: (title: string, message: string, duration?: number) =>
    notificationActions.addToast({ type: "warning", title, message, duration }),

  info: (title: string, message: string, duration?: number) =>
    notificationActions.addToast({ type: "info", title, message, duration }),
};
