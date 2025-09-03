package websocket

import (
    "log"
)

type Hub struct {
    // Registered clients
    clients map[*Client]bool

    // Inbound messages from the clients
    broadcast chan []byte

    // Register requests from the clients
    register chan *Client

    // Unregister requests from clients
    unregister chan *Client
}

func NewHub() *Hub {
    return &Hub{
        broadcast:  make(chan []byte),
        register:   make(chan *Client),
        unregister: make(chan *Client),
        clients:    make(map[*Client]bool),
    }
}

func (h *Hub) Run() {
    for {
        select {
        case client := <-h.register:
            h.clients[client] = true
            log.Printf("Client connected. Total clients: %d", len(h.clients))
            
            // Send welcome message
            select {
            case client.send <- []byte(`{"type":"system_notification","data":{"title":"Connected","message":"Real-time updates active","severity":"info"}}`):
            default:
                close(client.send)
                delete(h.clients, client)
            }

        case client := <-h.unregister:
            if _, ok := h.clients[client]; ok {
                delete(h.clients, client)
                close(client.send)
                log.Printf("Client disconnected. Total clients: %d", len(h.clients))
            }

        case message := <-h.broadcast:
            for client := range h.clients {
                select {
                case client.send <- message:
                default:
                    close(client.send)
                    delete(h.clients, client)
                }
            }
        }
    }
}

func (h *Hub) Broadcast(message []byte) {
    h.broadcast <- message
}

func (h *Hub) ClientCount() int {
    return len(h.clients)
}