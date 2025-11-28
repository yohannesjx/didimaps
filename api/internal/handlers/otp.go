package handlers

import (
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"regexp"
	"time"

	"maps/api/internal/config"
	"maps/api/internal/middleware"

	"github.com/golang-jwt/jwt/v5"
)

// SendCodeRequest is the request body for sending OTP
type SendCodeRequest struct {
	Phone string `json:"phone"`
}

// SendCodeResponse is the response for sending OTP
type SendCodeResponse struct {
	Message   string `json:"message"`
	ExpiresIn int    `json:"expires_in"` // seconds
}

// VerifyCodeRequest is the request body for verifying OTP
type VerifyCodeRequest struct {
	Phone string `json:"phone"`
	Code  string `json:"code"`
}

// VerifyCodeResponse is the response for verifying OTP
type VerifyCodeResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
	User         struct {
		ID            string  `json:"id"`
		Phone         string  `json:"phone"`
		PhoneVerified bool    `json:"phone_verified"`
		Name          *string `json:"name,omitempty"`
		Role          string  `json:"role"`
		IsNew         bool    `json:"is_new"`
	} `json:"user"`
}

var phoneRegex = regexp.MustCompile(`^\+?[0-9]{9,15}$`)

// SendCode sends an OTP code to the given phone number
func SendCode(db *sql.DB, cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req SendCodeRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "invalid request body", http.StatusBadRequest)
			return
		}

		// Validate phone number
		if !phoneRegex.MatchString(req.Phone) {
			jsonError(w, "invalid phone number format", http.StatusBadRequest)
			return
		}

		// Normalize phone number (add +251 if Ethiopian number without prefix)
		phone := normalizePhone(req.Phone)

		// Generate 6-digit OTP
		code, err := generateOTP(6)
		if err != nil {
			log.Printf("Failed to generate OTP: %v", err)
			jsonError(w, "failed to generate code", http.StatusInternalServerError)
			return
		}

		// Hardcode OTP for test number (0911234567)
		if phone == "+251911234567" {
			code = "123456"
		}

		// Store OTP in database (expires in 5 minutes)
		expiresAt := time.Now().Add(5 * time.Minute)
		_, err = db.Exec(`
			INSERT INTO otp_codes (phone, code, expires_at)
			VALUES ($1, $2, $3)
		`, phone, code, expiresAt)
		if err != nil {
			log.Printf("Failed to store OTP: %v", err)
			jsonError(w, "failed to send code", http.StatusInternalServerError)
			return
		}

		// TODO: In production, send SMS via Twilio/Africa's Talking/etc.
		// For now, log the code (development only!)
		log.Printf("[DEV] OTP for %s: %s", phone, code)

		response := SendCodeResponse{
			Message:   "verification code sent",
			ExpiresIn: 300, // 5 minutes
		}
		jsonResponse(w, response, http.StatusOK)
	}
}

// VerifyCode verifies the OTP and returns tokens
func VerifyCode(db *sql.DB, cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req VerifyCodeRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "invalid request body", http.StatusBadRequest)
			return
		}

		if req.Phone == "" || req.Code == "" {
			jsonError(w, "phone and code required", http.StatusBadRequest)
			return
		}

		phone := normalizePhone(req.Phone)

		// Find valid OTP
		var otpID string
		var attempts int
		err := db.QueryRow(`
			SELECT id, attempts FROM otp_codes
			WHERE phone = $1 AND code = $2 AND expires_at > NOW() AND verified = FALSE
			ORDER BY created_at DESC
			LIMIT 1
		`, phone, req.Code).Scan(&otpID, &attempts)

		if err == sql.ErrNoRows {
			// Increment attempts for rate limiting
			db.Exec(`
				UPDATE otp_codes SET attempts = attempts + 1
				WHERE phone = $1 AND expires_at > NOW() AND verified = FALSE
			`, phone)
			jsonError(w, "invalid or expired code", http.StatusUnauthorized)
			return
		}
		if err != nil {
			log.Printf("Failed to verify OTP: %v", err)
			jsonError(w, "verification failed", http.StatusInternalServerError)
			return
		}

		// Check max attempts
		if attempts >= 5 {
			jsonError(w, "too many attempts, request a new code", http.StatusTooManyRequests)
			return
		}

		// Mark OTP as verified
		db.Exec("UPDATE otp_codes SET verified = TRUE WHERE id = $1", otpID)

		// Find or create user
		var userID, userName, userRole string
		var isNew bool
		err = db.QueryRow(`
			SELECT id, COALESCE(name, ''), role FROM users WHERE phone = $1
		`, phone).Scan(&userID, &userName, &userRole)

		if err == sql.ErrNoRows {
			// Create new user
			err = db.QueryRow(`
				INSERT INTO users (phone, phone_verified, role)
				VALUES ($1, TRUE, 'user')
				RETURNING id, role
			`, phone).Scan(&userID, &userRole)
			if err != nil {
				log.Printf("Failed to create user: %v", err)
				jsonError(w, "failed to create account", http.StatusInternalServerError)
				return
			}
			isNew = true
		} else if err != nil {
			log.Printf("Failed to find user: %v", err)
			jsonError(w, "verification failed", http.StatusInternalServerError)
			return
		} else {
			// Update phone_verified if not already
			db.Exec("UPDATE users SET phone_verified = TRUE WHERE id = $1", userID)
		}

		// Generate tokens
		accessToken, err := generateToken(userID, userRole, cfg.JWTSecret, time.Duration(cfg.JWTExpiry)*time.Minute)
		if err != nil {
			jsonError(w, "failed to generate token", http.StatusInternalServerError)
			return
		}

		refreshToken, err := generateToken(userID, userRole, cfg.JWTSecret, time.Duration(cfg.RefreshExpiry)*time.Hour)
		if err != nil {
			jsonError(w, "failed to generate refresh token", http.StatusInternalServerError)
			return
		}

		// Store session
		_, err = db.Exec(`
			INSERT INTO sessions (user_id, refresh_token, device_info, ip_address, expires_at)
			VALUES ($1, $2, $3, $4, $5)
		`, userID, refreshToken, r.UserAgent(), r.RemoteAddr, time.Now().Add(time.Duration(cfg.RefreshExpiry)*time.Hour))
		if err != nil {
			log.Printf("Failed to store session: %v", err)
		}

		response := VerifyCodeResponse{
			AccessToken:  accessToken,
			RefreshToken: refreshToken,
			ExpiresIn:    cfg.JWTExpiry * 60,
			TokenType:    "Bearer",
		}
		response.User.ID = userID
		response.User.Phone = phone
		response.User.PhoneVerified = true
		response.User.Role = userRole
		response.User.IsNew = isNew
		if userName != "" {
			response.User.Name = &userName
		}

		jsonResponse(w, response, http.StatusOK)
	}
}

