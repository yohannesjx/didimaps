package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"maps/api/internal/config"

	"github.com/go-chi/chi/v5"
)

// CreateBusinessRequest is the request body for creating a business
type CreateBusinessRequest struct {
	Name          string  `json:"name"`
	NameAm        *string `json:"name_am,omitempty"`
	Description   *string `json:"description,omitempty"`
	DescriptionAm *string `json:"description_am,omitempty"`
	CategoryID    *string `json:"category_id,omitempty"`
	Phone         *string `json:"phone,omitempty"`
	Email         *string `json:"email,omitempty"`
	Website       *string `json:"website,omitempty"`
	Lat           float64 `json:"lat"`
	Lng           float64 `json:"lng"`
	Address       *string `json:"address,omitempty"`
	AddressAm     *string `json:"address_am,omitempty"`
}

// UpdateBusinessRequest is the request body for updating a business
type UpdateBusinessRequest struct {
	Name          *string  `json:"name,omitempty"`
	NameAm        *string  `json:"name_am,omitempty"`
	Description   *string  `json:"description,omitempty"`
	DescriptionAm *string  `json:"description_am,omitempty"`
	CategoryID    *string  `json:"category_id,omitempty"`
	Phone         *string  `json:"phone,omitempty"`
	Email         *string  `json:"email,omitempty"`
	Website       *string  `json:"website,omitempty"`
	Lat           *float64 `json:"lat,omitempty"`
	Lng           *float64 `json:"lng,omitempty"`
	Address       *string  `json:"address,omitempty"`
	AddressAm     *string  `json:"address_am,omitempty"`
}

// BusinessHourRequest is the request body for setting business hours
type BusinessHourRequest struct {
	DayOfWeek int     `json:"day_of_week"`
	OpenTime  *string `json:"open_time,omitempty"`
	CloseTime *string `json:"close_time,omitempty"`
	IsClosed  bool    `json:"is_closed"`
}

// BusinessResponse is the response for a business
type BusinessResponseFull struct {
	ID            string             `json:"id"`
	OwnerID       *string            `json:"owner_id,omitempty"`
	Name          string             `json:"name"`
	NameAm        *string            `json:"name_am,omitempty"`
	Description   *string            `json:"description,omitempty"`
	DescriptionAm *string            `json:"description_am,omitempty"`
	Category      *CategoryResp      `json:"category,omitempty"`
	Phone         *string            `json:"phone,omitempty"`
	Email         *string            `json:"email,omitempty"`
	Website       *string            `json:"website,omitempty"`
	Lat           float64            `json:"lat"`
	Lng           float64            `json:"lng"`
	Address       *string            `json:"address,omitempty"`
	AddressAm     *string            `json:"address_am,omitempty"`
	City          string             `json:"city"`
	Status        string             `json:"status"`
	AvgRating     float64            `json:"avg_rating"`
	ReviewCount   int                `json:"review_count"`
	ViewCount     int                `json:"view_count"`
	Distance      *float64           `json:"distance_m,omitempty"`
	Hours         []BusinessHourResp `json:"hours,omitempty"`
	Media         []MediaResp        `json:"media,omitempty"`
	IsSaved       bool               `json:"is_saved"`
	CreatedAt     string             `json:"created_at"`
}

type CategoryResp struct {
	ID     string  `json:"id"`
	Name   string  `json:"name"`
	NameAm *string `json:"name_am,omitempty"`
	Icon   *string `json:"icon,omitempty"`
}

type BusinessHourResp struct {
	DayOfWeek int     `json:"day_of_week"`
	OpenTime  *string `json:"open_time,omitempty"`
	CloseTime *string `json:"close_time,omitempty"`
	IsClosed  bool    `json:"is_closed"`
}

type MediaResp struct {
	ID           string  `json:"id"`
	MediaType    string  `json:"media_type"`
	URL          string  `json:"url"`
	ThumbnailURL *string `json:"thumbnail_url,omitempty"`
	Caption      *string `json:"caption,omitempty"`
}

