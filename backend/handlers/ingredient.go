package handlers

import (
	"kopi-keliling/database"
	"kopi-keliling/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetIngredients(c *gin.Context) {
	var ingredients []models.Ingredient
	database.DB.Order("name ASC").Find(&ingredients)
	c.JSON(http.StatusOK, ingredients)
}

type IngredientRequest struct {
	Name        string  `json:"name" binding:"required"`
	Unit        string  `json:"unit" binding:"required"`
	Category    string  `json:"category"` // bahan_baku | pendukung
	Stock       float64 `json:"stock"`
	CostPerUnit float64 `json:"cost_per_unit"`
}

func CreateIngredient(c *gin.Context) {
	var req IngredientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	category := req.Category
	if category == "" {
		category = "bahan_baku"
	}

	ing := models.Ingredient{
		Name:        req.Name,
		Unit:        req.Unit,
		Category:    category,
		Stock:       req.Stock,
		CostPerUnit: req.CostPerUnit,
	}
	if err := database.DB.Create(&ing).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, ing)
}

func UpdateIngredient(c *gin.Context) {
	id := c.Param("id")
	var ing models.Ingredient
	if err := database.DB.First(&ing, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bahan baku tidak ditemukan"})
		return
	}

	var req IngredientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ing.Name = req.Name
	ing.Unit = req.Unit
	ing.Stock = req.Stock
	ing.CostPerUnit = req.CostPerUnit
	if req.Category != "" {
		ing.Category = req.Category
	}
	database.DB.Save(&ing)
	c.JSON(http.StatusOK, ing)
}

func DeleteIngredient(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Ingredient{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Bahan baku dihapus"})
}

// PATCH /admin/ingredients/:id/stock — update stok saja (input bahan baru)
func UpdateIngredientStock(c *gin.Context) {
	id := c.Param("id")
	var ing models.Ingredient
	if err := database.DB.First(&ing, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bahan baku tidak ditemukan"})
		return
	}

	var req struct {
		Stock  float64 `json:"stock"`
		AddQty float64 `json:"add_qty"` // optional: tambah ke existing
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.AddQty != 0 {
		ing.Stock += req.AddQty
	} else {
		ing.Stock = req.Stock
	}

	database.DB.Save(&ing)
	c.JSON(http.StatusOK, ing)
}
