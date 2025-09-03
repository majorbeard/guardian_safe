package services

import (
    "encoding/json"
    "time"
    "guardian-safe-backend/internal/models"
)

type RealtimeService struct {
    clients map[string]chan []byte
}

func NewRealtimeService() *RealtimeService {
    return &RealtimeService{
        clients: make(map[string]chan []byte),
    }
}

func (s *RealtimeService) AddClient(clientID string, ch chan []byte) {
    s.clients[clientID] = ch
}

func (s *RealtimeService) RemoveClient(clientID string) {
    delete(s.clients, clientID)
}

func (s *RealtimeService) BroadcastSafeUpdate(safeID string, update interface{}) {
    message := map[string]interface{}{
        "type":      "safe_update",
        "data":      update,
        "timestamp": time.Now(),
    }
    
    s.broadcast(message)
}

func (s *RealtimeService) BroadcastTripUpdate(tripID string, update interface{}) {
    message := map[string]interface{}{
        "type":      "trip_update", 
        "data":      update,
        "timestamp": time.Now(),
    }
    
    s.broadcast(message)
}

func (s *RealtimeService) BroadcastAlert(alert models.Alert) {
    message := map[string]interface{}{
        "type":      "alert",
        "data":      alert,
        "timestamp": time.Now(),
    }
    
    s.broadcast(message)
}

func (s *RealtimeService) BroadcastSystemNotification(title, message, severity string) {
    notification := map[string]interface{}{
        "type":  "system_notification",
        "data": map[string]interface{}{
            "title":    title,
            "message":  message, 
            "severity": severity,
        },
        "timestamp": time.Now(),
    }
    
    s.broadcast(notification)
}

func (s *RealtimeService) broadcast(message interface{}) {
    data, err := json.Marshal(message)
    if err != nil {
        return
    }
    
    // Send to all connected clients
    for clientID, ch := range s.clients {
        select {
        case ch <- data:
        default:
            // Client channel is blocked, remove it
            delete(s.clients, clientID)
        }
    }
}