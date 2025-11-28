package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port          string
	JWTSecret     string
	JWTExpiry     int // minutes
	RefreshExpiry int // hours
	OSRMHost      string
	GeocoderHost  string
	TileHost      string
	RateLimit     int // requests per minute

	// Database
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string
}

func Load() *Config {
	return &Config{
		Port:          getEnv("PORT", "8000"),
		JWTSecret:     getEnv("JWT_SECRET", "your-super-secret-key-change-in-production"),
		JWTExpiry:     getEnvInt("JWT_EXPIRY", 15),
		RefreshExpiry: getEnvInt("REFRESH_EXPIRY", 168), // 7 days
		OSRMHost:      getEnv("OSRM_HOST", "http://osrm:5000"),
		GeocoderHost:  getEnv("GEOCODER_HOST", "http://nominatim:8080"),
		TileHost:      getEnv("TILE_HOST", "http://tileserver:8080"),
		RateLimit:     getEnvInt("RATE_LIMIT", 100),

		// Database
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "didi"),
		DBPassword: getEnv("DB_PASSWORD", "didi_password"),
		DBName:     getEnv("DB_NAME", "didi"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return defaultVal
}
