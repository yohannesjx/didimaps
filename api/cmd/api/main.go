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

	// API routes
	r.Route("/api", func(r chi.Router) {
		// Public tile endpoints (no auth required)
		r.Group(func(public chi.Router) {
			public.Route("/tiles", func(tr chi.Router) {
				tr.Get("/{z}/{x}/{y}.pbf", handlers.GetTile(cfg))
				tr.Get("/json", handlers.GetTileJSON(cfg))
				tr.Get("/list", handlers.ListTilesets(cfg))
			})

			// Public categories and nearby business search for anonymous map usage
			public.Get("/categories", handlers.GetCategories(database))
			public.Get("/business/nearby", handlers.GetNearbyBusinesses(database))
		})

		// Protected endpoints - apply JWT middleware within this group
		r.Group(func(priv chi.Router) {
			priv.Use(middleware.JWTAuth(cfg.JWTSecret))

			// User profile
			priv.Get("/me", handlers.GetMe(database))
			priv.Put("/me", handlers.UpdateMe(database))

			// Routing endpoints
			priv.Get("/route", handlers.GetRoute(cfg))
			priv.Post("/match", handlers.MatchGPS(cfg))

			// Geocoding endpoints
			priv.Get("/search", handlers.Search(cfg))
			priv.Get("/reverse", handlers.ReverseGeocode(cfg))

			// Business endpoints (authenticated operations)
			priv.Route("/business", func(br chi.Router) {
				br.Post("/", handlers.CreateBusiness(database))
				br.Get("/search", handlers.SearchBusinesses(database))
				br.Get("/saved", handlers.GetSavedBusinesses(database))
				br.Get("/{id}", handlers.GetBusiness(database))
				br.Put("/{id}", handlers.UpdateBusiness(database))
				br.Post("/{id}/save", handlers.SaveBusiness(database))
				br.Delete("/{id}/save", handlers.UnsaveBusiness(database))
				br.Post("/{id}/verify", handlers.VerifyBusiness(database))
			})

			// Posts endpoints
			priv.Route("/posts", func(pr chi.Router) {
				pr.Post("/", handlers.CreatePost(database))
				pr.Get("/feed", handlers.GetFeed(database))
				pr.Get("/user/{userId}", handlers.GetUserPosts(database))
				pr.Get("/{id}", handlers.GetPost(database))
				pr.Delete("/{id}", handlers.DeletePost(database))
				pr.Post("/{id}/like", handlers.LikePost(database))
				pr.Delete("/{id}/like", handlers.UnlikePost(database))
			})
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
