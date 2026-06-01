package handlers

import (
	"kopi-keliling/database"
	"kopi-keliling/models"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func GetAnalytics(c *gin.Context) {
	daysStr := c.DefaultQuery("days", "7")
	days, err := strconv.Atoi(daysStr)
	if err != nil || days < 1 || days > 90 {
		days = 7
	}

	since := time.Now().AddDate(0, 0, -days)

	// ─── Daily revenue + order count ─────────────────────────────────────────
	type DailySale struct {
		Date    string  `json:"date"`
		Revenue float64 `json:"revenue"`
		Cost    float64 `json:"cost"`
		Profit  float64 `json:"profit"`
		Orders  int     `json:"orders"`
	}
	var dailySales []DailySale
	database.DB.
		Table("order_items oi").
		Select(`DATE(o.created_at) as date,
			COALESCE(SUM(oi.price * oi.quantity),0) as revenue,
			COALESCE(SUM(oi.cost * oi.quantity),0) as cost,
			COUNT(DISTINCT o.id) as orders`).
		Joins("JOIN orders o ON o.id = oi.order_id").
		Where("o.status = 'paid' AND o.created_at >= ?", since).
		Group("DATE(o.created_at)").
		Order("date ASC").
		Scan(&dailySales)
	for i := range dailySales {
		dailySales[i].Profit = dailySales[i].Revenue - dailySales[i].Cost
	}

	// ─── Top selling products ─────────────────────────────────────────────────
	type TopProduct struct {
		ProductID   uint    `json:"product_id"`
		ProductName string  `json:"product_name"`
		TotalSold   int     `json:"total_sold"`
		Revenue     float64 `json:"revenue"`
		Profit      float64 `json:"profit"`
	}
	var topProducts []TopProduct
	database.DB.
		Table("order_items oi").
		Select("oi.product_id, p.name as product_name, SUM(oi.quantity) as total_sold, SUM(oi.quantity * oi.price) as revenue, SUM(oi.quantity * (oi.price - oi.cost)) as profit").
		Joins("JOIN orders o ON o.id = oi.order_id").
		Joins("JOIN products p ON p.id = oi.product_id").
		Where("o.status = 'paid' AND o.created_at >= ?", since).
		Group("oi.product_id, p.name").
		Order("total_sold DESC").
		Limit(5).
		Scan(&topProducts)

	// ─── Overall summary ──────────────────────────────────────────────────────
	type Summary struct {
		TotalRevenue   float64 `json:"total_revenue"`
		TotalCost      float64 `json:"total_cost"`
		TotalProfit    float64 `json:"total_profit"`
		MarginPct      float64 `json:"margin_pct"`
		TotalOrders    int     `json:"total_orders"`
		AvgOrderValue  float64 `json:"avg_order_value"`
		TotalPreOrders int     `json:"total_preorders"`
	}
	var summary Summary
	database.DB.Model(&models.Order{}).
		Select("COALESCE(SUM(total_amount),0) as total_revenue, COUNT(*) as total_orders, COALESCE(AVG(total_amount),0) as avg_order_value").
		Where("status = 'paid' AND created_at >= ?", since).
		Scan(&summary)

	// Total modal (COGS) dari order_items yang terjual
	var costAgg struct{ Cost float64 }
	database.DB.
		Table("order_items oi").
		Select("COALESCE(SUM(oi.cost * oi.quantity),0) as cost").
		Joins("JOIN orders o ON o.id = oi.order_id").
		Where("o.status = 'paid' AND o.created_at >= ?", since).
		Scan(&costAgg)
	summary.TotalCost = costAgg.Cost
	summary.TotalProfit = summary.TotalRevenue - summary.TotalCost
	if summary.TotalRevenue > 0 {
		summary.MarginPct = summary.TotalProfit / summary.TotalRevenue * 100
	}

	var poCount int64
	database.DB.Model(&models.PreOrder{}).
		Where("created_at >= ?", since).
		Count(&poCount)
	summary.TotalPreOrders = int(poCount)

	// ─── Low ingredient warning ───────────────────────────────────────────────
	type LowStock struct {
		ID    uint    `json:"id"`
		Name  string  `json:"name"`
		Stock float64 `json:"stock"`
		Unit  string  `json:"unit"`
	}
	var lowStocks []LowStock
	database.DB.Model(&models.Ingredient{}).
		Select("id, name, stock, unit").
		Where("stock < 500").
		Order("stock ASC").
		Scan(&lowStocks)

	c.JSON(http.StatusOK, gin.H{
		"period":       days,
		"daily_sales":  dailySales,
		"top_products": topProducts,
		"summary":      summary,
		"low_stocks":   lowStocks,
	})
}

func GetDashboard(c *gin.Context) {
	today := time.Now().Format("2006-01-02")

	// Today's stats
	type TodayStats struct {
		Revenue float64 `json:"revenue"`
		Orders  int     `json:"orders"`
	}
	var todayStats TodayStats
	database.DB.Model(&models.Order{}).
		Select("COALESCE(SUM(total_amount),0) as revenue, COUNT(*) as orders").
		Where("status = 'paid' AND DATE(created_at) = ?", today).
		Scan(&todayStats)

	// Pending pre-orders
	var pendingPO int64
	database.DB.Model(&models.PreOrder{}).
		Where("status IN ('pending','confirmed')").
		Count(&pendingPO)

	// Expiring stock (within 24h)
	warn := time.Now().Add(24 * time.Hour)
	var expiringBatches []models.StockBatch
	database.DB.Preload("Product").
		Where("remaining > 0 AND expires_at < ? AND expires_at > ?", warn, time.Now()).
		Find(&expiringBatches)

	// Recent orders
	var recentOrders []models.Order
	database.DB.Preload("Items.Product").
		Order("created_at DESC").
		Limit(5).
		Find(&recentOrders)

	c.JSON(http.StatusOK, gin.H{
		"today":            todayStats,
		"pending_preorders": pendingPO,
		"expiring_batches": expiringBatches,
		"recent_orders":    recentOrders,
	})
}
