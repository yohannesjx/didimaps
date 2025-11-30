package routing

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// ValhallaEngine implements RoutingEngine for Valhalla
type ValhallaEngine struct {
	BaseURL string
	Client  *http.Client
}

// Valhalla request/response structures
type valhallaRequest struct {
	Locations  []valhallaLocation `json:"locations"`
	Costing    string             `json:"costing"`
	Alternates int                `json:"alternates,omitempty"`
	Units      string             `json:"units"`
}

type valhallaLocation struct {
	Lat float64 `json:"lat"`
	Lon float64 `json:"lon"`
}

type valhallaResponse struct {
	Trip valhallaTrip `json:"trip"`
}

type valhallaTrip struct {
	Legs          []valhallaLeg   `json:"legs"`
	Summary       valhallaSummary `json:"summary"`
	Status        int             `json:"status"`
	StatusMessage string          `json:"status_message,omitempty"`
}

type valhallaLeg struct {
	Maneuvers []valhallaManeuver `json:"maneuvers"`
	Summary   valhallaSummary    `json:"summary"`
	Shape     string             `json:"shape"`
}

type valhallaManeuver struct {
	Type                 int      `json:"type"`
	Instruction          string   `json:"instruction"`
	VerbalPreInstruction string   `json:"verbal_pre_transition_instruction,omitempty"`
	StreetNames          []string `json:"street_names,omitempty"`
	Length               float64  `json:"length"` // kilometers
	Time                 float64  `json:"time"`   // seconds
}

type valhallaSummary struct {
	Length float64 `json:"length"` // kilometers
	Time   float64 `json:"time"`   // seconds
}

