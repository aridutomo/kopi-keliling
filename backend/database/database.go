package database

import (
	"fmt"
	"kopi-keliling/config"
	"log"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	dsn := fmt.Sprintf(
		"%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		config.App.DBUser,
		config.App.DBPassword,
		config.App.DBHost,
		config.App.DBPort,
		config.App.DBName,
	)

	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatalf("❌ Failed to connect database: %v", err)
	}

	log.Println("✅ Database connected")
}
