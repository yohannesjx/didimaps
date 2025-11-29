package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

func main() {
	// Connect to Nominatim DB
	// Host: nominatim (docker service name)
	// User: nominatim (default)
	// Pass: nominatim (from docker-compose)
	// DB: nominatim (default)
	connStr := "postgres://nominatim:nominatim@nominatim:5432/nominatim?sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Ping
	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to connect to Nominatim DB: %v", err)
	}

	fmt.Println("Connected to Nominatim DB!")

	// Query to count relevant POIs in Addis Ababa
	// Bounding Box: 38.60, 8.80, 38.95, 9.10
	query := `
		SELECT count(*) 
		FROM placex 
		WHERE ST_Contains(ST_MakeEnvelope(38.60, 8.80, 38.95, 9.10, 4326), geometry) 
		AND class IN ('amenity', 'shop', 'tourism', 'leisure', 'office', 'craft', 'historic', 'man_made');
	`

	var count int
	err = db.QueryRow(query).Scan(&count)
	if err != nil {
		log.Fatalf("Failed to count records: %v", err)
	}

	fmt.Printf("Found %d relevant POIs in Addis Ababa.\n", count)

	if count < 50000 {
		fmt.Println("✅ Count is under 50,000. Safe to migrate.")
	} else {
		fmt.Println("⚠️ Count is over 50,000. Migration might be heavy.")
	}
}
