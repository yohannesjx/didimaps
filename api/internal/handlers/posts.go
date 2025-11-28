package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"maps/api/internal/middleware"

	"github.com/go-chi/chi/v5"
)

// CreatePostRequest is the request body for creating a post
type CreatePostRequest struct {
	ContentType  string   `json:"content_type"` // photo, video
	MediaURL     string   `json:"media_url"`
	ThumbnailURL *string  `json:"thumbnail_url,omitempty"`
	Caption      *string  `json:"caption,omitempty"`
	BusinessID   *string  `json:"business_id,omitempty"`
	Lat          *float64 `json:"lat,omitempty"`
	Lng          *float64 `json:"lng,omitempty"`
	ExpiresIn    *int     `json:"expires_in_hours,omitempty"` // for stories
}

// PostResponseItem is the response for a single post
type PostResponseItem struct {
	ID           string                 `json:"id"`
	User         map[string]interface{} `json:"user"`
	BusinessID   *string                `json:"business_id,omitempty"`
	ContentType  string                 `json:"content_type"`
	MediaURL     string                 `json:"media_url"`
	ThumbnailURL *string                `json:"thumbnail_url,omitempty"`
	Caption      *string                `json:"caption,omitempty"`
	Lat          *float64               `json:"lat,omitempty"`
	Lng          *float64               `json:"lng,omitempty"`
	ViewCount    int                    `json:"view_count"`
	LikeCount    int                    `json:"like_count"`
	Liked        bool                   `json:"liked"`
	CreatedAt    string                 `json:"created_at"`
}

// CreatePost creates a new post
func CreatePost(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		if userID == "" {
			jsonError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var req CreatePostRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "invalid request body", http.StatusBadRequest)
			return
		}

		if req.ContentType != "photo" && req.ContentType != "video" {
			jsonError(w, "content_type must be 'photo' or 'video'", http.StatusBadRequest)
			return
		}

		if req.MediaURL == "" {
			jsonError(w, "media_url is required", http.StatusBadRequest)
			return
		}

		// Build geometry if lat/lng provided
		var geomSQL string
		var args []interface{}
		argNum := 1

		args = append(args, userID, req.ContentType, req.MediaURL, req.ThumbnailURL, req.Caption, req.BusinessID)
		argNum = 7

		if req.Lat != nil && req.Lng != nil {
			geomSQL = ", ST_SetSRID(ST_MakePoint($" + strconv.Itoa(argNum) + ", $" + strconv.Itoa(argNum+1) + "), 4326)"
			args = append(args, *req.Lng, *req.Lat)
			argNum += 2
		}

		var expiresAt *time.Time
		if req.ExpiresIn != nil && *req.ExpiresIn > 0 {
			t := time.Now().Add(time.Duration(*req.ExpiresIn) * time.Hour)
			expiresAt = &t
		}
		args = append(args, expiresAt)

		query := `
			INSERT INTO posts (user_id, content_type, media_url, thumbnail_url, caption, business_id` +
			func() string {
				if req.Lat != nil && req.Lng != nil {
					return ", geom"
				}
				return ""
			}() + `, expires_at)
			VALUES ($1, $2, $3, $4, $5, $6` + geomSQL + `, $` + strconv.Itoa(argNum) + `)
			RETURNING id`

		var postID string
		err := db.QueryRow(query, args...).Scan(&postID)
		if err != nil {
			log.Printf("Failed to create post: %v", err)
			jsonError(w, "failed to create post", http.StatusInternalServerError)
			return
		}

		jsonResponse(w, map[string]string{
			"id":      postID,
			"message": "post created",
		}, http.StatusCreated)
	}
}

