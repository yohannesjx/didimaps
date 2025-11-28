package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"
)

// ActivityLog represents an activity record
type ActivityLog struct {
	ID        string          `json:"id"`
	UserID    string          `json:"user_id"`
	Action    string          `json:"action"`
	Details   json.RawMessage `json:"details,omitempty"`
	CreatedAt string          `json:"created_at"`
}

// LogActivity records a user action
func LogActivity(db *sql.DB, userID, action string, details interface{}, ip string) {
	detailsJSON, err := json.Marshal(details)
	if err != nil {
		log.Printf("Failed to marshal activity details: %v", err)
		return
	}

	_, err = db.Exec(`
		INSERT INTO activity_logs (user_id, action, details, ip_address)
		VALUES ($1, $2, $3, $4)
	`, userID, action, detailsJSON, ip)

	if err != nil {
		log.Printf("Failed to log activity: %v", err)
	}
}

// GetActivity returns the user's activity feed
func GetActivity(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		if userID == "" {
			jsonError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		rows, err := db.Query(`
			SELECT id, action, details, created_at
			FROM activity_logs
			WHERE user_id = $1
			ORDER BY created_at DESC
			LIMIT 50
		`, userID)
		if err != nil {
			log.Printf("Failed to get activity: %v", err)
			jsonError(w, "failed to get activity", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var activities []ActivityLog
		for rows.Next() {
			var act ActivityLog
			var details []byte
			var createdAt time.Time

			err := rows.Scan(&act.ID, &act.Action, &details, &createdAt)
			if err != nil {
				continue
			}

			act.UserID = userID
			act.Details = json.RawMessage(details)
			act.CreatedAt = createdAt.Format(time.RFC3339)
			activities = append(activities, act)
		}

		if activities == nil {
			activities = []ActivityLog{}
		}

		jsonResponse(w, activities, http.StatusOK)
	}
}
