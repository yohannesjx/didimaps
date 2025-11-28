package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"maps/api/internal/config"
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
	})

	// Protected API routes
	r.Route("/api", func(r chi.Router) {
		r.Use(middleware.JWTAuth(cfg.JWTSecret))

		// Routing endpoints
		r.Get("/route", handlers.GetRoute(cfg))
		r.Post("/match", handlers.MatchGPS(cfg))

		// Geocoding endpoints
		r.Get("/search", handlers.Search(cfg))
		r.Get("/reverse", handlers.ReverseGeocode(cfg))

		// Tile endpoints
		r.Get("/tiles/{z}/{x}/{y}.pbf", handlers.GetTile(cfg))
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
