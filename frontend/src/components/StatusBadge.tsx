import { clsx } from "clsx";
import type { SafeStatus, TripStatus } from "../types";

interface StatusBadgeProps {
  status: SafeStatus | TripStatus | string;
  type?: "safe" | "trip";
  className?: string;
}

export default function StatusBadge({
  status,
  type = "safe",
  className,
}: StatusBadgeProps) {
  const getStatusConfig = () => {
    if (type === "safe") {
      switch (status as SafeStatus) {
        case "active":
          return {
            bg: "bg-green-100",
            text: "text-green-800",
            label: "Active",
          };
        case "inactive":
          return {
            bg: "bg-gray-100",
            text: "text-gray-800",
            label: "Inactive",
          };
        case "maintenance":
          return {
            bg: "bg-yellow-100",
            text: "text-yellow-800",
            label: "Maintenance",
          };
        case "error":
          return { bg: "bg-red-100", text: "text-red-800", label: "Error" };
        case "offline":
          return { bg: "bg-red-100", text: "text-red-800", label: "Offline" };
        default:
          return { bg: "bg-gray-100", text: "text-gray-800", label: status };
      }
    } else {
      switch (status as TripStatus) {
        case "pending":
          return { bg: "bg-blue-100", text: "text-blue-800", label: "Pending" };
        case "assigned":
          return {
            bg: "bg-purple-100",
            text: "text-purple-800",
            label: "Assigned",
          };
        case "in_transit":
          return {
            bg: "bg-yellow-100",
            text: "text-yellow-800",
            label: "In Transit",
          };
        case "delivered":
          return {
            bg: "bg-green-100",
            text: "text-green-800",
            label: "Delivered",
          };
        case "cancelled":
          return {
            bg: "bg-gray-100",
            text: "text-gray-800",
            label: "Cancelled",
          };
        case "failed":
          return { bg: "bg-red-100", text: "text-red-800", label: "Failed" };
        default:
          return { bg: "bg-gray-100", text: "text-gray-800", label: status };
      }
    }
  };

  const config = getStatusConfig();

  return (
    <span
      class={clsx(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.bg,
        config.text,
        className
      )}
    >
      {config.label}
    </span>
  );
}
