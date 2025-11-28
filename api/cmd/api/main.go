package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"maps/api/internal/config"
	"maps/api/internal/db"
	"maps/api/internal/handlers"
	"maps/api/internal/middleware"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func main() {
	// Initialize logger
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	// Load configuration
	cfg := config.Load()

	// Connect to database
	database, err := db.Connect(cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}
	defer database.Close()

	// Run migrations
	if err := db.RunMigrations(database); err != nil {
		log.Fatal().Err(err).Msg("Failed to run migrations")
	}

	// Initialize router
	r := chi.NewRouter()

	// Global middleware
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.CORS)
	r.Use(chimw.Timeout(30 * time.Second))

	// Rate limiting
	rateLimiter := middleware.NewRateLimiter(cfg.RateLimit)
	r.Use(rateLimiter.Limit)

	// Health check (public)
	r.Get("/health", handlers.Health)

	// Auth routes (public)
	r.Route("/auth", func(r chi.Router) {
		r.Post("/login", handlers.Login(cfg))
		r.Post("/refresh", handlers.RefreshToken(cfg))
		r.Post("/logout", handlers.Logout)
		// Phone OTP auth
		r.Post("/send-code", handlers.SendCode(database, cfg))
		r.Post("/verify-code", handlers.VerifyCode(database, cfg))
	})

	// Protected API routes
	r.Route("/api", func(r chi.Router) {
		// Public tile endpoints (no auth required)
		r.Route("/tiles", func(r chi.Router) {
			r.Get("/{z}/{x}/{y}.pbf", handlers.GetTile(cfg))
			r.Get("/json", handlers.GetTileJSON(cfg))
			r.Get("/list", handlers.ListTilesets(cfg))
		})

		// Everything below this uses JWT auth
		r.Use(middleware.JWTAuth(cfg.JWTSecret))

		// User profile
		r.Get("/me", handlers.GetMe(database))
		r.Put("/me", handlers.UpdateMe(database))

		// Routing endpoints
		r.Get("/route", handlers.GetRoute(cfg))
		r.Post("/match", handlers.MatchGPS(cfg))

		// Geocoding endpoints
		r.Get("/search", handlers.Search(cfg))
		r.Get("/reverse", handlers.ReverseGeocode(cfg))

		// Categories
		r.Get("/categories", handlers.GetCategories(database))

		// Business endpoints
		r.Route("/business", func(r chi.Router) {
			r.Post("/", handlers.CreateBusiness(database))
			r.Get("/nearby", handlers.GetNearbyBusinesses(database))
			r.Get("/search", handlers.SearchBusinesses(database))
			r.Get("/saved", handlers.GetSavedBusinesses(database))
			r.Get("/{id}", handlers.GetBusiness(database))
			r.Put("/{id}", handlers.UpdateBusiness(database))
			r.Post("/{id}/save", handlers.SaveBusiness(database))
			r.Delete("/{id}/save", handlers.UnsaveBusiness(database))
			r.Post("/{id}/verify", handlers.VerifyBusiness(database))
		})

		// Posts endpoints
		r.Route("/posts", func(r chi.Router) {
			r.Post("/", handlers.CreatePost(database))
			r.Get("/feed", handlers.GetFeed(database))
			r.Get("/user/{userId}", handlers.GetUserPosts(database))
			r.Get("/{id}", handlers.GetPost(database))
			r.Delete("/{id}", handlers.DeletePost(database))
			r.Post("/{id}/like", handlers.LikePost(database))
			r.Delete("/{id}/like", handlers.UnlikePost(database))
		})
	})

	// Create server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		log.Info().Str("port", cfg.Port).Msg("Starting server")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("Server failed")
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal().Err(err).Msg("Server forced to shutdown")
	}

	log.Info().Msg("Server exited properly")
}
