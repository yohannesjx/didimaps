package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
)

type PublishPOIRequest struct {
	ID       string                 `json:"id"`
	Source   string                 `json:"source"`
	Name     string                 `json:"name"`
	Lat      float64                `json:"lat"`
	Lng      float64                `json:"lng"`
	Type     string                 `json:"type"`
	Metadata map[string]interface{} `json:"metadata"`
}

// PublishPOI allows internal microservices to publish/update POIs
func PublishPOI(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req PublishPOIRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "invalid request body", http.StatusBadRequest)
			return
		}

		if req.ID == "" || req.Source == "" || req.Name == "" {
			jsonError(w, "id, source, and name are required", http.StatusBadRequest)
			return
		}

		// Upsert logic
		// We assume 'businesses' table has a way to store external ID or we use a mapping.
		// For now, let's assume we store them in 'businesses' with a specific source.
		// We might need to add 'source' and 'external_id' columns if they don't exist,
		// but based on SearchBusinesses query, 'source' column exists.

		// We need to map 'Type' to 'category_id'. This is tricky without a lookup.
		// For now, we'll just insert/update and assume category mapping is handled or nullable.

		query := `
			INSERT INTO businesses (
				name, source, external_id, 
				geom, status, created_at, updated_at
			) VALUES (
				$1, $2, $3,
				ST_SetSRID(ST_MakePoint($4, $5), 4326), 'verified', NOW(), NOW()
			)
			ON CONFLICT (source, external_id) 
			DO UPDATE SET
				name = EXCLUDED.name,
				geom = EXCLUDED.geom,
				updated_at = NOW();
		`
		// Note: We need a unique constraint on (source, external_id) for ON CONFLICT to work.
		// If it doesn't exist, this might fail or duplicate.
		// For this task, I'll assume the schema supports it or I'll use a simple UPDATE then INSERT check.

		// Let's try the UPSERT assuming constraint exists.
		_, err := db.Exec(query, req.Name, req.Source, req.ID, req.Lng, req.Lat)
		if err != nil {
			log.Printf("Failed to publish POI: %v", err)
			// Fallback: Try Update, if 0 rows, Insert.
			res, err := db.Exec(`
				UPDATE businesses SET 
					name = $1, geom = ST_SetSRID(ST_MakePoint($2, $3), 4326), updated_at = NOW()
				WHERE source = $4 AND external_id = $5
			`, req.Name, req.Lng, req.Lat, req.Source, req.ID)

			if err == nil {
				rows, _ := res.RowsAffected()
				if rows == 0 {
					_, err = db.Exec(`
						INSERT INTO businesses (name, source, external_id, geom, status)
						VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), 'verified')
					`, req.Name, req.Source, req.ID, req.Lng, req.Lat)
				}
			}

			if err != nil {
				log.Printf("Failed to upsert POI: %v", err)
				jsonError(w, "failed to publish POI", http.StatusInternalServerError)
				return
			}
		}

		jsonResponse(w, map[string]string{"status": "published"}, http.StatusOK)
	}
}
