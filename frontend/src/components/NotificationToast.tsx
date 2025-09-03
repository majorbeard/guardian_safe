import { useEffect, useState } from "preact/hooks";
import { X, CheckCircle, AlertTriangle, XCircle, Info } from "lucide-preact";

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

function ToastComponent({ toast, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(toast.id), 300);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const config = {
    success: {
      icon: CheckCircle,
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-800",
      iconColor: "text-green-400",
    },
    error: {
      icon: XCircle,
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-800",
      iconColor: "text-red-400",
    },
    warning: {
      icon: AlertTriangle,
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      textColor: "text-yellow-800",
      iconColor: "text-yellow-400",
    },
    info: {
      icon: Info,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-800",
      iconColor: "text-blue-400",
    },
  };

  const {
    icon: IconComponent,
    bgColor,
    borderColor,
    textColor,
    iconColor,
  } = config[toast.type];

  return (
    <div
      class={`transform transition-all duration-300 ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      } w-full max-w-md mx-auto`} // Changed to w-full max-w-md for proper sizing
    >
      <div
        class={`w-full ${bgColor} shadow-lg rounded-lg pointer-events-auto border ${borderColor}`} // Use w-full to ensure full width
      >
        <div class="p-4">
          {" "}
          {/* Removed min-w-full w-full, as parent handles width */}
          <div class="flex items-start">
            {" "}
            {/* Removed w-auto to allow natural width */}
            <div class="flex-shrink-0">
              <IconComponent class={`h-5 w-5 ${iconColor}`} />
            </div>
            <div class="ml-3 flex-1 pt-0.5">
              {" "}
              {/* Changed w-0 to flex-1 for growth */}
              <p class={`text-sm font-medium ${textColor}`}>{toast.title}</p>
              <p class={`mt-1 text-sm ${textColor.replace("800", "700")}`}>
                {toast.message}
              </p>
            </div>
            <div class="ml-4 flex-shrink-0 flex">
              <button
                class={`rounded-md inline-flex ${textColor} hover:${textColor.replace(
                  "800",
                  "500"
                )} focus:outline-none focus:ring-2 focus:ring-offset-2`}
                onClick={() => {
                  setIsVisible(false);
                  setIsVisible(false);
                  setTimeout(() => onClose(toast.id), 300);
                }}
              >
                <X class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Toast container component
interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div class="fixed top-0 right-0 z-50 p-6 space-y-4">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

// Toast hook for easy usage
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const clearAll = () => setToasts([]);

  return {
    toasts,
    addToast,
    removeToast,
    clearAll,
    success: (title: string, message: string, duration?: number) =>
      addToast({ type: "success", title, message, duration }),
    error: (title: string, message: string, duration?: number) =>
      addToast({ type: "error", title, message, duration }),
    warning: (title: string, message: string, duration?: number) =>
      addToast({ type: "warning", title, message, duration }),
    info: (title: string, message: string, duration?: number) =>
      addToast({ type: "info", title, message, duration }),
  };
}
