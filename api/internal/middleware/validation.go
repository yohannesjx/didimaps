package middleware

import (
	"fmt"
	"strconv"
)

// ValidateCoordinate validates latitude and longitude values
func ValidateCoordinate(lat, lng string) error {
	latF, err := strconv.ParseFloat(lat, 64)
	if err != nil {
		return fmt.Errorf("invalid latitude format")
	}
	
	lngF, err := strconv.ParseFloat(lng, 64)
	if err != nil {
		return fmt.Errorf("invalid longitude format")
	}
	
	if latF < -90 || latF > 90 {
		return fmt.Errorf("latitude must be between -90 and 90")
	}
	
	if lngF < -180 || lngF > 180 {
		return fmt.Errorf("longitude must be between -180 and 180")
	}
	
	return nil
}

// ValidateTileCoords validates tile coordinates
func ValidateTileCoords(z, x, y string) error {
	zInt, err := strconv.Atoi(z)
	if err != nil || zInt < 0 || zInt > 22 {
		return fmt.Errorf("invalid zoom level")
	}
	
	xInt, err := strconv.Atoi(x)
	if err != nil || xInt < 0 {
		return fmt.Errorf("invalid x coordinate")
	}
	
	yInt, err := strconv.Atoi(y)
	if err != nil || yInt < 0 {
		return fmt.Errorf("invalid y coordinate")
	}
	
	maxTile := 1 << zInt
	if xInt >= maxTile || yInt >= maxTile {
		return fmt.Errorf("tile coordinates out of range for zoom level")
	}
	
	return nil
}

// ValidateBoundingBox validates a bounding box
func ValidateBoundingBox(minLat, minLng, maxLat, maxLng string) error {
	if err := ValidateCoordinate(minLat, minLng); err != nil {
		return err
	}
	if err := ValidateCoordinate(maxLat, maxLng); err != nil {
		return err
	}
	
	minLatF, _ := strconv.ParseFloat(minLat, 64)
	maxLatF, _ := strconv.ParseFloat(maxLat, 64)
	minLngF, _ := strconv.ParseFloat(minLng, 64)
	maxLngF, _ := strconv.ParseFloat(maxLng, 64)
	
	if minLatF >= maxLatF {
		return fmt.Errorf("minLat must be less than maxLat")
	}
	if minLngF >= maxLngF {
		return fmt.Errorf("minLng must be less than maxLng")
	}
	
	return nil
}
