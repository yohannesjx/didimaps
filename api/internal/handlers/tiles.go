package handlers

import (
	"fmt"
	"io"
	"net/http"

	"maps/api/internal/config"
	"maps/api/internal/middleware"

	"github.com/go-chi/chi/v5"
)

// GetTile proxies tile requests to mbtileserver
// mbtileserver URL format: /services/{tileset}/{z}/{x}/{y}.pbf
func GetTile(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		z := chi.URLParam(r, "z")
		x := chi.URLParam(r, "x")
		y := chi.URLParam(r, "y")

		if err := middleware.ValidateTileCoords(z, x, y); err != nil {
			jsonError(w, err.Error(), http.StatusBadRequest)
			return
		}

		// mbtileserver format: /services/{tileset}/{z}/{x}/{y}.pbf
		// Default tileset name based on .mbtiles filename
		tileset := r.URL.Query().Get("tileset")
		if tileset == "" {
			tileset = "addis" // default tileset name (from mbtiles filename)
		}

		tileURL := fmt.Sprintf("%s/services/%s/tiles/%s/%s/%s.pbf", cfg.TileHost, tileset, z, x, y)

		resp, err := http.Get(tileURL)
		if err != nil {
			jsonError(w, "tile service unavailable", http.StatusServiceUnavailable)
			return
		}
		defer resp.Body.Close()

		// Propagate status code and relevant headers from mbtileserver.
		// Do NOT force Content-Encoding; mismatched encoding causes
		// ERR_CONTENT_DECODING_FAILED in browsers.
		for k, vv := range resp.Header {
			// Skip hop-by-hop headers
			if k == "Connection" || k == "Keep-Alive" || k == "Proxy-Authenticate" ||
				k == "Proxy-Authorization" || k == "Te" || k == "Trailers" ||
				k == "Transfer-Encoding" || k == "Upgrade" || k == "Content-Encoding" {
				continue
			}
			for _, v := range vv {
				w.Header().Add(k, v)
			}
		}
		w.Header().Set("Cache-Control", "public, max-age=86400")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)
	}
}

// GetTileJSON returns the TileJSON metadata for a tileset
func GetTileJSON(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tileset := r.URL.Query().Get("tileset")
		if tileset == "" {
			tileset = "osm"
		}

		tileJSONURL := fmt.Sprintf("%s/services/%s", cfg.TileHost, tileset)

		resp, err := http.Get(tileJSONURL)
		if err != nil {
			jsonError(w, "tile service unavailable", http.StatusServiceUnavailable)
			return
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			jsonError(w, "failed to read tilejson", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.WriteHeader(resp.StatusCode)
		w.Write(body)
	}
}

// ListTilesets returns available tilesets from mbtileserver
func ListTilesets(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		resp, err := http.Get(fmt.Sprintf("%s/services", cfg.TileHost))
		if err != nil {
			jsonError(w, "tile service unavailable", http.StatusServiceUnavailable)
			return
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			jsonError(w, "failed to read tilesets", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.WriteHeader(resp.StatusCode)
		w.Write(body)
	}
}
