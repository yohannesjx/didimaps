package routing

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// RoutingEngine defines the interface for routing engines (OSRM, Valhalla, etc.)
type RoutingEngine interface {
	GetRoute(fromLat, fromLon, toLat, toLon float64) (*RouteResponse, error)
}

// RouteResponse is the standardized response format
// This shape NEVER changes, even when switching engines
type RouteResponse struct {
	DistanceMeters  int         `json:"distance_meters"`
	DurationSeconds int         `json:"duration_seconds"`
	Geometry        string      `json:"geometry"` // Encoded polyline
	Steps           []RouteStep `json:"steps"`
}

type RouteStep struct {
	Instruction     string `json:"instruction"`
	DistanceMeters  int    `json:"distance_meters"`
	DurationSeconds int    `json:"duration_seconds"`
	Name            string `json:"name"` // Street name or empty
}

// OSRMEngine implements RoutingEngine for OSRM
type OSRMEngine struct {
	BaseURL string
	Client  *http.Client
}

// OSRM response structures (internal only, never exposed)
type osrmResponse struct {
	Code   string      `json:"code"`
	Routes []osrmRoute `json:"routes"`
}

type osrmRoute struct {
	Distance float64   `json:"distance"` // meters
	Duration float64   `json:"duration"` // seconds
	Geometry string    `json:"geometry"` // polyline
	Legs     []osrmLeg `json:"legs"`
}

type osrmLeg struct {
	Steps []osrmStep `json:"steps"`
}

type osrmStep struct {
	Distance float64      `json:"distance"`
	Duration float64      `json:"duration"`
	Name     string       `json:"name"`
	Maneuver osrmManeuver `json:"maneuver"`
}

type osrmManeuver struct {
	Type string `json:"type"`
}

// NewOSRMEngine creates a new OSRM routing engine
func NewOSRMEngine(baseURL string) *OSRMEngine {
	return &OSRMEngine{
		BaseURL: baseURL,
		Client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// GetRoute fetches a route from OSRM and converts to standard format
func (e *OSRMEngine) GetRoute(fromLat, fromLon, toLat, toLon float64) (*RouteResponse, error) {
	// OSRM expects: lon,lat;lon,lat
	url := fmt.Sprintf("%s/route/v1/driving/%f,%f;%f,%f?overview=full&geometries=polyline&steps=true",
		e.BaseURL, fromLon, fromLat, toLon, toLat)

	resp, err := e.Client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("OSRM request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read OSRM response: %w", err)
	}

	var osrmResp osrmResponse
	if err := json.Unmarshal(body, &osrmResp); err != nil {
		return nil, fmt.Errorf("failed to parse OSRM response: %w", err)
	}

	if osrmResp.Code != "Ok" || len(osrmResp.Routes) == 0 {
		return nil, fmt.Errorf("no route found (OSRM code: %s)", osrmResp.Code)
	}

	// Convert OSRM response to our standard format
	route := osrmResp.Routes[0]

	steps := make([]RouteStep, 0)
	if len(route.Legs) > 0 {
		for _, osrmStep := range route.Legs[0].Steps {
			instruction := formatInstruction(osrmStep.Maneuver.Type, osrmStep.Name)
			steps = append(steps, RouteStep{
				Instruction:     instruction,
				DistanceMeters:  int(osrmStep.Distance),
				DurationSeconds: int(osrmStep.Duration),
				Name:            osrmStep.Name,
			})
		}
	}

	return &RouteResponse{
		DistanceMeters:  int(route.Distance),
		DurationSeconds: int(route.Duration),
		Geometry:        route.Geometry,
		Steps:           steps,
	}, nil
}

// formatInstruction converts OSRM maneuver types to human-readable instructions
func formatInstruction(maneuverType, streetName string) string {
	var action string
	switch maneuverType {
	case "depart":
		action = "Head"
	case "turn":
		action = "Turn"
	case "arrive":
		action = "Arrive at destination"
	case "merge":
		action = "Merge"
	case "fork":
		action = "Take fork"
	case "roundabout":
		action = "Enter roundabout"
	default:
		action = "Continue"
	}

	if streetName != "" && maneuverType != "arrive" {
		return fmt.Sprintf("%s on %s", action, streetName)
	}
	return action
}
