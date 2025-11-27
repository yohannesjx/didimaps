package main

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func main() {
	r := chi.NewRouter()
	r.Use(middleware.Logger)

	// Health endpoint
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Proxy to OSRM
	osrmURL, _ := url.Parse("http://osrm:5000")
	r.Handle("/route*", httputil.NewSingleHostReverseProxy(osrmURL))

	// Proxy to Photon
	photonURL, _ := url.Parse("http://photon:2322")
	r.Handle("/search*", httputil.NewSingleHostReverseProxy(photonURL))

	// Proxy to TileServer
	tilesURL, _ := url.Parse("http://tileserver:80")
	r.Handle("/tiles*", httputil.NewSingleHostReverseProxy(tilesURL))

	http.ListenAndServe(":8000", r)
}
