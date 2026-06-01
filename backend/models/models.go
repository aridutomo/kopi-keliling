package models

import "time"

// ─── Auth ────────────────────────────────────────────────────────────────────

type User struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Username  string    `gorm:"size:100;uniqueIndex;not null" json:"username"`
	Password  string    `gorm:"size:255;not null" json:"-"`
	Role      string    `gorm:"size:20;default:'admin'" json:"role"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ─── Menu / Products ─────────────────────────────────────────────────────────

type Product struct {
	ID              uint                `gorm:"primaryKey" json:"id"`
	Name            string              `gorm:"not null" json:"name"`
	Description     string              `json:"description"`
	Price           float64             `gorm:"not null" json:"price"`
	BeanType        string              `json:"bean_type"`
	FlavorNotes     string              `json:"flavor_notes"`
	BaseIngredients string              `json:"base_ingredients"`
	IsAvailable     bool                `gorm:"default:true" json:"is_available"`
	ImageURL        string              `json:"image_url"`
	Ingredients     []ProductIngredient `gorm:"foreignKey:ProductID;constraint:OnDelete:CASCADE" json:"ingredients,omitempty"`
	CreatedAt       time.Time           `json:"created_at"`
	UpdatedAt       time.Time           `json:"updated_at"`
}

// ─── Bahan Baku (Raw Ingredients) ────────────────────────────────────────────

type Ingredient struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"size:100;uniqueIndex;not null" json:"name"`
	Unit        string    `gorm:"size:20;not null" json:"unit"`                          // gram, ml, pcs
	Category    string    `gorm:"size:20;default:'bahan_baku'" json:"category"`          // bahan_baku | pendukung
	Stock       float64   `gorm:"default:0" json:"stock"`
	CostPerUnit float64   `gorm:"default:0" json:"cost_per_unit"`                        // harga modal per satuan (Rp)
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// BOM: maps product → ingredients + qty per bottle
type ProductIngredient struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	ProductID    uint       `gorm:"not null" json:"product_id"`
	IngredientID uint       `gorm:"not null" json:"ingredient_id"`
	Quantity     float64    `gorm:"not null" json:"quantity"` // per 1 bottle
	Ingredient   Ingredient `gorm:"foreignKey:IngredientID" json:"ingredient,omitempty"`
}

// ─── Stock Batch (Botol Matang) ───────────────────────────────────────────────

type StockBatch struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	ProductID  uint      `gorm:"not null;index" json:"product_id"`
	Product    Product   `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Quantity   int       `gorm:"not null" json:"quantity"`
	Remaining  int       `gorm:"not null" json:"remaining"`
	ProducedAt time.Time `json:"produced_at"`
	ExpiresAt  time.Time `json:"expires_at"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// ─── Orders (POS) ────────────────────────────────────────────────────────────

type Order struct {
	ID            uint        `gorm:"primaryKey" json:"id"`
	OrderNumber   string      `gorm:"size:50;uniqueIndex;not null" json:"order_number"`
	Status        string      `gorm:"size:20;default:'pending'" json:"status"` // pending, paid, cancelled
	PaymentMethod string      `gorm:"size:20" json:"payment_method"`           // cash, qris
	TotalAmount   float64     `json:"total_amount"`
	CustomerName  string      `json:"customer_name"`
	Items         []OrderItem `gorm:"foreignKey:OrderID;constraint:OnDelete:CASCADE" json:"items,omitempty"`
	CreatedAt     time.Time   `json:"created_at"`
	UpdatedAt     time.Time   `json:"updated_at"`
}

type OrderItem struct {
	ID        uint    `gorm:"primaryKey" json:"id"`
	OrderID   uint    `gorm:"not null;index" json:"order_id"`
	ProductID uint    `gorm:"not null" json:"product_id"`
	Product   Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Quantity  int     `gorm:"not null" json:"quantity"`
	Price     float64 `gorm:"not null" json:"price"`         // price snapshot (harga jual)
	Cost      float64 `gorm:"default:0" json:"cost"`         // cost snapshot (modal/COGS per botol)
}

// ─── Pre-Orders ───────────────────────────────────────────────────────────────

type PreOrder struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	OrderNumber   string         `gorm:"size:50;uniqueIndex;not null" json:"order_number"`
	CustomerName  string         `gorm:"not null" json:"customer_name"`
	CustomerPhone string         `gorm:"size:30;not null" json:"customer_phone"`
	PickupPoint   string         `gorm:"not null" json:"pickup_point"`
	PickupTime    time.Time      `json:"pickup_time"`
	Status        string         `gorm:"size:20;default:'pending'" json:"status"` // pending, confirmed, ready, done, cancelled
	TotalAmount   float64        `json:"total_amount"`
	Notes         string         `json:"notes"`
	Items         []PreOrderItem `gorm:"foreignKey:PreOrderID;constraint:OnDelete:CASCADE" json:"items,omitempty"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

type PreOrderItem struct {
	ID         uint    `gorm:"primaryKey" json:"id"`
	PreOrderID uint    `gorm:"not null;index" json:"preorder_id"`
	ProductID  uint    `gorm:"not null" json:"product_id"`
	Product    Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Quantity   int     `gorm:"not null" json:"quantity"`
	Price      float64 `gorm:"not null" json:"price"`
}
