package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type AppConfig struct {
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	JWTSecret  string
	Port       string
}

var App AppConfig

func Load() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using OS environment variables")
	}

	App = AppConfig{
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "3306"),
		DBUser:     getEnv("DB_USER", "root"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "kopi_keliling"),
		JWTSecret:  getEnv("JWT_SECRET", "change-this-secret-in-production"),
		Port:       getEnv("PORT", "8080"),
	}
}

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}
