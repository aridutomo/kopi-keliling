package handlers

import (
	"kopi-keliling/database"
	"kopi-keliling/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── Public menu endpoint ─────────────────────────────────────────────────────

type ProductWithStock struct {
	models.Product
	StockCount int `json:"stock_count"`
}

func GetMenu(c *gin.Context) {
	var products []models.Product
	database.DB.
		Where("is_available = ?", true).
		Preload("Ingredients.Ingredient").
		Find(&products)

	result := []ProductWithStock{}
	now := time.Now()
	for _, p := range products {
		var total struct{ Sum int }
		database.DB.Model(&models.StockBatch{}).
			Select("COALESCE(SUM(remaining), 0) as sum").
			Where("product_id = ? AND remaining > 0 AND expires_at > ?", p.ID, now).
			Scan(&total)

		result = append(result, ProductWithStock{
			Product:    p,
			StockCount: total.Sum,
		})
	}
	c.JSON(http.StatusOK, result)
}

func GetMenuProduct(c *gin.Context) {
	id := c.Param("id")
	var product models.Product
	if err := database.DB.Preload("Ingredients.Ingredient").First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Produk tidak ditemukan"})
		return
	}

	var total struct{ Sum int }
	database.DB.Model(&models.StockBatch{}).
		Select("COALESCE(SUM(remaining), 0) as sum").
		Where("product_id = ? AND remaining > 0 AND expires_at > ?", id, time.Now()).
		Scan(&total)

	c.JSON(http.StatusOK, ProductWithStock{Product: product, StockCount: total.Sum})
}

// ─── Admin product CRUD ───────────────────────────────────────────────────────

type ProductRequest struct {
	Name            string  `json:"name" binding:"required"`
	Description     string  `json:"description"`
	Price           float64 `json:"price" binding:"required,gt=0"`
	BeanType        string  `json:"bean_type"`
	FlavorNotes     string  `json:"flavor_notes"`
	BaseIngredients string  `json:"base_ingredients"`
	IsAvailable     bool    `json:"is_available"`
	ImageURL        string  `json:"image_url"`
	Ingredients     []struct {
		IngredientID uint    `json:"ingredient_id"`
		Quantity     float64 `json:"quantity"`
	} `json:"ingredients"`
}

// productCOGS = total modal per botol dari resep (BOM): Σ qty × cost_per_unit
func productCOGS(p models.Product) float64 {
	var cogs float64
	for _, pi := range p.Ingredients {
		cogs += pi.Quantity * pi.Ingredient.CostPerUnit
	}
	return cogs
}

type ProductWithCost struct {
	models.Product
	Cost      float64 `json:"cost"`       // modal per botol
	Margin    float64 `json:"margin"`     // harga jual − modal
	MarginPct float64 `json:"margin_pct"` // margin / harga jual × 100
}

func withCost(p models.Product) ProductWithCost {
	cogs := productCOGS(p)
	margin := p.Price - cogs
	pct := 0.0
	if p.Price > 0 {
		pct = margin / p.Price * 100
	}
	return ProductWithCost{Product: p, Cost: cogs, Margin: margin, MarginPct: pct}
}

func GetProducts(c *gin.Context) {
	var products []models.Product
	database.DB.Preload("Ingredients.Ingredient").Find(&products)

	result := make([]ProductWithCost, 0, len(products))
	for _, p := range products {
		result = append(result, withCost(p))
	}
	c.JSON(http.StatusOK, result)
}

func GetProduct(c *gin.Context) {
	id := c.Param("id")
	var product models.Product
	if err := database.DB.Preload("Ingredients.Ingredient").First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Produk tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, withCost(product))
}

func CreateProduct(c *gin.Context) {
	var req ProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	product := models.Product{
		Name:            req.Name,
		Description:     req.Description,
		Price:           req.Price,
		BeanType:        req.BeanType,
		FlavorNotes:     req.FlavorNotes,
		BaseIngredients: req.BaseIngredients,
		IsAvailable:     req.IsAvailable,
		ImageURL:        req.ImageURL,
	}

	if err := database.DB.Create(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for _, ing := range req.Ingredients {
		pi := models.ProductIngredient{
			ProductID:    product.ID,
			IngredientID: ing.IngredientID,
			Quantity:     ing.Quantity,
		}
		database.DB.Create(&pi)
	}

	database.DB.Preload("Ingredients.Ingredient").First(&product, product.ID)
	c.JSON(http.StatusCreated, product)
}

func UpdateProduct(c *gin.Context) {
	id := c.Param("id")
	var product models.Product
	if err := database.DB.First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Produk tidak ditemukan"})
		return
	}

	var req ProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	product.Name = req.Name
	product.Description = req.Description
	product.Price = req.Price
	product.BeanType = req.BeanType
	product.FlavorNotes = req.FlavorNotes
	product.BaseIngredients = req.BaseIngredients
	product.IsAvailable = req.IsAvailable
	product.ImageURL = req.ImageURL
	database.DB.Save(&product)

	// Re-sync ingredients (BOM)
	database.DB.Where("product_id = ?", product.ID).Delete(&models.ProductIngredient{})
	for _, ing := range req.Ingredients {
		database.DB.Create(&models.ProductIngredient{
			ProductID:    product.ID,
			IngredientID: ing.IngredientID,
			Quantity:     ing.Quantity,
		})
	}

	database.DB.Preload("Ingredients.Ingredient").First(&product, product.ID)
	c.JSON(http.StatusOK, product)
}

func DeleteProduct(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Product{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Produk dihapus"})
}
