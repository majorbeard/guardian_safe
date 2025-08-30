import { AlertTriangle, X, Info, CheckCircle, XCircle } from "lucide-preact";
import { clsx } from "clsx";
import type { Alert } from "../types";

interface AlertBannerProps {
  alert: Alert;
  onDismiss?: () => void;
  className?: string;
}

export default function AlertBanner({
  alert,
  onDismiss,
  className,
}: AlertBannerProps) {
  const severityConfig = {
    low: {
      bgColor: "bg-blue-50 border-blue-200",
      textColor: "text-blue-800",
      icon: Info,
      iconColor: "text-blue-400",
    },
    medium: {
      bgColor: "bg-yellow-50 border-yellow-200",
      textColor: "text-yellow-800",
      icon: AlertTriangle,
      iconColor: "text-yellow-400",
    },
    high: {
      bgColor: "bg-orange-50 border-orange-200",
      textColor: "text-orange-800",
      icon: AlertTriangle,
      iconColor: "text-orange-400",
    },
    critical: {
      bgColor: "bg-red-50 border-red-200",
      textColor: "text-red-800",
      icon: XCircle,
      iconColor: "text-red-400",
    },
  };

  const config = severityConfig[alert.severity];
  const IconComponent = config.icon;

  return (
    <div class={clsx("border rounded-lg p-4", config.bgColor, className)}>
      <div class="flex">
        <div class="flex-shrink-0">
          <IconComponent class={clsx("h-5 w-5", config.iconColor)} />
        </div>

        <div class="ml-3 flex-1">
          <div class={clsx("text-sm font-medium", config.textColor)}>
            {alert.type.replace("_", " ").toUpperCase()} - Safe {alert.safeId}
          </div>
          <div class={clsx("mt-1 text-sm", config.textColor)}>
            {alert.message}
          </div>
          <div class="mt-1 text-xs text-gray-500">
            {new Date(alert.timestamp).toLocaleString()}
          </div>
        </div>

        {onDismiss && (
          <div class="ml-auto pl-3">
            <div class="-mx-1.5 -my-1.5">
              <button
                onClick={onDismiss}
                class={clsx(
                  "inline-flex rounded-md p-1.5 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2",
                  config.textColor
                )}
              >
                <X class="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
