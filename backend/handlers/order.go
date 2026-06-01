package handlers

import (
	"fmt"
	"kopi-keliling/database"
	"kopi-keliling/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func GetOrders(c *gin.Context) {
	var orders []models.Order
	db := database.DB.Preload("Items.Product").Order("created_at DESC")

	if date := c.Query("date"); date != "" {
		db = db.Where("DATE(created_at) = ?", date)
	}
	if status := c.Query("status"); status != "" {
		db = db.Where("status = ?", status)
	}

	limit := 50
	db = db.Limit(limit)
	db.Find(&orders)
	c.JSON(http.StatusOK, orders)
}

type orderLine struct {
	ProductID uint `json:"product_id" binding:"required"`
	Quantity  int  `json:"quantity" binding:"required,min=1"`
}

type OrderRequest struct {
	CustomerName  string      `json:"customer_name"`
	PaymentMethod string      `json:"payment_method" binding:"required"` // cash | qris
	Items         []orderLine `json:"items" binding:"required,min=1"`
}

// buildOrderItems memvalidasi produk + stok, lalu menyusun OrderItem (dengan snapshot harga & modal).
// Jika gagal, ia menulis response error dan mengembalikan ok=false.
func buildOrderItems(c *gin.Context, lines []orderLine) ([]models.OrderItem, float64, bool) {
	var total float64
	var orderItems []models.OrderItem

	neededQty := map[uint]int{}
	for _, item := range lines {
		neededQty[item.ProductID] += item.Quantity
	}

	for _, item := range lines {
		var product models.Product
		if err := database.DB.Preload("Ingredients.Ingredient").First(&product, item.ProductID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Produk ID %d tidak ditemukan", item.ProductID)})
			return nil, 0, false
		}
		if !product.IsAvailable {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Produk " + product.Name + " tidak tersedia"})
			return nil, 0, false
		}
		total += product.Price * float64(item.Quantity)
		orderItems = append(orderItems, models.OrderItem{
			ProductID: item.ProductID,
			Quantity:  item.Quantity,
			Price:     product.Price,
			Cost:      productCOGS(product), // snapshot modal per botol
		})
	}

	// Validasi stok botol: tolak jika melebihi yang tersedia
	for pid, qty := range neededQty {
		avail := availableStock(pid)
		if avail < qty {
			var p models.Product
			database.DB.First(&p, pid)
			c.JSON(http.StatusBadRequest, gin.H{
				"error":     fmt.Sprintf("Stok botol %s tidak cukup (tersisa %d, diminta %d)", p.Name, avail, qty),
				"product":   p.Name,
				"available": avail,
				"requested": qty,
			})
			return nil, 0, false
		}
	}

	return orderItems, total, true
}

// persistOrder menyimpan order + item dan memotong stok (reserve). Dikembalikan jika dibatalkan.
func persistOrder(order *models.Order, orderItems []models.OrderItem) error {
	if err := database.DB.Create(order).Error; err != nil {
		return err
	}
	for i := range orderItems {
		orderItems[i].OrderID = order.ID
		database.DB.Create(&orderItems[i])
	}
	for _, item := range orderItems {
		deductStockFIFO(item.ProductID, item.Quantity)
	}
	database.DB.Preload("Items.Product").First(order, order.ID)
	return nil
}

func newOrderNumber() string {
	return fmt.Sprintf("ORD-%s-%04d", time.Now().Format("20060102"), time.Now().UnixNano()%10000)
}

// CreateOrder — POS (admin): kasir input order langsung + metode bayar.
func CreateOrder(c *gin.Context) {
	var req OrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	orderItems, total, ok := buildOrderItems(c, req.Items)
	if !ok {
		return
	}

	// Cash → langsung paid; QRIS → pending sampai dikonfirmasi
	status := "paid"
	if req.PaymentMethod == "qris" {
		status = "pending"
	}

	order := models.Order{
		OrderNumber:   newOrderNumber(),
		Status:        status,
		PaymentMethod: req.PaymentMethod,
		TotalAmount:   total,
		CustomerName:  req.CustomerName,
	}
	if err := persistOrder(&order, orderItems); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, order)
}