// CreateBusiness creates a new business listing
func CreateBusiness(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		if userID == "" {
			jsonError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var req CreateBusinessRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "invalid request body", http.StatusBadRequest)
			return
		}

		if req.Name == "" {
			jsonError(w, "name is required", http.StatusBadRequest)
			return
		}

		if req.Lat == 0 || req.Lng == 0 {
			jsonError(w, "lat and lng are required", http.StatusBadRequest)
			return
		}

		// Validate coordinates are within Ethiopia/Addis bounds
		if req.Lat < 3 || req.Lat > 15 || req.Lng < 33 || req.Lng > 48 {
			jsonError(w, "coordinates must be within Ethiopia", http.StatusBadRequest)
			return
		}

		var businessID string
		err := db.QueryRow(`
			INSERT INTO businesses (
				owner_id, name, name_am, description, description_am,
				category_id, phone, email, website,
				geom, address, address_am, status
			) VALUES (
				$1, $2, $3, $4, $5,
				$6, $7, $8, $9,
				ST_SetSRID(ST_MakePoint($10, $11), 4326), $12, $13, 'pending'
			) RETURNING id
		`, userID, req.Name, req.NameAm, req.Description, req.DescriptionAm,
			req.CategoryID, req.Phone, req.Email, req.Website,
			req.Lng, req.Lat, req.Address, req.AddressAm).Scan(&businessID)

		if err != nil {
			log.Printf("Failed to create business: %v", err)
			jsonError(w, "failed to create business", http.StatusInternalServerError)
			return
		}

		// Update user role to business_owner if not already
		db.Exec("UPDATE users SET role = 'business_owner' WHERE id = $1 AND role = 'user'", userID)

		// Log activity
		LogActivity(db, userID, "create_business", map[string]string{"business_id": businessID, "name": req.Name}, r.RemoteAddr)

		jsonResponse(w, map[string]string{
			"id":      businessID,
			"message": "business created, pending verification",
		}, http.StatusCreated)
	}
}

// UpdateBusiness updates an existing business
func UpdateBusiness(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		if userID == "" {
			jsonError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		businessID := chi.URLParam(r, "id")
		if businessID == "" {
			jsonError(w, "business id required", http.StatusBadRequest)
			return
		}

		// Check ownership
		var ownerID string
		err := db.QueryRow("SELECT owner_id FROM businesses WHERE id = $1", businessID).Scan(&ownerID)
		if err == sql.ErrNoRows {
			jsonError(w, "business not found", http.StatusNotFound)
			return
		}
		if ownerID != userID {
			// Check if admin
			var role string
			db.QueryRow("SELECT role FROM users WHERE id = $1", userID).Scan(&role)
			if role != "admin" {
				jsonError(w, "forbidden", http.StatusForbidden)
				return
			}
		}

		var req UpdateBusinessRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "invalid request body", http.StatusBadRequest)
			return
		}

		// Build dynamic update query
		query := "UPDATE businesses SET updated_at = NOW()"
		args := []interface{}{}
		argNum := 1

		if req.Name != nil {
			query += ", name = $" + strconv.Itoa(argNum)
			args = append(args, *req.Name)
			argNum++
		}
		if req.NameAm != nil {
			query += ", name_am = $" + strconv.Itoa(argNum)
			args = append(args, *req.NameAm)
			argNum++
		}
		if req.Description != nil {
			query += ", description = $" + strconv.Itoa(argNum)
			args = append(args, *req.Description)
			argNum++
		}
		if req.DescriptionAm != nil {
			query += ", description_am = $" + strconv.Itoa(argNum)
			args = append(args, *req.DescriptionAm)
			argNum++
		}
		if req.CategoryID != nil {
			query += ", category_id = $" + strconv.Itoa(argNum)
			args = append(args, *req.CategoryID)
			argNum++
		}
		if req.Phone != nil {
			query += ", phone = $" + strconv.Itoa(argNum)
			args = append(args, *req.Phone)
			argNum++
		}
		if req.Email != nil {
			query += ", email = $" + strconv.Itoa(argNum)
			args = append(args, *req.Email)
			argNum++
		}
		if req.Website != nil {
			query += ", website = $" + strconv.Itoa(argNum)
			args = append(args, *req.Website)
			argNum++
		}
		if req.Lat != nil && req.Lng != nil {
			query += ", geom = ST_SetSRID(ST_MakePoint($" + strconv.Itoa(argNum) + ", $" + strconv.Itoa(argNum+1) + "), 4326)"
			args = append(args, *req.Lng, *req.Lat)
			argNum += 2
		}
		if req.Address != nil {
			query += ", address = $" + strconv.Itoa(argNum)
			args = append(args, *req.Address)
			argNum++
		}
		if req.AddressAm != nil {
			query += ", address_am = $" + strconv.Itoa(argNum)
			args = append(args, *req.AddressAm)
			argNum++
		}

		query += " WHERE id = $" + strconv.Itoa(argNum)
		args = append(args, businessID)

		_, err = db.Exec(query, args...)
		if err != nil {
			log.Printf("Failed to update business: %v", err)
			jsonError(w, "failed to update business", http.StatusInternalServerError)
			return
		}

		jsonResponse(w, map[string]string{"message": "business updated"}, http.StatusOK)
	}
}

