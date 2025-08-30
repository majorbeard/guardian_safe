import type { WebSocketMessage, SafeUpdate, Alert } from "../types";
import { realtimeActions } from "../store/realtime";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8080/ws";

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
      this.startHeartbeat();
    };

    this.ws.onclose = (event) => {
      console.log("WebSocket disconnected:", event.code, event.reason);
      realtimeActions.setWsConnected(false);
      this.clearHeartbeat();

      if (!this.isManualClose && event.code !== 1000) {
        this.handleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      realtimeActions.setWsConnected(false);
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

    // Check for critical conditions
    if (update.batteryLevel !== undefined && update.batteryLevel < 10) {
      realtimeActions.addAlert({
        id: `battery_${update.safeId}_${Date.now()}`,
        type: "battery_low",
        safeId: update.safeId,
        message: `Critical battery level: ${update.batteryLevel}%`,
        timestamp: new Date(),
        acknowledged: false,
        severity: "critical",
      });
    }

    if (update.isTampered === true) {
      realtimeActions.addAlert({
        id: `tamper_${update.safeId}_${Date.now()}`,
        type: "tamper",
        safeId: update.safeId,
        message: "Tampering detected!",
        timestamp: new Date(),
        acknowledged: false,
        severity: "critical",
      });
    }
  }

  private handleTripUpdate(tripData: any): void {
    realtimeActions.updateTrip(tripData.id, tripData);
  }

  private handleAlert(alert: Alert): void {
    realtimeActions.addAlert(alert);

    // Show browser notification for critical alerts
    if (alert.severity === "critical" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(`Guardian Safe Alert`, {
          body: alert.message,
          icon: "/favicon.ico",
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification(`Guardian Safe Alert`, {
              body: alert.message,
              icon: "/favicon.ico",
            });
          }
        });
      }
    }
  }

  private handleReconnect(): void {
    if (
      this.isManualClose ||
      this.reconnectAttempts >= this.maxReconnectAttempts
    ) {
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