// GetFeed returns the post feed
func GetFeed(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)

		limitStr := r.URL.Query().Get("limit")
		offsetStr := r.URL.Query().Get("offset")
		latStr := r.URL.Query().Get("lat")
		lngStr := r.URL.Query().Get("lng")

		limit := 20
		if limitStr != "" {
			limit, _ = strconv.Atoi(limitStr)
		}
		if limit > 50 {
			limit = 50
		}

		offset := 0
		if offsetStr != "" {
			offset, _ = strconv.Atoi(offsetStr)
		}

		query := `
			SELECT 
				p.id, p.user_id, p.business_id, p.content_type, p.media_url, p.thumbnail_url, p.caption,
				ST_Y(p.geom) as lat, ST_X(p.geom) as lng,
				p.view_count, p.like_count, p.created_at,
				u.name as user_name, u.photo_url as user_photo,
				COALESCE((SELECT TRUE FROM post_likes WHERE post_id = p.id AND user_id = $1), FALSE) as liked
			FROM posts p
			JOIN users u ON p.user_id = u.id
			WHERE p.status = 'active'
			AND (p.expires_at IS NULL OR p.expires_at > NOW())
		`
		args := []interface{}{userID}
		argNum := 2

		// If location provided, order by distance
		if latStr != "" && lngStr != "" {
			lat, _ := strconv.ParseFloat(latStr, 64)
			lng, _ := strconv.ParseFloat(lngStr, 64)
			query += ` ORDER BY 
				CASE WHEN p.geom IS NOT NULL 
					THEN ST_Distance(p.geom::geography, ST_SetSRID(ST_MakePoint($` + strconv.Itoa(argNum) + `, $` + strconv.Itoa(argNum+1) + `), 4326)::geography)
					ELSE 999999999 
				END,
				p.created_at DESC`
			args = append(args, lng, lat)
			argNum += 2
		} else {
			query += ` ORDER BY p.created_at DESC`
		}

		query += ` LIMIT $` + strconv.Itoa(argNum) + ` OFFSET $` + strconv.Itoa(argNum+1)
		args = append(args, limit, offset)

		rows, err := db.Query(query, args...)
		if err != nil {
			log.Printf("Failed to get feed: %v", err)
			jsonError(w, "failed to get feed", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var posts []PostResponseItem
		for rows.Next() {
			var p PostResponseItem
			var postUserID string
			var businessID, thumbnailURL, caption, userName, userPhoto sql.NullString
			var lat, lng sql.NullFloat64
			var createdAt time.Time

			err := rows.Scan(
				&p.ID, &postUserID, &businessID, &p.ContentType, &p.MediaURL, &thumbnailURL, &caption,
				&lat, &lng,
				&p.ViewCount, &p.LikeCount, &createdAt,
				&userName, &userPhoto, &p.Liked,
			)
			if err != nil {
				log.Printf("Error scanning post: %v", err)
				continue
			}

			if businessID.Valid {
				p.BusinessID = &businessID.String
			}
			if thumbnailURL.Valid {
				p.ThumbnailURL = &thumbnailURL.String
			}
			if caption.Valid {
				p.Caption = &caption.String
			}
			if lat.Valid {
				p.Lat = &lat.Float64
			}
			if lng.Valid {
				p.Lng = &lng.Float64
			}
			p.CreatedAt = createdAt.Format(time.RFC3339)

			p.User = map[string]interface{}{
				"id": postUserID,
			}
			if userName.Valid {
				p.User["name"] = userName.String
			}
			if userPhoto.Valid {
				p.User["photo_url"] = userPhoto.String
			}

			posts = append(posts, p)
		}

		if posts == nil {
			posts = []PostResponseItem{}
		}

		jsonResponse(w, map[string]interface{}{
			"posts":  posts,
			"count":  len(posts),
			"offset": offset,
			"limit":  limit,
		}, http.StatusOK)
	}
}

// GetPost returns a single post
func GetPost(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		postID := chi.URLParam(r, "id")
		if postID == "" {
			jsonError(w, "post id required", http.StatusBadRequest)
			return
		}

		userID := getUserIDFromContext(r)

		var p PostResponseItem
		var postUserID string
		var businessID, thumbnailURL, caption, userName, userPhoto sql.NullString
		var lat, lng sql.NullFloat64
		var createdAt time.Time

		err := db.QueryRow(`
			SELECT 
				p.id, p.user_id, p.business_id, p.content_type, p.media_url, p.thumbnail_url, p.caption,
				ST_Y(p.geom) as lat, ST_X(p.geom) as lng,
				p.view_count, p.like_count, p.created_at,
				u.name as user_name, u.photo_url as user_photo,
				COALESCE((SELECT TRUE FROM post_likes WHERE post_id = p.id AND user_id = $2), FALSE) as liked
			FROM posts p
			JOIN users u ON p.user_id = u.id
			WHERE p.id = $1 AND p.status = 'active'
		`, postID, userID).Scan(
			&p.ID, &postUserID, &businessID, &p.ContentType, &p.MediaURL, &thumbnailURL, &caption,
			&lat, &lng,
			&p.ViewCount, &p.LikeCount, &createdAt,
			&userName, &userPhoto, &p.Liked,
		)

		if err == sql.ErrNoRows {
			jsonError(w, "post not found", http.StatusNotFound)
			return
		}
		if err != nil {
			log.Printf("Failed to get post: %v", err)
			jsonError(w, "failed to get post", http.StatusInternalServerError)
			return
		}

		if businessID.Valid {
			p.BusinessID = &businessID.String
		}
		if thumbnailURL.Valid {
			p.ThumbnailURL = &thumbnailURL.String
		}
		if caption.Valid {
			p.Caption = &caption.String
		}
		if lat.Valid {
			p.Lat = &lat.Float64
		}
		if lng.Valid {
			p.Lng = &lng.Float64
		}
		p.CreatedAt = createdAt.Format(time.RFC3339)

		p.User = map[string]interface{}{
			"id": postUserID,
		}
		if userName.Valid {
			p.User["name"] = userName.String
		}
		if userPhoto.Valid {
			p.User["photo_url"] = userPhoto.String
		}

		// Increment view count
		db.Exec("UPDATE posts SET view_count = view_count + 1 WHERE id = $1", postID)

		jsonResponse(w, p, http.StatusOK)
	}
}