// GetBusiness returns a single business by ID
func GetBusiness(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		businessID := chi.URLParam(r, "id")
		if businessID == "" {
			jsonError(w, "business id required", http.StatusBadRequest)
			return
		}

		userID := getUserIDFromContext(r)

		var biz BusinessResponseFull
		var ownerID, nameAm, description, descriptionAm, categoryID, phone, email, website, address, addressAm sql.NullString
		var createdAt time.Time

		err := db.QueryRow(`
			SELECT 
				b.id, b.owner_id, b.name, b.name_am, b.description, b.description_am,
				b.category_id, b.phone, b.email, b.website,
				ST_Y(b.geom) as lat, ST_X(b.geom) as lng,
				b.address, b.address_am, b.city, b.status,
				b.avg_rating, b.review_count, b.view_count, b.created_at
			FROM businesses b
			WHERE b.id = $1
		`, businessID).Scan(
			&biz.ID, &ownerID, &biz.Name, &nameAm, &description, &descriptionAm,
			&categoryID, &phone, &email, &website,
			&biz.Lat, &biz.Lng,
			&address, &addressAm, &biz.City, &biz.Status,
			&biz.AvgRating, &biz.ReviewCount, &biz.ViewCount, &createdAt,
		)

		if err == sql.ErrNoRows {
			jsonError(w, "business not found", http.StatusNotFound)
			return
		}
		if err != nil {
			log.Printf("Failed to get business: %v", err)
			jsonError(w, "failed to get business", http.StatusInternalServerError)
			return
		}

		// Set nullable fields
		if ownerID.Valid {
			biz.OwnerID = &ownerID.String
		}
		if nameAm.Valid {
			biz.NameAm = &nameAm.String
		}
		if description.Valid {
			biz.Description = &description.String
		}
		if descriptionAm.Valid {
			biz.DescriptionAm = &descriptionAm.String
		}
		if phone.Valid {
			biz.Phone = &phone.String
		}
		if email.Valid {
			biz.Email = &email.String
		}
		if website.Valid {
			biz.Website = &website.String
		}
		if address.Valid {
			biz.Address = &address.String
		}
		if addressAm.Valid {
			biz.AddressAm = &addressAm.String
		}
		biz.CreatedAt = createdAt.Format(time.RFC3339)

		// Get category
		if categoryID.Valid {
			var cat CategoryResp
			var catNameAm, catIcon sql.NullString
			err := db.QueryRow(`
				SELECT id, name, name_am, icon FROM categories WHERE id = $1
			`, categoryID.String).Scan(&cat.ID, &cat.Name, &catNameAm, &catIcon)
			if err == nil {
				if catNameAm.Valid {
					cat.NameAm = &catNameAm.String
				}
				if catIcon.Valid {
					cat.Icon = &catIcon.String
				}
				biz.Category = &cat
			}
		}

		// Get hours
		rows, err := db.Query(`
			SELECT day_of_week, open_time::text, close_time::text, is_closed
			FROM business_hours WHERE business_id = $1 ORDER BY day_of_week
		`, businessID)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var h BusinessHourResp
				var openTime, closeTime sql.NullString
				rows.Scan(&h.DayOfWeek, &openTime, &closeTime, &h.IsClosed)
				if openTime.Valid {
					h.OpenTime = &openTime.String
				}
				if closeTime.Valid {
					h.CloseTime = &closeTime.String
				}
				biz.Hours = append(biz.Hours, h)
			}
		}

		// Get media
		rows, err = db.Query(`
			SELECT id, media_type, url, thumbnail_url, caption
			FROM business_media WHERE business_id = $1 ORDER BY sort_order
		`, businessID)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var m MediaResp
				var thumbURL, caption sql.NullString
				rows.Scan(&m.ID, &m.MediaType, &m.URL, &thumbURL, &caption)
				if thumbURL.Valid {
					m.ThumbnailURL = &thumbURL.String
				}
				if caption.Valid {
					m.Caption = &caption.String
				}
				biz.Media = append(biz.Media, m)
			}
		}

		// Check if saved by user
		if userID != "" {
			var exists bool
			db.QueryRow(`
				SELECT EXISTS(SELECT 1 FROM user_saved_businesses WHERE user_id = $1 AND business_id = $2)
			`, userID, businessID).Scan(&exists)
			biz.IsSaved = exists
		}

		// Increment view count
		db.Exec("UPDATE businesses SET view_count = view_count + 1 WHERE id = $1", businessID)

		jsonResponse(w, biz, http.StatusOK)
	}
}

