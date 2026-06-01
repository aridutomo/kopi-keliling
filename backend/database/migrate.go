package database

import (
	"kopi-keliling/models"
	"log"

	"golang.org/x/crypto/bcrypt"
)

func Migrate() {
	err := DB.AutoMigrate(
		&models.User{},
		&models.Ingredient{},
		&models.Product{},
		&models.ProductIngredient{},
		&models.StockBatch{},
		&models.Order{},
		&models.OrderItem{},
		&models.PreOrder{},
		&models.PreOrderItem{},
	)
	if err != nil {
		log.Fatalf("❌ Migration failed: %v", err)
	}
	log.Println("✅ Migration completed")
	seedAdmin()
}

func seedAdmin() {
	var count int64
	DB.Model(&models.User{}).Count(&count)
	if count > 0 {
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("❌ Failed to hash password: %v", err)
		return
	}

	admin := models.User{
		Username: "admin",
		Password: string(hash),
		Role:     "admin",
	}

	if err := DB.Create(&admin).Error; err != nil {
		log.Printf("❌ Failed to seed admin: %v", err)
		return
	}
	log.Println("✅ Default admin created  →  username: admin  |  password: admin123")
	log.Println("⚠️  Ganti password admin setelah pertama login!")
}
