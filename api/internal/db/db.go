package db

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
	"maps/api/internal/config"
)

// Connect opens a connection to the PostgreSQL database
func Connect(cfg *config.Config) (*sql.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode,
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Test connection with retries
	var lastErr error
	for i := 0; i < 30; i++ {
		if err := db.Ping(); err != nil {
			lastErr = err
			log.Printf("Waiting for database... attempt %d/30", i+1)
			time.Sleep(2 * time.Second)
			continue
		}
		log.Println("Database connected successfully")
		return db, nil
	}

	return nil, fmt.Errorf("failed to connect to database after 30 attempts: %w", lastErr)
}
