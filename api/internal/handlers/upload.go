package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"maps/api/internal/config"
)

// UploadFile handles file uploads
func UploadFile(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Parse multipart form (10MB max)
		r.ParseMultipartForm(10 << 20)

		file, handler, err := r.FormFile("file")
		if err != nil {
			jsonError(w, "invalid file", http.StatusBadRequest)
			return
		}
		defer file.Close()

		// Validate file type
		ext := strings.ToLower(filepath.Ext(handler.Filename))
		if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
			jsonError(w, "only jpg, png, and webp allowed", http.StatusBadRequest)
			return
		}

		// Create uploads directory if not exists
		uploadDir := "./uploads"
		if err := os.MkdirAll(uploadDir, 0755); err != nil {
			jsonError(w, "failed to create upload directory", http.StatusInternalServerError)
			return
		}

		// Generate unique filename
		filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), handler.Filename)
		filepath := filepath.Join(uploadDir, filename)

		// Save file
		dst, err := os.Create(filepath)
		if err != nil {
			jsonError(w, "failed to save file", http.StatusInternalServerError)
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			jsonError(w, "failed to write file", http.StatusInternalServerError)
			return
		}

		// Return public URL
		// Assuming /uploads is served statically
		publicURL := fmt.Sprintf("/uploads/%s", filename)
		jsonResponse(w, map[string]string{"url": publicURL}, http.StatusOK)
	}
}
