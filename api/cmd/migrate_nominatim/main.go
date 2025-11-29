package main

import (
	"database/sql"
	"fmt"
	"log"
	"strings"

	_ "github.com/lib/pq"
)

// Config
const (
	NominatimConn = "postgres://nominatim:nominatim@nominatim:5432/nominatim?sslmode=disable"
	DidiConn      = "postgres://didi:didi_password@postgres:5432/didi?sslmode=disable"
	CityBox       = "ST_MakeEnvelope(38.60, 8.80, 38.95, 9.10, 4326)" // Addis Ababa
)

func main() {
	// 1. Connect to DBs
	nomDB, err := sql.Open("postgres", NominatimConn)
	if err != nil {
		log.Fatal("Nominatim connection failed:", err)
	}
	defer nomDB.Close()

	didiDB, err := sql.Open("postgres", DidiConn)
	if err != nil {
		log.Fatal("Didi connection failed:", err)
	}
	defer didiDB.Close()

	// 2. Count Records
	fmt.Println("Counting records in Nominatim...")
	var count int
	countQuery := fmt.Sprintf(`
		SELECT count(*) 
		FROM placex 
		WHERE ST_Contains(%s, geometry) 
		AND class IN ('amenity', 'shop', 'tourism', 'leisure', 'office', 'craft', 'historic', 'man_made')
		AND name IS NOT NULL;
	`, CityBox)

	if err := nomDB.QueryRow(countQuery).Scan(&count); err != nil {
		log.Fatal("Failed to count:", err)
	}
	fmt.Printf("Found %d records to migrate.\n", count)

	if count > 50000 {
		fmt.Println("⚠️  Count is > 50,000. Aborting automatic migration. Run manually with force.")
		return
	}

	// 3. Fetch Categories Cache
	categories := make(map[string]string) // name -> id
	rows, err := didiDB.Query("SELECT id, name FROM categories")
	if err != nil {
		log.Fatal("Failed to fetch categories:", err)
	}
	defer rows.Close()
	for rows.Next() {
		var id, name string
		rows.Scan(&id, &name)
		categories[strings.ToLower(name)] = id
	}

	// 4. Migrate
	fmt.Println("Starting migration...")

	// Query Nominatim Data
	// We need: osm_id, class, type, name(hstore), geometry, address(hstore)
	// Note: name is hstore, we want 'name' or 'name:en'
	// address is hstore
	query := fmt.Sprintf(`
		SELECT 
			place_id, 
			class, 
			type, 
			name->'name' as name,
			ST_AsText(geometry) as geom,
			address->'city' as city,
			address->'street' as street
		FROM placex 
		WHERE ST_Contains(%s, geometry) 
		AND class IN ('amenity', 'shop', 'tourism', 'leisure', 'office', 'craft', 'historic', 'man_made')
		AND name ? 'name';
	`, CityBox)

	rows, err = nomDB.Query(query)
	if err != nil {
		log.Fatal("Failed to query nominatim:", err)
	}
	defer rows.Close()

	migrated := 0
	for rows.Next() {
		var placeID int64
		var class, typeStr, name, geom, city, street sql.NullString

		if err := rows.Scan(&placeID, &class, &typeStr, &name, &geom, &city, &street); err != nil {
			log.Println("Scan error:", err)
			continue
		}

		if !name.Valid || name.String == "" {
			continue
		}

		// Determine Category
		catName := typeStr.String
		if catName == "" {
			catName = class.String
		}
		catName = strings.ReplaceAll(catName, "_", " ")

		catID, exists := categories[strings.ToLower(catName)]
		if !exists {
			// Create Category
			// fmt.Printf("Creating category: %s\n", catName)
			err := didiDB.QueryRow("INSERT INTO categories (name, slug, icon) VALUES ($1, $2, $3) RETURNING id",
				strings.Title(catName),
				strings.ReplaceAll(strings.ToLower(catName), " ", "-"),
				"📍").Scan(&catID)
			if err != nil {
				log.Println("Failed to create category:", err)
				continue
			}
			categories[strings.ToLower(catName)] = catID
		}

		// Insert Business
		// Check if exists first? (by name and location approx?)
		// For now, just insert.
		_, err = didiDB.Exec(`
			INSERT INTO businesses (name, category_id, geom, address, city, status, source)
			VALUES ($1, $2, ST_GeomFromText($3, 4326), $4, $5, 'verified', 'nominatim')
		`, name.String, catID, geom.String, street.String, "Addis Ababa")

		if err != nil {
			log.Println("Insert error:", err)
		} else {
			migrated++
			if migrated%100 == 0 {
				fmt.Printf("Migrated %d businesses...\r", migrated)
			}
		}
	}

	fmt.Printf("\n✅ Migration complete! %d businesses imported.\n", migrated)
}
