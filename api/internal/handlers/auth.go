package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"maps/api/internal/config"

	"github.com/golang-jwt/jwt/v5"
)

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type UserClaims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func Login(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req LoginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "invalid request body", http.StatusBadRequest)
			return
		}

		if req.Email == "" || req.Password == "" {
			jsonError(w, "email and password required", http.StatusBadRequest)
			return
		}

		// TODO: Validate credentials against database
		// For now, mock user validation
		userID := "user_123"
		role := "rider" // rider, driver, admin, internal-service

		// Generate access token
		accessToken, err := generateToken(userID, role, cfg.JWTSecret, time.Duration(cfg.JWTExpiry)*time.Minute)
		if err != nil {
			jsonError(w, "failed to generate token", http.StatusInternalServerError)
			return
		}

		// Generate refresh token
		refreshToken, err := generateToken(userID, role, cfg.JWTSecret, time.Duration(cfg.RefreshExpiry)*time.Hour)
		if err != nil {
			jsonError(w, "failed to generate refresh token", http.StatusInternalServerError)
			return
		}

		response := TokenResponse{
			AccessToken:  accessToken,
			RefreshToken: refreshToken,
			ExpiresIn:    cfg.JWTExpiry * 60,
			TokenType:    "Bearer",
		}

		jsonResponse(w, response, http.StatusOK)
	}
}

func RefreshToken(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req RefreshRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "invalid request body", http.StatusBadRequest)
			return
		}

		if req.RefreshToken == "" {
			jsonError(w, "refresh token required", http.StatusBadRequest)
			return
		}

		// Parse and validate refresh token
		claims := &UserClaims{}
		token, err := jwt.ParseWithClaims(req.RefreshToken, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(cfg.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			jsonError(w, "invalid refresh token", http.StatusUnauthorized)
			return
		}

		// Generate new access token
		accessToken, err := generateToken(claims.UserID, claims.Role, cfg.JWTSecret, time.Duration(cfg.JWTExpiry)*time.Minute)
		if err != nil {
			jsonError(w, "failed to generate token", http.StatusInternalServerError)
			return
		}

		// Generate new refresh token (token rotation)
		refreshToken, err := generateToken(claims.UserID, claims.Role, cfg.JWTSecret, time.Duration(cfg.RefreshExpiry)*time.Hour)
		if err != nil {
			jsonError(w, "failed to generate refresh token", http.StatusInternalServerError)
			return
		}

		response := TokenResponse{
			AccessToken:  accessToken,
			RefreshToken: refreshToken,
			ExpiresIn:    cfg.JWTExpiry * 60,
			TokenType:    "Bearer",
		}

		jsonResponse(w, response, http.StatusOK)
	}
}

func Logout(w http.ResponseWriter, r *http.Request) {
	// TODO: Add token to blacklist in Redis
	jsonResponse(w, map[string]string{"message": "logged out successfully"}, http.StatusOK)
}

func generateToken(userID, role, secret string, expiry time.Duration) (string, error) {
	claims := UserClaims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
