package routing

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
)

type Handler struct {
	engine RoutingEngine
}

func NewHandler(engine RoutingEngine) *Handler {
	return &Handler{engine: engine}
}

// ErrorResponse for consistent error handling
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

// GetRoute handles GET /route requests
func (h *Handler) GetRoute(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	fromLat, err := strconv.ParseFloat(r.URL.Query().Get("from_lat"), 64)
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "invalid_from_lat", "from_lat must be a valid number")
		return
	}

	fromLon, err := strconv.ParseFloat(r.URL.Query().Get("from_lon"), 64)
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "invalid_from_lon", "from_lon must be a valid number")
		return
	}

	toLat, err := strconv.ParseFloat(r.URL.Query().Get("to_lat"), 64)
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "invalid_to_lat", "to_lat must be a valid number")
		return
	}

	toLon, err := strconv.ParseFloat(r.URL.Query().Get("to_lon"), 64)
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "invalid_to_lon", "to_lon must be a valid number")
		return
	}

	// Validate coordinates
	if fromLat < -90 || fromLat > 90 || toLat < -90 || toLat > 90 {
		h.sendError(w, http.StatusBadRequest, "invalid_latitude", "latitude must be between -90 and 90")
		return
	}

	if fromLon < -180 || fromLon > 180 || toLon < -180 || toLon > 180 {
		h.sendError(w, http.StatusBadRequest, "invalid_longitude", "longitude must be between -180 and 180")
		return
	}

	// Log request
	log.Printf("[ROUTING] Request: from=(%.6f,%.6f) to=(%.6f,%.6f)", fromLat, fromLon, toLat, toLon)

	// Get route from engine
	route, err := h.engine.GetRoute(fromLat, fromLon, toLat, toLon)
	if err != nil {
		log.Printf("[ROUTING] Error: %v", err)
		// Check if it's a "no route found" error vs engine down
		if err.Error() == "no route found" || err.Error()[:8] == "no route" {
			h.sendError(w, http.StatusUnprocessableEntity, "no_route_found", "Could not find a route between the specified points")
		} else {
			h.sendError(w, http.StatusServiceUnavailable, "routing_engine_error", "Routing service temporarily unavailable")
		}
		return
	}

	// Log success
	log.Printf("[ROUTING] Success: %dm, %ds, %d steps", route.DistanceMeters, route.DurationSeconds, len(route.Steps))

	// Send response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(route)
}

func (h *Handler) sendError(w http.ResponseWriter, status int, error, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ErrorResponse{
		Error:   error,
		Message: message,
	})
}
