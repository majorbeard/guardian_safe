import {
  X,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
} from "lucide-preact";
import { signal } from "@preact/signals";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export const toasts = signal<Toast[]>([]);

export const toast = {
  success: (message: string, duration = 5000) => {
    addToast({ type: "success", message, duration });
  },
  error: (message: string, duration = 7000) => {
    addToast({ type: "error", message, duration });
  },
  warning: (message: string, duration = 6000) => {
    addToast({ type: "warning", message, duration });
  },
  info: (message: string, duration = 5000) => {
    addToast({ type: "info", message, duration });
  },
};

function addToast(toast: Omit<Toast, "id">) {
  const id = crypto.randomUUID();
  const newToast = { ...toast, id };

  toasts.value = [...toasts.value, newToast];

  if (toast.duration) {
    setTimeout(() => removeToast(id), toast.duration);
  }
}

function removeToast(id: string) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

export function ToastContainer() {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md w-full pointer-events-none">
      {toasts.value.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastItem({ toast: toastItem }: { toast: Toast }) {
  const getIcon = () => {
    switch (toastItem.type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStyles = () => {
    switch (toastItem.type) {
      case "success":
        return "bg-green-50 border-green-200 text-green-800";
      case "error":
        return "bg-red-50 border-red-200 text-red-800";
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-800";
    }
  };

  return (
    <div
      className={`pointer-events-auto flex items-start p-4 rounded-lg border shadow-lg ${getStyles()} animate-slide-in`}
    >
      <div className="flex-shrink-0">{getIcon()}</div>
      <div className="ml-3 flex-1">
        <p className="text-sm font-medium">{toastItem.message}</p>
      </div>
      <button
        onClick={() => removeToast(toastItem.id)}
        className="ml-4 flex-shrink-0 text-current opacity-70 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
