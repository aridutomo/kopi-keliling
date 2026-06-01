package routes

import (
	"kopi-keliling/handlers"
	"kopi-keliling/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	api := r.Group("/api")

	// ─── Public Auth ──────────────────────────────────────────────────────────
	api.POST("/auth/login", handlers.Login)

	// ─── Public (Customer) ────────────────────────────────────────────────────
	api.GET("/menu", handlers.GetMenu)
	api.GET("/menu/:id", handlers.GetMenuProduct)
	api.POST("/preorders", handlers.CreatePreOrder)
	api.POST("/orders", handlers.CreateCustomerOrder)        // self-order langsung
	api.GET("/orders/:number", handlers.GetCustomerOrder)    // status untuk konfirmasi pelanggan

	// ─── Admin (JWT Required) ─────────────────────────────────────────────────
	admin := api.Group("/admin")
	admin.Use(middleware.AuthRequired())
	{
		// Auth
		admin.GET("/profile", handlers.GetProfile)
		admin.PUT("/auth/password", handlers.ChangePassword)

		// Dashboard
		admin.GET("/dashboard", handlers.GetDashboard)

		// Products
		admin.GET("/products", handlers.GetProducts)
		admin.GET("/products/:id", handlers.GetProduct)
		admin.POST("/products", handlers.CreateProduct)
		admin.PUT("/products/:id", handlers.UpdateProduct)
		admin.DELETE("/products/:id", handlers.DeleteProduct)

		// Ingredients (Bahan Baku)
		admin.GET("/ingredients", handlers.GetIngredients)
		admin.POST("/ingredients", handlers.CreateIngredient)
		admin.PUT("/ingredients/:id", handlers.UpdateIngredient)
		admin.DELETE("/ingredients/:id", handlers.DeleteIngredient)
		admin.PATCH("/ingredients/:id/stock", handlers.UpdateIngredientStock)

		// Stock Batches (Botol Matang)
		admin.GET("/stock", handlers.GetStockBatches)
		admin.GET("/stock/summary", handlers.GetStockSummary)
		admin.POST("/stock", handlers.CreateStockBatch)

		// Orders (POS)
		admin.GET("/orders", handlers.GetOrders)
		admin.GET("/orders/by-number/:number", handlers.GetOrderByNumber)
		admin.POST("/orders", handlers.CreateOrder)
		admin.PATCH("/orders/:id/status", handlers.UpdateOrderStatus)

		// Pre-Orders
		admin.GET("/preorders", handlers.GetPreOrders)
		admin.GET("/preorders/:id", handlers.GetPreOrder)
		admin.PATCH("/preorders/:id/status", handlers.UpdatePreOrderStatus)

		// Analytics
		admin.GET("/analytics", handlers.GetAnalytics)
	}
}