// LikePost likes a post
func LikePost(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		if userID == "" {
			jsonError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		postID := chi.URLParam(r, "id")
		if postID == "" {
			jsonError(w, "post id required", http.StatusBadRequest)
			return
		}

		_, err := db.Exec(`
			INSERT INTO post_likes (post_id, user_id)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING
		`, postID, userID)

		if err != nil {
			log.Printf("Failed to like post: %v", err)
			jsonError(w, "failed to like post", http.StatusInternalServerError)
			return
		}

		// Update like count
		db.Exec("UPDATE posts SET like_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = $1) WHERE id = $1", postID)

		jsonResponse(w, map[string]string{"message": "post liked"}, http.StatusOK)
	}
}

// UnlikePost unlikes a post
func UnlikePost(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		if userID == "" {
			jsonError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		postID := chi.URLParam(r, "id")
		if postID == "" {
			jsonError(w, "post id required", http.StatusBadRequest)
			return
		}

		_, err := db.Exec(`
			DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2
		`, postID, userID)

		if err != nil {
			log.Printf("Failed to unlike post: %v", err)
			jsonError(w, "failed to unlike post", http.StatusInternalServerError)
			return
		}

		// Update like count
		db.Exec("UPDATE posts SET like_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = $1) WHERE id = $1", postID)

		jsonResponse(w, map[string]string{"message": "post unliked"}, http.StatusOK)
	}
}

// DeletePost deletes a post (owner only)
func DeletePost(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		if userID == "" {
			jsonError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		postID := chi.URLParam(r, "id")
		if postID == "" {
			jsonError(w, "post id required", http.StatusBadRequest)
			return
		}

		// Check ownership
		var ownerID string
		err := db.QueryRow("SELECT user_id FROM posts WHERE id = $1", postID).Scan(&ownerID)
		if err == sql.ErrNoRows {
			jsonError(w, "post not found", http.StatusNotFound)
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

		_, err = db.Exec("UPDATE posts SET status = 'deleted' WHERE id = $1", postID)
		if err != nil {
			log.Printf("Failed to delete post: %v", err)
			jsonError(w, "failed to delete post", http.StatusInternalServerError)
			return
		}

		jsonResponse(w, map[string]string{"message": "post deleted"}, http.StatusOK)
	}
}

// GetUserPosts returns posts by a specific user
func GetUserPosts(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		targetUserID := chi.URLParam(r, "userId")
		if targetUserID == "" {
			jsonError(w, "user id required", http.StatusBadRequest)
			return
		}

		currentUserID := getUserIDFromContext(r)

		limitStr := r.URL.Query().Get("limit")
		limit := 20
		if limitStr != "" {
			limit, _ = strconv.Atoi(limitStr)
		}
		if limit > 50 {
			limit = 50
		}

		rows, err := db.Query(`
			SELECT 
				p.id, p.content_type, p.media_url, p.thumbnail_url, p.caption,
				ST_Y(p.geom) as lat, ST_X(p.geom) as lng,
				p.view_count, p.like_count, p.created_at,
				COALESCE((SELECT TRUE FROM post_likes WHERE post_id = p.id AND user_id = $2), FALSE) as liked
			FROM posts p
			WHERE p.user_id = $1 AND p.status = 'active'
			ORDER BY p.created_at DESC
			LIMIT $3
		`, targetUserID, currentUserID, limit)

		if err != nil {
			log.Printf("Failed to get user posts: %v", err)
			jsonError(w, "failed to get posts", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var posts []map[string]interface{}
		for rows.Next() {
			var id, contentType, mediaURL string
			var thumbnailURL, caption sql.NullString
			var lat, lng sql.NullFloat64
			var viewCount, likeCount int
			var createdAt time.Time
			var liked bool

			err := rows.Scan(
				&id, &contentType, &mediaURL, &thumbnailURL, &caption,
				&lat, &lng, &viewCount, &likeCount, &createdAt, &liked,
			)
			if err != nil {
				continue
			}

			post := map[string]interface{}{
				"id":           id,
				"content_type": contentType,
				"media_url":    mediaURL,
				"view_count":   viewCount,
				"like_count":   likeCount,
				"liked":        liked,
				"created_at":   createdAt.Format(time.RFC3339),
			}
			if thumbnailURL.Valid {
				post["thumbnail_url"] = thumbnailURL.String
			}
			if caption.Valid {
				post["caption"] = caption.String
			}
			if lat.Valid {
				post["lat"] = lat.Float64
			}
			if lng.Valid {
				post["lng"] = lng.Float64
			}

			posts = append(posts, post)
		}

		if posts == nil {
			posts = []map[string]interface{}{}
		}

		jsonResponse(w, posts, http.StatusOK)
	}
}