// NewValhallaEngine creates a new Valhalla routing engine
func NewValhallaEngine(baseURL string) *ValhallaEngine {
	return &ValhallaEngine{
		BaseURL: baseURL,
		Client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// GetRoute fetches a route from Valhalla and converts to standard format
func (e *ValhallaEngine) GetRoute(fromLat, fromLon, toLat, toLon float64) (*RouteResponse, error) {
	// Build Valhalla request
	reqBody := valhallaRequest{
		Locations: []valhallaLocation{
			{Lat: fromLat, Lon: fromLon},
			{Lat: toLat, Lon: toLon},
		},
		Costing:    "auto",
		Alternates: 2, // Request up to 2 alternate routes
		Units:      "kilometers",
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Make request to Valhalla
	url := fmt.Sprintf("%s/route", e.BaseURL)
	resp, err := e.Client.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("Valhalla request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read Valhalla response: %w", err)
	}

	// Check for HTTP errors
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Valhalla returned status %d: %s", resp.StatusCode, string(body))
	}

	var valhallaResp valhallaResponse
	if err := json.Unmarshal(body, &valhallaResp); err != nil {
		return nil, fmt.Errorf("failed to parse Valhalla response: %w", err)
	}

	// Check for Valhalla errors
	if valhallaResp.Trip.Status != 0 && valhallaResp.Trip.StatusMessage != "" {
		return nil, fmt.Errorf("Valhalla error: %s", valhallaResp.Trip.StatusMessage)
	}

	if len(valhallaResp.Trip.Legs) == 0 {
		return nil, fmt.Errorf("no route found")
	}

	// Convert to our standard format
	leg := valhallaResp.Trip.Legs[0]

	// Convert steps
	steps := make([]RouteStep, 0, len(leg.Maneuvers))
	for _, maneuver := range leg.Maneuvers {
		// Skip the final "arrive" maneuver if it has no distance
		if maneuver.Type == 4 && maneuver.Length == 0 {
			continue
		}

		instruction := maneuver.Instruction
		if instruction == "" {
			instruction = formatValhallaManeuver(maneuver.Type, maneuver.StreetNames)
		}

		steps = append(steps, RouteStep{
			Instruction:     instruction,
			DistanceMeters:  int(maneuver.Length * 1000), // km to meters
			DurationSeconds: int(maneuver.Time),
			Name:            getStreetName(maneuver.StreetNames),
		})
	}

	return &RouteResponse{
		DistanceMeters:  int(leg.Summary.Length * 1000), // km to meters
		DurationSeconds: int(leg.Summary.Time),
		Geometry:        convertPolyline6To5(leg.Shape), // Convert polyline6 to polyline5
		Steps:           steps,
	}, nil
}

// convertPolyline6To5 converts Valhalla's polyline6 format to Google's polyline5 format
func convertPolyline6To5(polyline6 string) string {
	// Decode polyline6
	coords := decodePolyline(polyline6, 1e6)

	// Re-encode as polyline5
	return encodePolyline(coords, 1e5)
}

// decodePolyline decodes a polyline string with given precision
func decodePolyline(encoded string, precision float64) [][2]float64 {
	var coords [][2]float64
	index := 0
	lat := 0
	lng := 0

	for index < len(encoded) {
		var result int
		var shift uint
		var b int

		// Decode latitude
		for {
			b = int(encoded[index]) - 63
			index++
			result |= (b & 0x1f) << shift
			shift += 5
			if b < 0x20 {
				break
			}
		}
		if result&1 != 0 {
			lat += ^(result >> 1)
		} else {
			lat += result >> 1
		}

		// Decode longitude
		result = 0
		shift = 0
		for {
			b = int(encoded[index]) - 63
			index++
			result |= (b & 0x1f) << shift
			shift += 5
			if b < 0x20 {
				break
			}
		}
		if result&1 != 0 {
			lng += ^(result >> 1)
		} else {
			lng += result >> 1
		}

		coords = append(coords, [2]float64{
			float64(lat) / precision,
			float64(lng) / precision,
		})
	}

	return coords
}

// encodePolyline encodes coordinates to polyline format with given precision
func encodePolyline(coords [][2]float64, precision float64) string {
	var encoded string
	var prevLat, prevLng int

	for _, coord := range coords {
		lat := int(coord[0] * precision)
		lng := int(coord[1] * precision)

		encoded += encodeValue(lat - prevLat)
		encoded += encodeValue(lng - prevLng)

		prevLat = lat
		prevLng = lng
	}

	return encoded
}

// encodeValue encodes a single value for polyline
func encodeValue(value int) string {
	var encoded string

	if value < 0 {
		value = ^(value << 1)
	} else {
		value = value << 1
	}

	for value >= 0x20 {
		encoded += string(rune((0x20 | (value & 0x1f)) + 63))
		value >>= 5
	}

	encoded += string(rune(value + 63))
	return encoded
}

// formatValhallaManeuver converts Valhalla maneuver types to human-readable instructions
func formatValhallaManeuver(maneuverType int, streetNames []string) string {
	streetName := getStreetName(streetNames)

	var action string
	switch maneuverType {
	case 1: // Start
		action = "Head"
	case 2: // Start right
		action = "Head"
	case 3: // Start left
		action = "Head"
	case 4: // Destination
		return "Arrive at destination"
	case 5: // Destination right
		return "Arrive at destination"
	case 6: // Destination left
		return "Arrive at destination"
	case 7: // Becomes
		action = "Continue"
	case 8: // Continue
		action = "Continue"
	case 9: // Slight right
		action = "Turn slightly right"
	case 10: // Right
		action = "Turn right"
	case 11: // Sharp right
		action = "Turn sharply right"
	case 12: // U-turn right
		action = "Make a U-turn"
	case 13: // U-turn left
		action = "Make a U-turn"
	case 14: // Sharp left
		action = "Turn sharply left"
	case 15: // Left
		action = "Turn left"
	case 16: // Slight left
		action = "Turn slightly left"
	case 17: // Ramp straight
		action = "Take the ramp"
	case 18: // Ramp right
		action = "Take the ramp on the right"
	case 19: // Ramp left
		action = "Take the ramp on the left"
	case 20: // Exit right
		action = "Take the exit on the right"
	case 21: // Exit left
		action = "Take the exit on the left"
	case 22: // Stay straight
		action = "Stay straight"
	case 23: // Stay right
		action = "Keep right"
	case 24: // Stay left
		action = "Keep left"
	case 25: // Merge
		action = "Merge"
	case 26: // Roundabout enter
		action = "Enter the roundabout"
	case 27: // Roundabout exit
		action = "Exit the roundabout"
	case 28: // Ferry enter
		action = "Take the ferry"
	case 29: // Ferry exit
		action = "Exit the ferry"
	default:
		action = "Continue"
	}

	if streetName != "" && maneuverType != 4 && maneuverType != 5 && maneuverType != 6 {
		return fmt.Sprintf("%s on %s", action, streetName)
	}
	return action
}

// getStreetName extracts the first street name from the list
func getStreetName(streetNames []string) string {
	if len(streetNames) > 0 {
		return streetNames[0]
	}
	return ""
}
