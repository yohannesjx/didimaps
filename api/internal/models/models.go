package models

import (
	"database/sql"
	"time"
)

// User represents a user in the system
type User struct {
	ID            string         `json:"id"`
	Phone         string         `json:"phone"`
	PhoneVerified bool           `json:"phone_verified"`
	Name          sql.NullString `json:"name,omitempty"`
	PhotoURL      sql.NullString `json:"photo_url,omitempty"`
	Role          string         `json:"role"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

// UserResponse is the JSON response for a user
type UserResponse struct {
	ID            string  `json:"id"`
	Phone         string  `json:"phone"`
	PhoneVerified bool    `json:"phone_verified"`
	Name          *string `json:"name,omitempty"`
	PhotoURL      *string `json:"photo_url,omitempty"`
	Role          string  `json:"role"`
	CreatedAt     string  `json:"created_at"`
}

// Category represents a business category
type Category struct {
	ID        string         `json:"id"`
	Name      string         `json:"name"`
	NameAm    sql.NullString `json:"name_am,omitempty"`
	Icon      sql.NullString `json:"icon,omitempty"`
	ParentID  sql.NullString `json:"parent_id,omitempty"`
	SortOrder int            `json:"sort_order"`
}

// CategoryResponse is the JSON response for a category
type CategoryResponse struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	NameAm   *string `json:"name_am,omitempty"`
	Icon     *string `json:"icon,omitempty"`
	ParentID *string `json:"parent_id,omitempty"`
}

// Business represents a business listing
type Business struct {
	ID            string         `json:"id"`
	OwnerID       sql.NullString `json:"owner_id,omitempty"`
	Name          string         `json:"name"`
	NameAm        sql.NullString `json:"name_am,omitempty"`
	Description   sql.NullString `json:"description,omitempty"`
	DescriptionAm sql.NullString `json:"description_am,omitempty"`
	CategoryID    sql.NullString `json:"category_id,omitempty"`
	Phone         sql.NullString `json:"phone,omitempty"`
	Email         sql.NullString `json:"email,omitempty"`
	Website       sql.NullString `json:"website,omitempty"`
	Lat           float64        `json:"lat"`
	Lng           float64        `json:"lng"`
	Address       sql.NullString `json:"address,omitempty"`
	AddressAm     sql.NullString `json:"address_am,omitempty"`
	City          string         `json:"city"`
	Status        string         `json:"status"`
	AvgRating     float64        `json:"avg_rating"`
	ReviewCount   int            `json:"review_count"`
	ViewCount     int            `json:"view_count"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

// BusinessResponse is the JSON response for a business
type BusinessResponse struct {
	ID            string              `json:"id"`
	OwnerID       *string             `json:"owner_id,omitempty"`
	Name          string              `json:"name"`
	NameAm        *string             `json:"name_am,omitempty"`
	Description   *string             `json:"description,omitempty"`
	DescriptionAm *string             `json:"description_am,omitempty"`
	Category      *CategoryResponse   `json:"category,omitempty"`
	Phone         *string             `json:"phone,omitempty"`
	Email         *string             `json:"email,omitempty"`
	Website       *string             `json:"website,omitempty"`
	Lat           float64             `json:"lat"`
	Lng           float64             `json:"lng"`
	Address       *string             `json:"address,omitempty"`
	AddressAm     *string             `json:"address_am,omitempty"`
	City          string              `json:"city"`
	Status        string              `json:"status"`
	AvgRating     float64             `json:"avg_rating"`
	ReviewCount   int                 `json:"review_count"`
	ViewCount     int                 `json:"view_count"`
	Distance      *float64            `json:"distance_m,omitempty"` // distance in meters for nearby queries
	Hours         []BusinessHour      `json:"hours,omitempty"`
	Media         []MediaResponse     `json:"media,omitempty"`
	CreatedAt     string              `json:"created_at"`
}

// BusinessHour represents business operating hours
type BusinessHour struct {
	DayOfWeek int     `json:"day_of_week"`
	OpenTime  *string `json:"open_time,omitempty"`
	CloseTime *string `json:"close_time,omitempty"`
	IsClosed  bool    `json:"is_closed"`
}

// MediaResponse represents a media item
type MediaResponse struct {
	ID           string  `json:"id"`
	MediaType    string  `json:"media_type"`
	URL          string  `json:"url"`
	ThumbnailURL *string `json:"thumbnail_url,omitempty"`
	Caption      *string `json:"caption,omitempty"`
}

// Review represents a business review
type Review struct {
	ID         string    `json:"id"`
	BusinessID string    `json:"business_id"`
	UserID     string    `json:"user_id"`
	Rating     int       `json:"rating"`
	Comment    *string   `json:"comment,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

// ReviewResponse is the JSON response for a review
type ReviewResponse struct {
	ID        string        `json:"id"`
	User      *UserResponse `json:"user,omitempty"`
	Rating    int           `json:"rating"`
	Comment   *string       `json:"comment,omitempty"`
	CreatedAt string        `json:"created_at"`
}

// Post represents a user post pinned to the map
type Post struct {
	ID           string         `json:"id"`
	UserID       string         `json:"user_id"`
	BusinessID   sql.NullString `json:"business_id,omitempty"`
	ContentType  string         `json:"content_type"`
	MediaURL     string         `json:"media_url"`
	ThumbnailURL sql.NullString `json:"thumbnail_url,omitempty"`
	Caption      sql.NullString `json:"caption,omitempty"`
	Lat          *float64       `json:"lat,omitempty"`
	Lng          *float64       `json:"lng,omitempty"`
	ViewCount    int            `json:"view_count"`
	LikeCount    int            `json:"like_count"`
	Status       string         `json:"status"`
	CreatedAt    time.Time      `json:"created_at"`
	ExpiresAt    *time.Time     `json:"expires_at,omitempty"`
}

// PostResponse is the JSON response for a post
type PostResponse struct {
	ID           string        `json:"id"`
	User         *UserResponse `json:"user,omitempty"`
	BusinessID   *string       `json:"business_id,omitempty"`
	ContentType  string        `json:"content_type"`
	MediaURL     string        `json:"media_url"`
	ThumbnailURL *string       `json:"thumbnail_url,omitempty"`
	Caption      *string       `json:"caption,omitempty"`
	Lat          *float64      `json:"lat,omitempty"`
	Lng          *float64      `json:"lng,omitempty"`
	ViewCount    int           `json:"view_count"`
	LikeCount    int           `json:"like_count"`
	Liked        bool          `json:"liked"`
	CreatedAt    string        `json:"created_at"`
}

// Helper functions to convert sql.NullString to *string
func NullStringToPtr(ns sql.NullString) *string {
	if ns.Valid {
		return &ns.String
	}
	return nil
}

func PtrToNullString(s *string) sql.NullString {
	if s != nil {
		return sql.NullString{String: *s, Valid: true}
	}
	return sql.NullString{}
}
