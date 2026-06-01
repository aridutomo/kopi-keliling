package handlers

import (
	"kopi-keliling/database"
	"kopi-keliling/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetStockBatches(c *gin.Context) {
	var batches []models.StockBatch
	database.DB.Preload("Product").Order("expires_at ASC").Find(&batches)
	c.JSON(http.StatusOK, batches)
}

type StockBatchRequest struct {
	ProductID uint   `json:"product_id" binding:"required"`
	Quantity  int    `json:"quantity" binding:"required,min=1"`
	ExpiresAt string `json:"expires_at"` // "2006-01-02", default +4 days
}

func CreateStockBatch(c *gin.Context) {
	var req StockBatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Load product + BOM
	var product models.Product
	if err := database.DB.Preload("Ingredients.Ingredient").First(&product, req.ProductID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Produk tidak ditemukan"})
		return
	}

	// Validate ingredients are enough
	for _, pi := range product.Ingredients {
		needed := pi.Quantity * float64(req.Quantity)
		if pi.Ingredient.Stock < needed {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":     "Stok bahan baku tidak cukup: " + pi.Ingredient.Name,
				"needed":    needed,
				"available": pi.Ingredient.Stock,
				"unit":      pi.Ingredient.Unit,
			})
			return
		}
	}

	// Deduct raw ingredients
	for _, pi := range product.Ingredients {
		needed := pi.Quantity * float64(req.Quantity)
		if err := database.DB.Model(&models.Ingredient{}).
			Where("id = ?", pi.IngredientID).
			Update("stock", gorm.Expr("stock - ?", needed)).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengurangi stok bahan: " + err.Error()})
			return
		}
	}

	// Parse expiry date
	expiresAt := time.Now().Add(4 * 24 * time.Hour)
	if req.ExpiresAt != "" {
		if t, err := time.Parse("2006-01-02", req.ExpiresAt); err == nil {
			expiresAt = t
		}
	}

	batch := models.StockBatch{
		ProductID:  req.ProductID,
		Quantity:   req.Quantity,
		Remaining:  req.Quantity,
		ProducedAt: time.Now(),
		ExpiresAt:  expiresAt,
	}

	if err := database.DB.Create(&batch).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	database.DB.Preload("Product").First(&batch, batch.ID)
	c.JSON(http.StatusCreated, batch)
}

// GET /admin/stock/summary — ringkasan stok + prediksi dari bahan baku
func GetStockSummary(c *gin.Context) {
	type StockSummary struct {
		ProductID   uint    `json:"product_id"`
		ProductName string  `json:"product_name"`
		TotalStock  int     `json:"total_stock"`
		HasExpiring bool    `json:"has_expiring"`
		ExpiringQty int     `json:"expiring_qty"`
	}

	var batches []models.StockBatch
	database.DB.Preload("Product").
		Where("remaining > 0").
		Find(&batches)

	now := time.Now()
	warn := now.Add(24 * time.Hour)
	summaryMap := map[uint]*StockSummary{}

	for _, b := range batches {
		if b.ExpiresAt.Before(now) {
			continue // already expired
		}
		if _, ok := summaryMap[b.ProductID]; !ok {
			summaryMap[b.ProductID] = &StockSummary{
				ProductID:   b.ProductID,
				ProductName: b.Product.Name,
			}
		}
		summaryMap[b.ProductID].TotalStock += b.Remaining
		if b.ExpiresAt.Before(warn) {
			summaryMap[b.ProductID].HasExpiring = true
			summaryMap[b.ProductID].ExpiringQty += b.Remaining
		}
	}

	summaries := []StockSummary{}
	for _, s := range summaryMap {
		summaries = append(summaries, *s)
	}

	// Prediction: berapa botol bisa dibuat dari sisa bahan baku
	type Prediction struct {
		ProductID    uint   `json:"product_id"`
		ProductName  string `json:"product_name"`
		MaxBatchable int    `json:"max_batchable"`
	}

	var products []models.Product
	database.DB.Preload("Ingredients.Ingredient").Find(&products)

	predictions := []Prediction{}
	for _, p := range products {
		maxBatch := -1
		for _, pi := range p.Ingredients {
			if pi.Quantity == 0 {
				continue
			}
			possible := int(pi.Ingredient.Stock / pi.Quantity)
			if maxBatch == -1 || possible < maxBatch {
				maxBatch = possible
			}
		}
		if maxBatch < 0 {
			maxBatch = 0
		}
		predictions = append(predictions, Prediction{
			ProductID:    p.ID,
			ProductName:  p.Name,
			MaxBatchable: maxBatch,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"stock_summary": summaries,
		"predictions":   predictions,
	})
}
