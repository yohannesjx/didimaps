package handlers

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"maps/api/internal/config"
	"maps/api/internal/middleware"
)

func Search(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("q")
		if query == "" {
			jsonError(w, "query parameter 'q' required", http.StatusBadRequest)
			return
		}

		// Sanitize query
		query = strings.TrimSpace(query)
		if len(query) < 2 {
			jsonError(w, "query must be at least 2 characters", http.StatusBadRequest)
			return
		}

		if len(query) > 200 {
			jsonError(w, "query too long", http.StatusBadRequest)
			return
		}

		// Optional location bias
		lat := r.URL.Query().Get("lat")
		lng := r.URL.Query().Get("lng")

		// Build Photon URL
		photonURL := fmt.Sprintf("%s/api?q=%s&limit=10", cfg.PhotonHost, url.QueryEscape(query))

		if lat != "" && lng != "" {
			if err := middleware.ValidateCoordinate(lat, lng); err == nil {
				photonURL += fmt.Sprintf("&lat=%s&lon=%s", lat, lng)
			}
		}

		// Optional language
		lang := r.URL.Query().Get("lang")
		if lang != "" && len(lang) == 2 {
			photonURL += fmt.Sprintf("&lang=%s", lang)
		}

		resp, err := http.Get(photonURL)
		if err != nil {
			jsonError(w, "geocoding service unavailable", http.StatusServiceUnavailable)
			return
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			jsonError(w, "failed to read geocoding response", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(body)
	}
}

func ReverseGeocode(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		lat := r.URL.Query().Get("lat")
		lng := r.URL.Query().Get("lng")

		if lat == "" || lng == "" {
			jsonError(w, "lat and lng parameters required", http.StatusBadRequest)
			return
		}

		if err := middleware.ValidateCoordinate(lat, lng); err != nil {
			jsonError(w, err.Error(), http.StatusBadRequest)
			return
		}

		photonURL := fmt.Sprintf("%s/reverse?lat=%s&lon=%s", cfg.PhotonHost, lat, lng)

		resp, err := http.Get(photonURL)
		if err != nil {
			jsonError(w, "reverse geocoding service unavailable", http.StatusServiceUnavailable)
			return
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			jsonError(w, "failed to read reverse geocoding response", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(body)
	}
}
