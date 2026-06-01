package handlers

import (
	"fmt"
	"kopi-keliling/database"
	"kopi-keliling/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func GetPreOrders(c *gin.Context) {
	var preorders []models.PreOrder
	db := database.DB.Preload("Items.Product").Order("pickup_time ASC")

	if status := c.Query("status"); status != "" {
		db = db.Where("status = ?", status)
	}
	if date := c.Query("date"); date != "" {
		db = db.Where("DATE(pickup_time) = ?", date)
	}

	db.Find(&preorders)
	c.JSON(http.StatusOK, preorders)
}

func GetPreOrder(c *gin.Context) {
	id := c.Param("id")
	var po models.PreOrder
	if err := database.DB.Preload("Items.Product").First(&po, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pre-order tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, po)
}

type PreOrderRequest struct {
	CustomerName  string `json:"customer_name" binding:"required"`
	CustomerPhone string `json:"customer_phone" binding:"required"`
	PickupPoint   string `json:"pickup_point" binding:"required"`
	PickupTime    string `json:"pickup_time" binding:"required"` // "2006-01-02T15:04"
	Notes         string `json:"notes"`
	Items         []struct {
		ProductID uint `json:"product_id" binding:"required"`
		Quantity  int  `json:"quantity" binding:"required,min=1"`
	} `json:"items" binding:"required,min=1"`
}

// POST /preorders — public (customer)
func CreatePreOrder(c *gin.Context) {
	var req PreOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pickupTime, err := time.Parse("2006-01-02T15:04", req.PickupTime)
	if err != nil {
		pickupTime, err = time.Parse(time.RFC3339, req.PickupTime)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format pickup_time: 2006-01-02T15:04"})
			return
		}
	}

	if pickupTime.Before(time.Now().Add(30 * time.Minute)) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Waktu pickup minimal 30 menit dari sekarang"})
		return
	}

	var total float64
	var items []models.PreOrderItem

	// Aggregate qty per product untuk validasi stok
	neededQty := map[uint]int{}
	for _, item := range req.Items {
		neededQty[item.ProductID] += item.Quantity
	}

	for _, item := range req.Items {
		var product models.Product
		if err := database.DB.First(&product, item.ProductID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Produk ID %d tidak ditemukan", item.ProductID)})
			return
		}
		if !product.IsAvailable {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Produk " + product.Name + " tidak tersedia untuk pre-order"})
			return
		}
		total += product.Price * float64(item.Quantity)
		items = append(items, models.PreOrderItem{
			ProductID: item.ProductID,
			Quantity:  item.Quantity,
			Price:     product.Price,
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
			return
		}
	}

	orderNum := fmt.Sprintf("PO-%s-%04d", time.Now().Format("20060102"), time.Now().UnixNano()%10000)

	po := models.PreOrder{
		OrderNumber:   orderNum,
		CustomerName:  req.CustomerName,
		CustomerPhone: req.CustomerPhone,
		PickupPoint:   req.PickupPoint,
		PickupTime:    pickupTime,
		Notes:         req.Notes,
		TotalAmount:   total,
		Status:        "pending",
	}

	if err := database.DB.Create(&po).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for i := range items {
		items[i].PreOrderID = po.ID
		database.DB.Create(&items[i])
	}

	// Potong stok botol saat pre-order dibuat (reserve)
	for _, item := range items {
		deductStockFIFO(item.ProductID, item.Quantity)
	}

	database.DB.Preload("Items.Product").First(&po, po.ID)
	c.JSON(http.StatusCreated, gin.H{
		"message":      "Pre-order berhasil! Kami akan konfirmasi segera.",
		"order_number": po.OrderNumber,
		"total_amount": po.TotalAmount,
		"pickup_time":  po.PickupTime,
		"pickup_point": po.PickupPoint,
		"data":         po,
	})
}

// PATCH /admin/preorders/:id/status
func UpdatePreOrderStatus(c *gin.Context) {
	id := c.Param("id")
	var po models.PreOrder
	if err := database.DB.Preload("Items").First(&po, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pre-order tidak ditemukan"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	validStatus := map[string]bool{
		"pending": true, "confirmed": true, "ready": true, "done": true, "cancelled": true,
	}
	if !validStatus[req.Status] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Status tidak valid"})
		return
	}

	prevStatus := po.Status

	// Stok sudah dipotong saat PO dibuat. Aktif = stok terpotong, cancelled = stok dikembalikan.
	wasCancelled := prevStatus == "cancelled"
	willCancel := req.Status == "cancelled"

	// Reaktivasi (cancelled → aktif): validasi & potong stok lagi
	if wasCancelled && !willCancel {
		for _, item := range po.Items {
			avail := availableStock(item.ProductID)
			if avail < item.Quantity {
				var p models.Product
				database.DB.First(&p, item.ProductID)
				c.JSON(http.StatusBadRequest, gin.H{
					"error": fmt.Sprintf("Stok botol %s tidak cukup untuk mengaktifkan kembali (tersisa %d, dibutuhkan %d)", p.Name, avail, item.Quantity),
				})
				return
			}
		}
	}

	po.Status = req.Status
	database.DB.Save(&po)

	switch {
	case !wasCancelled && willCancel:
		// Aktif → cancelled: kembalikan stok
		for _, item := range po.Items {
			restoreStock(item.ProductID, item.Quantity)
		}
	case wasCancelled && !willCancel:
		// Cancelled → aktif: potong stok lagi
		for _, item := range po.Items {
			deductStockFIFO(item.ProductID, item.Quantity)
		}
	}

	c.JSON(http.StatusOK, po)
}
