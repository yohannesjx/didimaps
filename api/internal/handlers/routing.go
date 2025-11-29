package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"maps/api/internal/config"
	"maps/api/internal/middleware"
)

type RouteResponse struct {
	Code   string  `json:"code"`
	Routes []Route `json:"routes,omitempty"`
	Error  string  `json:"error,omitempty"`
}

type Route struct {
	Distance float64 `json:"distance"`
	Duration float64 `json:"duration"`
	Geometry string  `json:"geometry,omitempty"`
}

type MatchRequest struct {
	Coordinates [][]float64 `json:"coordinates"`
	Timestamps  []int64     `json:"timestamps,omitempty"`
	Radiuses    []float64   `json:"radiuses,omitempty"`
}

func GetRoute(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		from := r.URL.Query().Get("from")
		to := r.URL.Query().Get("to")

		if from == "" || to == "" {
			jsonError(w, "from and to parameters required", http.StatusBadRequest)
			return
		}

		// Parse and validate coordinates
		fromParts := strings.Split(from, ",")
		toParts := strings.Split(to, ",")

		if len(fromParts) != 2 || len(toParts) != 2 {
			jsonError(w, "invalid coordinate format, use lat,lng", http.StatusBadRequest)
			return
		}

		if err := middleware.ValidateCoordinate(fromParts[0], fromParts[1]); err != nil {
			jsonError(w, err.Error(), http.StatusBadRequest)
			return
		}

		if err := middleware.ValidateCoordinate(toParts[0], toParts[1]); err != nil {
			jsonError(w, err.Error(), http.StatusBadRequest)
			return
		}

		// OSRM expects lng,lat format
		coordinates := fmt.Sprintf("%s,%s;%s,%s", fromParts[1], fromParts[0], toParts[1], toParts[0])
		osrmURL := fmt.Sprintf("%s/route/v1/driving/%s?overview=full&geometries=polyline", cfg.OSRMHost, coordinates)

		resp, err := http.Get(osrmURL)
		if err != nil {
			jsonError(w, "routing service unavailable", http.StatusServiceUnavailable)
			return
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			jsonError(w, "failed to read routing response", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(body)
	}
}

func MatchGPS(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req MatchRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "invalid request body", http.StatusBadRequest)
			return
		}

		if len(req.Coordinates) < 2 {
			jsonError(w, "at least 2 coordinates required", http.StatusBadRequest)
			return
		}

		if len(req.Coordinates) > 100 {
			jsonError(w, "maximum 100 coordinates allowed", http.StatusBadRequest)
			return
		}

		// Validate coordinates
		for _, coord := range req.Coordinates {
			if len(coord) != 2 {
				jsonError(w, "each coordinate must have [lat, lng]", http.StatusBadRequest)
				return
			}
			if coord[0] < -90 || coord[0] > 90 || coord[1] < -180 || coord[1] > 180 {
				jsonError(w, "invalid coordinate values", http.StatusBadRequest)
				return
			}
		}

		// Build OSRM match request (expects lng,lat)
		var coordStrings []string
		for _, coord := range req.Coordinates {
			coordStrings = append(coordStrings, fmt.Sprintf("%f,%f", coord[1], coord[0]))
		}

		osrmURL := fmt.Sprintf("%s/match/v1/driving/%s?overview=full&geometries=polyline",
			cfg.OSRMHost, strings.Join(coordStrings, ";"))

		resp, err := http.Get(osrmURL)
		if err != nil {
			jsonError(w, "matching service unavailable", http.StatusServiceUnavailable)
			return
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			jsonError(w, "failed to read matching response", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(body)
	}
}

func GetDistanceMatrix(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		coords := r.URL.Query().Get("coords")
		if coords == "" {
			jsonError(w, "coords parameter required", http.StatusBadRequest)
			return
		}

		// OSRM Table service: /table/v1/driving/{coordinates}
		// coordinates: lng,lat;lng,lat;...
		// The input 'coords' is likely lat,lng;lat,lng. We need to flip them.

		parts := strings.Split(coords, ";")
		var osrmCoords []string
		for _, part := range parts {
			latlng := strings.Split(part, ",")
			if len(latlng) != 2 {
				jsonError(w, "invalid coordinate format", http.StatusBadRequest)
				return
			}
			osrmCoords = append(osrmCoords, fmt.Sprintf("%s,%s", latlng[1], latlng[0]))
		}

		osrmURL := fmt.Sprintf("%s/table/v1/driving/%s", cfg.OSRMHost, strings.Join(osrmCoords, ";"))

		resp, err := http.Get(osrmURL)
		if err != nil {
			jsonError(w, "distance matrix service unavailable", http.StatusServiceUnavailable)
			return
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			jsonError(w, "failed to read response", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(body)
	}
}
