package handlers

import (
	"net/http"

	"happy-pharmacy-api/internal/database"
	"happy-pharmacy-api/internal/models"

	"github.com/gin-gonic/gin"
)

// GetCart returns the user's cart items with medicine details
func GetCart(c *gin.Context) {
	userID := c.GetString("user_id")
	var items []models.CartItem
	if err := database.DB.Preload("Medicine").Preload("Medicine.Category").Where("user_id = ?", userID).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load cart"})
		return
	}

	var total float64
	for _, item := range items {
		total += item.Medicine.Price * float64(item.Quantity)
	}

	c.JSON(http.StatusOK, gin.H{"data": items, "total": total, "count": len(items)})
}

type AddToCartRequest struct {
	MedicineID string `json:"medicine_id" binding:"required"`
	Quantity   int    `json:"quantity" binding:"required,min=1"`
}

// AddToCart adds a medicine to the cart or updates quantity if already in cart
func AddToCart(c *gin.Context) {
	userID := c.GetString("user_id")
	var req AddToCartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check medicine exists and is active
	var medicine models.Medicine
	if err := database.DB.First(&medicine, "id = ? AND is_active = ?", req.MedicineID, true).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Medicine not found or inactive"})
		return
	}

	if medicine.StockQty < req.Quantity {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Not enough stock available"})
		return
	}

	// Upsert: update quantity if already in cart, otherwise create
	var existing models.CartItem
	result := database.DB.Where("user_id = ? AND medicine_id = ?", userID, req.MedicineID).First(&existing)
	if result.Error == nil {
		existing.Quantity += req.Quantity
		if err := database.DB.Save(&existing).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update cart"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Cart updated", "data": existing})
		return
	}

	item := models.CartItem{
		UserID:     userID,
		MedicineID: req.MedicineID,
		Quantity:   req.Quantity,
	}
	if err := database.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add to cart"})
		return
	}
	database.DB.Preload("Medicine").First(&item, "id = ?", item.ID)

	c.JSON(http.StatusOK, gin.H{"message": "Added to cart", "data": item})
}

type UpdateCartRequest struct {
	Quantity int `json:"quantity" binding:"required,min=1"`
}

// UpdateCartItem updates the quantity of a cart item
func UpdateCartItem(c *gin.Context) {
	userID := c.GetString("user_id")
	id := c.Param("id")

	var req UpdateCartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var item models.CartItem
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&item).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cart item not found"})
		return
	}

	item.Quantity = req.Quantity
	if err := database.DB.Save(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update cart item"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Cart item updated", "data": item})
}

// RemoveFromCart removes an item from the cart
func RemoveFromCart(c *gin.Context) {
	userID := c.GetString("user_id")
	id := c.Param("id")

	result := database.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.CartItem{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove cart item"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cart item not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Item removed from cart"})
}

// ClearCart removes all items from the user's cart
func ClearCart(c *gin.Context) {
	userID := c.GetString("user_id")
	if err := database.DB.Where("user_id = ?", userID).Delete(&models.CartItem{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear cart"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Cart cleared"})
}