// GetNearbyBusinesses returns businesses near a location
func GetNearbyBusinesses(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		latStr := r.URL.Query().Get("lat")
		lngStr := r.URL.Query().Get("lng")
		radiusStr := r.URL.Query().Get("radius")
		category := r.URL.Query().Get("category")
		limitStr := r.URL.Query().Get("limit")

		if latStr == "" || lngStr == "" {
			jsonError(w, "lat and lng required", http.StatusBadRequest)
			return
		}

		lat, err := strconv.ParseFloat(latStr, 64)
		if err != nil {
			jsonError(w, "invalid lat", http.StatusBadRequest)
			return
		}

		lng, err := strconv.ParseFloat(lngStr, 64)
		if err != nil {
			jsonError(w, "invalid lng", http.StatusBadRequest)
			return
		}

		radius := 1000.0 // default 1km
		if radiusStr != "" {
			radius, _ = strconv.ParseFloat(radiusStr, 64)
		}
		if radius > 50000 {
			radius = 50000 // max 50km
		}

		limit := 20
		if limitStr != "" {
			limit, _ = strconv.Atoi(limitStr)
		}
		if limit > 100 {
			limit = 100
		}

		query := `
			SELECT 
				b.id, b.name, b.name_am, b.category_id,
				ST_Y(b.geom) as lat, ST_X(b.geom) as lng,
				b.address, b.city, b.status,
				b.avg_rating, b.review_count,
				ST_Distance(b.geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance,
				c.name as category_name, c.icon as category_icon
			FROM businesses b
			LEFT JOIN categories c ON b.category_id = c.id
			WHERE b.status = 'verified'
			AND ST_DWithin(b.geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
		`
		args := []interface{}{lng, lat, radius}
		argNum := 4

		if category != "" {
			query += " AND b.category_id = $" + strconv.Itoa(argNum)
			args = append(args, category)
			argNum++
		}

		query += " ORDER BY distance LIMIT $" + strconv.Itoa(argNum)
		args = append(args, limit)

		rows, err := db.Query(query, args...)
		if err != nil {
			log.Printf("Failed to query nearby businesses: %v", err)
			jsonError(w, "failed to get businesses", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var businesses []map[string]interface{}
		for rows.Next() {
			var id, name, city, status string
			var nameAm, categoryID, address, categoryName, categoryIcon sql.NullString
			var bizLat, bizLng, avgRating, distance float64
			var reviewCount int

			err := rows.Scan(
				&id, &name, &nameAm, &categoryID,
				&bizLat, &bizLng, &address, &city, &status,
				&avgRating, &reviewCount, &distance,
				&categoryName, &categoryIcon,
			)
			if err != nil {
				continue
			}

			biz := map[string]interface{}{
				"id":           id,
				"name":         name,
				"lat":          bizLat,
				"lng":          bizLng,
				"city":         city,
				"status":       status,
				"avg_rating":   avgRating,
				"review_count": reviewCount,
				"distance_m":   distance,
			}
			if nameAm.Valid {
				biz["name_am"] = nameAm.String
			}
			if address.Valid {
				biz["address"] = address.String
			}
			if categoryName.Valid {
				biz["category"] = map[string]interface{}{
					"id":   categoryID.String,
					"name": categoryName.String,
					"icon": categoryIcon.String,
				}
			}

			businesses = append(businesses, biz)
		}

		if businesses == nil {
			businesses = []map[string]interface{}{}
		}

		jsonResponse(w, map[string]interface{}{
			"businesses": businesses,
			"count":      len(businesses),
		}, http.StatusOK)
	}
}

// SearchBusinesses searches businesses by name/description (Hybrid: Local + Nominatim)
func SearchBusinesses(db *sql.DB, cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query().Get("q")
		if q == "" {
			jsonError(w, "search query required", http.StatusBadRequest)
			return
		}

		limitStr := r.URL.Query().Get("limit")
		limit := 20
		if limitStr != "" {
			limit, _ = strconv.Atoi(limitStr)
		}
		if limit > 100 {
			limit = 100
		}

		// Log search activity (if user is logged in)
		userID := getUserIDFromContext(r)
		if userID != "" {
			LogActivity(db, userID, "search", map[string]string{"query": q}, r.RemoteAddr)
		}

		rows, err := db.Query(`
			SELECT 
				b.id, b.name, b.name_am,
				ST_Y(b.geom) as lat, ST_X(b.geom) as lng,
				b.address, b.city, b.status,
				b.avg_rating, b.review_count,
				c.name as category_name, c.icon as category_icon
			FROM businesses b
			LEFT JOIN categories c ON b.category_id = c.id
			WHERE b.status = 'verified'
			AND (
				b.name ILIKE '%' || $1 || '%'
				OR b.name_am ILIKE '%' || $1 || '%'
				OR b.description ILIKE '%' || $1 || '%'
			)
			ORDER BY 
				CASE WHEN b.name ILIKE $1 || '%' THEN 0 ELSE 1 END,
				b.avg_rating DESC
			LIMIT $2
		`, q, limit)

		if err != nil {
			log.Printf("Failed to search businesses: %v", err)
			jsonError(w, "search failed", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var businesses []map[string]interface{}
		for rows.Next() {
			var id, name, city, status string
			var nameAm, address, categoryName, categoryIcon sql.NullString
			var lat, lng, avgRating float64
			var reviewCount int

			err := rows.Scan(
				&id, &name, &nameAm,
				&lat, &lng, &address, &city, &status,
				&avgRating, &reviewCount,
				&categoryName, &categoryIcon,
			)
			if err != nil {
				continue
			}

			biz := map[string]interface{}{
				"id":           id,
				"name":         name,
				"lat":          lat,
				"lng":          lng,
				"city":         city,
				"avg_rating":   avgRating,
				"review_count": reviewCount,
				"source":       "local",
			}
			if nameAm.Valid {
				biz["name_am"] = nameAm.String
			}
			if address.Valid {
				biz["address"] = address.String
			}
			if categoryName.Valid {
				biz["category"] = map[string]interface{}{
					"name": categoryName.String,
					"icon": categoryIcon.String,
				}
			}

			businesses = append(businesses, biz)
		}

		if businesses == nil {
			businesses = []map[string]interface{}{}
		}

		// If local results are few, fetch from Nominatim
		if len(businesses) < 5 {
			nominatimURL := fmt.Sprintf("%s/search?q=%s&format=json&limit=5&addressdetails=1",
				cfg.GeocoderHost, url.QueryEscape(q))

			// Bias to Addis Ababa if no location provided
			nominatimURL += "&viewbox=38.65,9.10,38.90,8.80&bounded=0"

			resp, err := http.Get(nominatimURL)
			if err == nil {
				defer resp.Body.Close()
				body, _ := io.ReadAll(resp.Body)

				var nominatimResults []struct {
					PlaceID     int    `json:"place_id"`
					Lat         string `json:"lat"`
					Lon         string `json:"lon"`
					DisplayName string `json:"display_name"`
					Type        string `json:"type"`
					Name        string `json:"name"`
				}

				if json.Unmarshal(body, &nominatimResults) == nil {
					for _, nr := range nominatimResults {
						lat, _ := strconv.ParseFloat(nr.Lat, 64)
						lng, _ := strconv.ParseFloat(nr.Lon, 64)

						// Use Name if available, else first part of DisplayName
						name := nr.Name
						if name == "" {
							parts := strings.Split(nr.DisplayName, ",")
							if len(parts) > 0 {
								name = parts[0]
							}
						}

						biz := map[string]interface{}{
							"id":           fmt.Sprintf("nom_%d", nr.PlaceID),
							"name":         name,
							"lat":          lat,
							"lng":          lng,
							"city":         "External",
							"avg_rating":   0,
							"review_count": 0,
							"address":      nr.DisplayName,
							"source":       "nominatim",
							"category": map[string]interface{}{
								"name": nr.Type,
								"icon": "map-pin",
							},
						}
						businesses = append(businesses, biz)
					}
				}
			}
		}

		jsonResponse(w, map[string]interface{}{
			"businesses": businesses,
			"count":      len(businesses),
		}, http.StatusOK)
	}
}

// GetCategories returns all business categories
func GetCategories(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.Query(`
			SELECT id, name, name_am, icon, parent_id
			FROM categories
			ORDER BY sort_order, name
		`)
		if err != nil {
			log.Printf("Failed to get categories: %v", err)
			jsonError(w, "failed to get categories", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var categories []map[string]interface{}
		for rows.Next() {
			var id, name string
			var nameAm, icon, parentID sql.NullString

			err := rows.Scan(&id, &name, &nameAm, &icon, &parentID)
			if err != nil {
				continue
			}

			cat := map[string]interface{}{
				"id":   id,
				"name": name,
			}
			if nameAm.Valid {
				cat["name_am"] = nameAm.String
			}
			if icon.Valid {
				cat["icon"] = icon.String
			}
			if parentID.Valid {
				cat["parent_id"] = parentID.String
			}

			categories = append(categories, cat)
		}

		if categories == nil {
			categories = []map[string]interface{}{}
		}

		jsonResponse(w, categories, http.StatusOK)
	}
}

// SaveBusiness saves a business to user's favorites
func SaveBusiness(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		if userID == "" {
			jsonError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		businessID := chi.URLParam(r, "id")
		if businessID == "" {
			jsonError(w, "business id required", http.StatusBadRequest)
			return
		}

		_, err := db.Exec(`
			INSERT INTO user_saved_businesses (user_id, business_id)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING
		`, userID, businessID)

		if err != nil {
			log.Printf("Failed to save business: %v", err)
			jsonError(w, "failed to save business", http.StatusInternalServerError)
			return
		}

		jsonResponse(w, map[string]string{"message": "business saved"}, http.StatusOK)
	}
}

// UnsaveBusiness removes a business from user's favorites
func UnsaveBusiness(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		if userID == "" {
			jsonError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		businessID := chi.URLParam(r, "id")
		if businessID == "" {
			jsonError(w, "business id required", http.StatusBadRequest)
			return
		}

		_, err := db.Exec(`
			DELETE FROM user_saved_businesses WHERE user_id = $1 AND business_id = $2
		`, userID, businessID)

		if err != nil {
			log.Printf("Failed to unsave business: %v", err)
			jsonError(w, "failed to unsave business", http.StatusInternalServerError)
			return
		}

		jsonResponse(w, map[string]string{"message": "business removed from saved"}, http.StatusOK)
	}
}

// GetSavedBusinesses returns user's saved businesses
func GetSavedBusinesses(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		if userID == "" {
			jsonError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		rows, err := db.Query(`
			SELECT 
				b.id, b.name, b.name_am,
				ST_Y(b.geom) as lat, ST_X(b.geom) as lng,
				b.address, b.city, b.avg_rating, b.review_count,
				c.name as category_name, c.icon as category_icon
			FROM user_saved_businesses usb
			JOIN businesses b ON usb.business_id = b.id
			LEFT JOIN categories c ON b.category_id = c.id
			WHERE usb.user_id = $1
			ORDER BY usb.created_at DESC
		`, userID)

		if err != nil {
			log.Printf("Failed to get saved businesses: %v", err)
			jsonError(w, "failed to get saved businesses", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var businesses []map[string]interface{}
		for rows.Next() {
			var id, name, city string
			var nameAm, address, categoryName, categoryIcon sql.NullString
			var lat, lng, avgRating float64
			var reviewCount int

			err := rows.Scan(
				&id, &name, &nameAm,
				&lat, &lng, &address, &city,
				&avgRating, &reviewCount,
				&categoryName, &categoryIcon,
			)
			if err != nil {
				continue
			}

			biz := map[string]interface{}{
				"id":           id,
				"name":         name,
				"lat":          lat,
				"lng":          lng,
				"city":         city,
				"avg_rating":   avgRating,
				"review_count": reviewCount,
			}
			if nameAm.Valid {
				biz["name_am"] = nameAm.String
			}
			if address.Valid {
				biz["address"] = address.String
			}
			if categoryName.Valid {
				biz["category"] = map[string]interface{}{
					"name": categoryName.String,
					"icon": categoryIcon.String,
				}
			}

			businesses = append(businesses, biz)
		}

		if businesses == nil {
			businesses = []map[string]interface{}{}
		}

		jsonResponse(w, businesses, http.StatusOK)
	}
}

// VerifyBusiness marks a business as verified (admin only)
func VerifyBusiness(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		if userID == "" {
			jsonError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		// Check if admin
		var role string
		db.QueryRow("SELECT role FROM users WHERE id = $1", userID).Scan(&role)
		if role != "admin" {
			jsonError(w, "forbidden", http.StatusForbidden)
			return
		}

		businessID := chi.URLParam(r, "id")
		if businessID == "" {
			jsonError(w, "business id required", http.StatusBadRequest)
			return
		}

		_, err := db.Exec(`
			UPDATE businesses 
			SET status = 'verified', verified_at = NOW(), verified_by = $1
			WHERE id = $2
		`, userID, businessID)

		if err != nil {
			log.Printf("Failed to verify business: %v", err)
			jsonError(w, "failed to verify business", http.StatusInternalServerError)
			return
		}

		jsonResponse(w, map[string]string{"message": "business verified"}, http.StatusOK)
	}
}