// CreateCustomerOrder — publik: pelanggan self-order dari menu, status pending,
// metode bayar dipilih di kasir. Mengembalikan order_number untuk QR.
func CreateCustomerOrder(c *gin.Context) {
	var req struct {
		CustomerName string      `json:"customer_name"`
		Items        []orderLine `json:"items" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	orderItems, total, ok := buildOrderItems(c, req.Items)
	if !ok {
		return
	}

	order := models.Order{
		OrderNumber:  newOrderNumber(),
		Status:       "pending",
		TotalAmount:  total,
		CustomerName: req.CustomerName,
	}
	if err := persistOrder(&order, orderItems); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"message":      "Order dibuat! Tunjukkan QR / nomor order ke kasir untuk membayar.",
		"order_number": order.OrderNumber,
		"total_amount": order.TotalAmount,
		"status":       order.Status,
		"data":         order,
	})
}

// GET /api/orders/:number — publik: status order untuk halaman konfirmasi pelanggan.
func GetCustomerOrder(c *gin.Context) {
	number := c.Param("number")
	var order models.Order
	if err := database.DB.Preload("Items.Product").Where("order_number = ?", number).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, order)
}

// GET /api/admin/orders/by-number/:number — POS tarik order via kode.
func GetOrderByNumber(c *gin.Context) {
	number := c.Param("number")
	var order models.Order
	if err := database.DB.Preload("Items.Product").Where("order_number = ?", number).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, order)
}

func UpdateOrderStatus(c *gin.Context) {
	id := c.Param("id")
	var order models.Order
	if err := database.DB.Preload("Items").First(&order, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order tidak ditemukan"})
		return
	}

	var req struct {
		Status        string `json:"status" binding:"required"`
		PaymentMethod string `json:"payment_method"` // opsional: di-set saat konfirmasi bayar
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	prevStatus := order.Status
	wasCancelled := prevStatus == "cancelled"
	willCancel := req.Status == "cancelled"

	// Reaktivasi (cancelled → aktif): validasi stok cukup
	if wasCancelled && !willCancel {
		for _, item := range order.Items {
			if availableStock(item.ProductID) < item.Quantity {
				var p models.Product
				database.DB.First(&p, item.ProductID)
				c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Stok botol %s tidak cukup untuk mengaktifkan kembali", p.Name)})
				return
			}
		}
	}

	order.Status = req.Status
	if req.PaymentMethod != "" {
		order.PaymentMethod = req.PaymentMethod
	}
	database.DB.Save(&order)

	// Stok dipotong saat order dibuat. Aktif=terpotong, cancelled=dikembalikan.
	switch {
	case !wasCancelled && willCancel:
		for _, item := range order.Items {
			restoreStock(item.ProductID, item.Quantity)
		}
	case wasCancelled && !willCancel:
		for _, item := range order.Items {
			deductStockFIFO(item.ProductID, item.Quantity)
		}
	}

	c.JSON(http.StatusOK, order)
}

// availableStock = total botol tersisa (belum expired) untuk sebuah produk
func availableStock(productID uint) int {
	var total struct{ Sum int }
	database.DB.Model(&models.StockBatch{}).
		Select("COALESCE(SUM(remaining), 0) as sum").
		Where("product_id = ? AND remaining > 0 AND expires_at > ?", productID, time.Now()).
		Scan(&total)
	return total.Sum
}

// restoreStock mengembalikan botol ke batch (kebalikan deductStockFIFO),
// mengisi batch belum-expired sampai kapasitas asalnya (quantity).
func restoreStock(productID uint, qty int) {
	var batches []models.StockBatch
	database.DB.
		Where("product_id = ? AND expires_at > ?", productID, time.Now()).
		Order("expires_at ASC").
		Find(&batches)

	remaining := qty
	for _, batch := range batches {
		if remaining <= 0 {
			break
		}
		space := batch.Quantity - batch.Remaining
		if space <= 0 {
			continue
		}
		add := remaining
		if add > space {
			add = space
		}
		database.DB.Model(&batch).UpdateColumn("remaining", batch.Remaining+add)
		remaining -= add
	}
}

// FIFO stock deduction from batches
func deductStockFIFO(productID uint, qty int) {
	var batches []models.StockBatch
	database.DB.
		Where("product_id = ? AND remaining > 0 AND expires_at > ?", productID, time.Now()).
		Order("expires_at ASC").
		Find(&batches)

	remaining := qty
	for _, batch := range batches {
		if remaining <= 0 {
			break
		}
		deduct := remaining
		if batch.Remaining < deduct {
			deduct = batch.Remaining
		}
		database.DB.Model(&batch).UpdateColumn("remaining", batch.Remaining-deduct)
		remaining -= deduct
	}
}
