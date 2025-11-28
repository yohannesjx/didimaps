package handlers

import (
	"fmt"
	"io"
	"net/http"

	"maps/api/internal/config"
	"maps/api/internal/middleware"

	"github.com/go-chi/chi/v5"
)

func GetTile(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		z := chi.URLParam(r, "z")
		x := chi.URLParam(r, "x")
		y := chi.URLParam(r, "y")

		if err := middleware.ValidateTileCoords(z, x, y); err != nil {
			jsonError(w, err.Error(), http.StatusBadRequest)
			return
		}

		tileURL := fmt.Sprintf("%s/data/v3/%s/%s/%s.pbf", cfg.TileHost, z, x, y)

		resp, err := http.Get(tileURL)
		if err != nil {
			jsonError(w, "tile service unavailable", http.StatusServiceUnavailable)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusNotFound {
			w.WriteHeader(http.StatusNotFound)
			return
		}

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			jsonError(w, "failed to read tile", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/x-protobuf")
		w.Header().Set("Content-Encoding", "gzip")
		w.Header().Set("Cache-Control", "public, max-age=86400")
		w.WriteHeader(resp.StatusCode)
		w.Write(body)
	}
}
