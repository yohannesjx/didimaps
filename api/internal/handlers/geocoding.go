package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"maps/api/internal/config"
	"maps/api/internal/middleware"
)

// NominatimResult represents a single result from Nominatim
type NominatimResult struct {
	PlaceID     int      `json:"place_id"`
	Licence     string   `json:"licence"`
	OsmType     string   `json:"osm_type"`
	OsmID       int      `json:"osm_id"`
	Lat         string   `json:"lat"`
	Lon         string   `json:"lon"`
	Class       string   `json:"class"`
	Type        string   `json:"type"`
	PlaceRank   int      `json:"place_rank"`
	Importance  float64  `json:"importance"`
	AddressType string   `json:"addresstype"`
	Name        string   `json:"name"`
	DisplayName string   `json:"display_name"`
	BoundingBox []string `json:"boundingbox"`
}

// SearchResponse is our standardized response format
type SearchResponse struct {
	Results []SearchResult `json:"results"`
	Count   int            `json:"count"`
}

type SearchResult struct {
	PlaceID     int     `json:"place_id"`
	Name        string  `json:"name"`
	DisplayName string  `json:"display_name"`
	Lat         string  `json:"lat"`
	Lng         string  `json:"lng"`
	Type        string  `json:"type"`
	Importance  float64 `json:"importance"`
}

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

		// Build Nominatim search URL
		nominatimURL := fmt.Sprintf("%s/search?q=%s&format=json&limit=10&addressdetails=1",
			cfg.GeocoderHost, url.QueryEscape(query))

		// Optional location bias (viewbox)
		lat := r.URL.Query().Get("lat")
		lng := r.URL.Query().Get("lng")
		if lat != "" && lng != "" {
			if err := middleware.ValidateCoordinate(lat, lng); err == nil {
				// Create a viewbox around the point (roughly 50km)
				nominatimURL += fmt.Sprintf("&viewbox=%s,%s,%s,%s&bounded=0",
					addFloat(lng, -0.5), addFloat(lat, 0.5),
					addFloat(lng, 0.5), addFloat(lat, -0.5))
			}
		}

		// Optional language
		lang := r.URL.Query().Get("lang")
		if lang != "" && len(lang) == 2 {
			nominatimURL += fmt.Sprintf("&accept-language=%s", lang)
		}

		resp, err := http.Get(nominatimURL)
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

		// Parse Nominatim response and convert to our format
		var nominatimResults []NominatimResult
		if err := json.Unmarshal(body, &nominatimResults); err != nil {
			// Return raw response if parsing fails
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(resp.StatusCode)
			w.Write(body)
			return
		}

		// Convert to our standardized format
		results := make([]SearchResult, len(nominatimResults))
		for i, nr := range nominatimResults {
			results[i] = SearchResult{
				PlaceID:     nr.PlaceID,
				Name:        nr.Name,
				DisplayName: nr.DisplayName,
				Lat:         nr.Lat,
				Lng:         nr.Lon,
				Type:        nr.Type,
				Importance:  nr.Importance,
			}
		}

		response := SearchResponse{
			Results: results,
			Count:   len(results),
		}

		jsonResponse(w, response, http.StatusOK)
	}
}

// ReverseResponse is our standardized reverse geocoding response
type ReverseResponse struct {
	PlaceID     int               `json:"place_id"`
	Name        string            `json:"name"`
	DisplayName string            `json:"display_name"`
	Lat         string            `json:"lat"`
	Lng         string            `json:"lng"`
	Type        string            `json:"type"`
	Address     map[string]string `json:"address"`
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

		// Nominatim reverse geocoding URL
		nominatimURL := fmt.Sprintf("%s/reverse?lat=%s&lon=%s&format=json&addressdetails=1",
			cfg.GeocoderHost, lat, lng)

		resp, err := http.Get(nominatimURL)
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

		// Parse and return
		var result struct {
			PlaceID     int               `json:"place_id"`
			Name        string            `json:"name"`
			DisplayName string            `json:"display_name"`
			Lat         string            `json:"lat"`
			Lon         string            `json:"lon"`
			Type        string            `json:"type"`
			Address     map[string]string `json:"address"`
			Error       string            `json:"error"`
		}

		if err := json.Unmarshal(body, &result); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(resp.StatusCode)
			w.Write(body)
			return
		}

		if result.Error != "" {
			jsonError(w, "location not found", http.StatusNotFound)
			return
		}

		response := ReverseResponse{
			PlaceID:     result.PlaceID,
			Name:        result.Name,
			DisplayName: result.DisplayName,
			Lat:         result.Lat,
			Lng:         result.Lon,
			Type:        result.Type,
			Address:     result.Address,
		}

		jsonResponse(w, response, http.StatusOK)
	}
}

// Helper to add float offset to coordinate string
func addFloat(coord string, offset float64) string {
	var f float64
	fmt.Sscanf(coord, "%f", &f)
	return fmt.Sprintf("%.6f", f+offset)
}
