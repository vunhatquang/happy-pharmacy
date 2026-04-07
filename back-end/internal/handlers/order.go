package handlers

import (
	"fmt"
	"net/http"

	"happy-pharmacy-api/internal/database"
	"happy-pharmacy-api/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CreateOrderRequest struct {
	AddressID      string `json:"address_id" binding:"required"`
	PrescriptionID string `json:"prescription_id"`
	PaymentMethod  string `json:"payment_method" binding:"required"`
	Notes          string `json:"notes"`
}

// CreateOrder creates an order from the user's cart items.
// Uses a database transaction to ensure stock deduction and cart clearing are atomic.
func CreateOrder(c *gin.Context) {
	userID := c.GetString("user_id")
	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate payment method
	switch req.PaymentMethod {
	case "cod", "vietqr", "card":
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payment method. Must be 'cod', 'vietqr', or 'card'"})
		return
	}

	// Validate address belongs to user
	var address models.Address
	if err := database.DB.Where("id = ? AND user_id = ?", req.AddressID, userID).First(&address).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid address"})
		return
	}

	// Get cart items
	var cartItems []models.CartItem
	if err := database.DB.Preload("Medicine").Where("user_id = ?", userID).Find(&cartItems).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load cart"})
		return
	}
	if len(cartItems) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cart is empty"})
		return
	}

	// Calculate total and build order items
	var total float64
	var orderItems []models.OrderItem
	for _, ci := range cartItems {
		subtotal := ci.Medicine.Price * float64(ci.Quantity)
		total += subtotal
		orderItems = append(orderItems, models.OrderItem{
			MedicineID: ci.MedicineID,
			Quantity:   ci.Quantity,
			UnitPrice:  ci.Medicine.Price,
		})
	}

	// Determine initial status
	status := "placed"
	paymentStatus := "pending"

	if req.PrescriptionID != "" {
		var prescription models.Prescription
		if err := database.DB.Where("id = ? AND user_id = ?", req.PrescriptionID, userID).First(&prescription).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid prescription"})
			return
		}
		if prescription.Status != "approved" {
			status = "pending_approval"
		}
	}

	// Run order creation, stock deduction, and cart clearing inside a transaction
	var order models.Order
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		order = models.Order{
			UserID:        userID,
			AddressID:     req.AddressID,
			Status:        status,
			PaymentMethod: req.PaymentMethod,
			PaymentStatus: paymentStatus,
			TotalAmount:   total,
			Notes:         req.Notes,
			Items:         orderItems,
		}
		if req.PrescriptionID != "" {
			order.PrescriptionID = &req.PrescriptionID
		}

		if err := tx.Create(&order).Error; err != nil {
			return fmt.Errorf("failed to create order: %w", err)
		}

		// Deduct stock atomically — use SQL expression to avoid race conditions
		for _, ci := range cartItems {
			result := tx.Model(&models.Medicine{}).
				Where("id = ? AND stock_qty >= ?", ci.MedicineID, ci.Quantity).
				Update("stock_qty", gorm.Expr("stock_qty - ?", ci.Quantity))
			if result.Error != nil {
				return fmt.Errorf("failed to deduct stock: %w", result.Error)
			}
			if result.RowsAffected == 0 {
				return fmt.Errorf("insufficient stock for %s", ci.Medicine.Name)
			}
		}

		// Clear cart
		if err := tx.Where("user_id = ?", userID).Delete(&models.CartItem{}).Error; err != nil {
			return fmt.Errorf("failed to clear cart: %w", err)
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Reload order with items
	database.DB.Preload("Items.Medicine").First(&order, "id = ?", order.ID)

	c.JSON(http.StatusCreated, gin.H{"message": "Order created", "data": order})
}

// GetOrders returns the authenticated user's order history
func GetOrders(c *gin.Context) {
	userID := c.GetString("user_id")
	var orders []models.Order
	if err := database.DB.Preload("Items.Medicine").Preload("Shipment").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load orders"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": orders})
}

// GetOrder returns a single order with full details
func GetOrder(c *gin.Context) {
	userID := c.GetString("user_id")
	id := c.Param("id")

	var order models.Order
	if err := database.DB.Preload("Items.Medicine").Preload("Shipment").
		Where("id = ? AND user_id = ?", id, userID).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": order})
}