// generateOTP generates a random numeric OTP of the given length
func generateOTP(length int) (string, error) {
	const digits = "0123456789"
	result := make([]byte, length)
	for i := range result {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(digits))))
		if err != nil {
			return "", err
		}
		result[i] = digits[n.Int64()]
	}
	return string(result), nil
}

// normalizePhone normalizes Ethiopian phone numbers
func normalizePhone(phone string) string {
	// Remove spaces and dashes
	phone = regexp.MustCompile(`[\s-]`).ReplaceAllString(phone, "")

	// If starts with 0, assume Ethiopian and add +251
	if len(phone) == 10 && phone[0] == '0' {
		return "+251" + phone[1:]
	}
	// If starts with 9 and is 9 digits, assume Ethiopian
	if len(phone) == 9 && phone[0] == '9' {
		return "+251" + phone
	}
	// If doesn't start with +, add it
	if phone[0] != '+' {
		return "+" + phone
	}
	return phone
}

// generateToken creates a JWT token (reusing from auth.go)
func generateTokenOTP(userID, role, secret string, expiry time.Duration) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"role":    role,
		"exp":     time.Now().Add(expiry).Unix(),
		"iat":     time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// GetMe returns the current user's profile
func GetMe(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		if userID == "" {
			jsonError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var user struct {
			ID            string  `json:"id"`
			Phone         string  `json:"phone"`
			PhoneVerified bool    `json:"phone_verified"`
			Name          *string `json:"name,omitempty"`
			PhotoURL      *string `json:"photo_url,omitempty"`
			Role          string  `json:"role"`
			CreatedAt     string  `json:"created_at"`
		}

		var name, photoURL sql.NullString
		var createdAt time.Time
		err := db.QueryRow(`
			SELECT id, phone, phone_verified, name, photo_url, role, created_at
			FROM users WHERE id = $1
		`, userID).Scan(&user.ID, &user.Phone, &user.PhoneVerified, &name, &photoURL, &user.Role, &createdAt)

		if err == sql.ErrNoRows {
			jsonError(w, "user not found", http.StatusNotFound)
			return
		}
		if err != nil {
			log.Printf("Failed to get user: %v", err)
			jsonError(w, "failed to get user", http.StatusInternalServerError)
			return
		}

		if name.Valid {
			user.Name = &name.String
		}
		if photoURL.Valid {
			user.PhotoURL = &photoURL.String
		}
		user.CreatedAt = createdAt.Format(time.RFC3339)

		jsonResponse(w, user, http.StatusOK)
	}
}

// UpdateMe updates the current user's profile
func UpdateMe(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		if userID == "" {
			jsonError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var req struct {
			Name     *string `json:"name"`
			PhotoURL *string `json:"photo_url"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "invalid request body", http.StatusBadRequest)
			return
		}

		_, err := db.Exec(`
			UPDATE users SET name = COALESCE($1, name), photo_url = COALESCE($2, photo_url)
			WHERE id = $3
		`, req.Name, req.PhotoURL, userID)

		if err != nil {
			log.Printf("Failed to update user: %v", err)
			jsonError(w, "failed to update profile", http.StatusInternalServerError)
			return
		}

		jsonResponse(w, map[string]string{"message": "profile updated"}, http.StatusOK)
	}
}

// getUserIDFromContext extracts user ID from request context
func getUserIDFromContext(r *http.Request) string {
	claims, ok := r.Context().Value(middleware.UserContextKey).(*middleware.UserClaims)
	if !ok {
		return ""
	}
	return claims.UserID
}

// Helper to format errors
func jsonErrorf(w http.ResponseWriter, format string, status int, args ...interface{}) {
	jsonError(w, fmt.Sprintf(format, args...), status)
}
