import type { SafeUpdate, Alert } from "../types";
import { realtimeActions } from "../store/realtime";
import { notificationActions } from "../store/notifications";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8080/ws";

export type WebSocketMessage = {
  type:
    | "heartbeat"
    | "safe_update"
    | "trip_update"
    | "alert"
    | "system_notification";
  data: any;
};

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: number | null = null;
  private isManualClose = false;

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    this.isManualClose = false;

    try {
      this.ws = new WebSocket(WS_URL);
      this.setupEventListeners();
    } catch (error) {
      console.error("WebSocket connection failed:", error);
      notificationActions.error(
        "Connection Failed",
        "Unable to connect to real-time updates"
      );
      this.handleReconnect();
    }
  }

  disconnect(): void {
    this.isManualClose = true;
    this.clearHeartbeat();

    if (this.ws) {
      this.ws.close(1000, "Manual disconnect");
      this.ws = null;
    }

    realtimeActions.setWsConnected(false);
  }

  send(message: any): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log("WebSocket connected");
      this.reconnectAttempts = 0;
      realtimeActions.setWsConnected(true);
      notificationActions.success("Connected", "Real-time updates active");
      this.startHeartbeat();
    };

    this.ws.onclose = (event) => {
      console.log("WebSocket disconnected:", event.code, event.reason);
      realtimeActions.setWsConnected(false);
      this.clearHeartbeat();

      if (!this.isManualClose && event.code !== 1000) {
        notificationActions.warning(
          "Connection Lost",
          "Attempting to reconnect..."
        );
        this.handleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      realtimeActions.setWsConnected(false);
      notificationActions.error(
        "Connection Error",
        "Real-time updates interrupted"
      );
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case "safe_update":
        this.handleSafeUpdate(message.data);
        break;

      case "trip_update":
        this.handleTripUpdate(message.data);
        break;

      case "alert":
        this.handleAlert(message.data);
        break;

      case "system_notification":
        this.handleSystemNotification(message.data);
        break;

      case "heartbeat":
        // Respond to heartbeat
        this.send({ type: "heartbeat_response", timestamp: new Date() });
        break;

      default:
        console.log("Unknown WebSocket message type:", message.type);
    }
  }

  private handleSafeUpdate(update: SafeUpdate): void {
    realtimeActions.updateSafe(update);

    // Check for critical conditions and show notifications
    if (update.batteryLevel !== undefined && update.batteryLevel < 10) {
      const alert = {
        id: `battery_${update.safeId}_${Date.now()}`,
        type: "battery_low" as const,
        safeId: update.safeId,
        message: `Critical battery level: ${update.batteryLevel}%`,
        timestamp: new Date(),
        acknowledged: false,
        severity: "critical" as const,
      };
      realtimeActions.addAlert(alert);
      notificationActions.error(
        "Critical Battery Alert",
        `Safe ${update.safeId} battery at ${update.batteryLevel}%`
      );
    }

    if (update.isTampered === true) {
      const alert = {
        id: `tamper_${update.safeId}_${Date.now()}`,
        type: "tamper" as const,
        safeId: update.safeId,
        message: "Tampering detected!",
        timestamp: new Date(),
        acknowledged: false,
        severity: "critical" as const,
      };
      realtimeActions.addAlert(alert);
      notificationActions.error(
        "Security Alert",
        `Tampering detected on Safe ${update.safeId}!`
      );
    }

    if (update.status === "offline") {
      notificationActions.warning(
        "Safe Offline",
        `Safe ${update.safeId} has gone offline`
      );
    }

    if (
      update.status === "active" &&
      update.batteryLevel &&
      update.batteryLevel > 20
    ) {
      // Safe is back online and healthy
      notificationActions.info(
        "Safe Online",
        `Safe ${update.safeId} is back online`
      );
    }
  }

  private handleTripUpdate(tripData: any): void {
    realtimeActions.updateTrip(tripData.id, tripData);

    // Notify about trip status changes
    switch (tripData.status) {
      case "assigned":
        notificationActions.info(
          "Trip Assigned",
          `Trip ${tripData.id} has been assigned to courier`
        );
        break;
      case "in_transit":
        notificationActions.info(
          "Trip Started",
          `Trip ${tripData.id} is now in transit`
        );
        break;
      case "delivered":
        notificationActions.success(
          "Trip Delivered",
          `Trip ${tripData.id} completed successfully`
        );
        break;
      case "failed":
        notificationActions.error(
          "Trip Failed",
          `Trip ${tripData.id} encountered an error`
        );
        break;
      case "cancelled":
        notificationActions.warning(
          "Trip Cancelled",
          `Trip ${tripData.id} has been cancelled`
        );
        break;
    }
  }

  private handleAlert(alert: Alert): void {
    realtimeActions.addAlert(alert);

    // Show toast notification based on severity
    const title = `${alert.type.replace("_", " ").toUpperCase()} Alert`;

    switch (alert.severity) {
      case "critical":
        notificationActions.error(
          title,
          `Safe ${alert.safeId}: ${alert.message}`
        );
        break;
      case "high":
        notificationActions.warning(
          title,
          `Safe ${alert.safeId}: ${alert.message}`
        );
        break;
      case "medium":
      case "low":
        notificationActions.info(
          title,
          `Safe ${alert.safeId}: ${alert.message}`
        );
        break;
    }

    // Show browser notification for critical alerts
    if (alert.severity === "critical" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(`Guardian Safe Alert`, {
          body: `Safe ${alert.safeId}: ${alert.message}`,
          icon: "/favicon.ico",
          tag: alert.id,
          requireInteraction: true,
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification(`Guardian Safe Alert`, {
              body: `Safe ${alert.safeId}: ${alert.message}`,
              icon: "/favicon.ico",
              tag: alert.id,
              requireInteraction: true,
            });
          }
        });
      }
    }
  }

  private handleSystemNotification(data: any): void {
    // Handle system-wide notifications
    const { title, message, severity = "info" } = data;

    switch (severity) {
      case "error":
        notificationActions.error(title, message);
        break;
      case "warning":
        notificationActions.warning(title, message);
        break;
      case "success":
        notificationActions.success(title, message);
        break;
      default:
        notificationActions.info(title, message);
    }
  }

  private handleReconnect(): void {
    if (
      this.isManualClose ||
      this.reconnectAttempts >= this.maxReconnectAttempts
    ) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        notificationActions.error(
          "Connection Failed",
          "Unable to establish real-time connection. Please refresh the page."
        );
      }
      return;
    }

    this.reconnectAttempts++;
    realtimeActions.setWsReconnecting(true);

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: "heartbeat", timestamp: new Date() });
      }
    }, 30000); // 30 seconds
  }

  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

export const wsService = new WebSocketService();
