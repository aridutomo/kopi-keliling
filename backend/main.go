package main

import (
	"kopi-keliling/config"
	"kopi-keliling/database"
	"kopi-keliling/routes"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

func main() {
	config.Load()
	database.Connect()
	database.Migrate()

	r := gin.Default()

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	})

	// API routes
	routes.SetupRoutes(r)

	// Serve Vite build — static assets
	r.Static("/assets", "./static/dist/assets")

	// SPA catch-all: semua non-/api → index.html
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		if strings.HasPrefix(path, "/api") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Endpoint tidak ditemukan"})
			return
		}
		// Coba serve static file dulu (favicon, manifest, dll)
		staticPath := filepath.Join("static", "dist", filepath.Clean(path))
		if info, err := os.Stat(staticPath); err == nil && !info.IsDir() {
			c.File(staticPath)
			return
		}
		// File tidak ada → biarkan React Router yang handle (/login, dll)
		c.File("./static/dist/index.html")
	})

	// Fallback root index
	r.GET("/", func(c *gin.Context) {
		c.File("./static/dist/index.html")
	})

	log.Printf("🚀 Kopi Keliling server running on :%s", config.App.Port)
	if err := r.Run(":" + config.App.Port); err != nil {
		log.Fatalf("❌ Server failed: %v", err)
	}
}
