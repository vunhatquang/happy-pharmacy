package handlers

import (
	"net/http"
	"time"

	"happy-pharmacy-api/internal/database"
	"happy-pharmacy-api/internal/models"

	"github.com/gin-gonic/gin"
)

// calcNextOrder returns the next order date based on frequency
func calcNextOrder(frequency string) time.Time {
	if frequency == "weekly" {
		return time.Now().AddDate(0, 0, 7)
	}
	return time.Now().AddDate(0, 1, 0)
}

type CreateSubscriptionRequest struct {
	MedicineID string `json:"medicine_id" binding:"required"`
	AddressID  string `json:"address_id" binding:"required"`
	Frequency  string `json:"frequency" binding:"required"`
	Quantity   int    `json:"quantity" binding:"required,min=1"`
}

// CreateSubscription creates a new auto-reorder subscription
func CreateSubscription(c *gin.Context) {
	userID := c.GetString("user_id")
	var req CreateSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Frequency != "weekly" && req.Frequency != "monthly" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Frequency must be 'weekly' or 'monthly'"})
		return
	}

	var medicine models.Medicine
	if err := database.DB.First(&medicine, "id = ?", req.MedicineID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Medicine not found"})
		return
	}

	var address models.Address
	if err := database.DB.Where("id = ? AND user_id = ?", req.AddressID, userID).First(&address).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid address"})
		return
	}

	subscription := models.Subscription{
		UserID:      userID,
		MedicineID:  req.MedicineID,
		AddressID:   req.AddressID,
		Frequency:   req.Frequency,
		Quantity:    req.Quantity,
		NextOrderAt: calcNextOrder(req.Frequency),
		IsActive:    true,
	}

	if err := database.DB.Create(&subscription).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create subscription"})
		return
	}

	database.DB.Preload("Medicine").Preload("Address").First(&subscription, "id = ?", subscription.ID)
	c.JSON(http.StatusCreated, gin.H{"message": "Subscription created", "data": subscription})
}

// GetSubscriptions returns the user's subscriptions
func GetSubscriptions(c *gin.Context) {
	userID := c.GetString("user_id")
	var subscriptions []models.Subscription
	if err := database.DB.Preload("Medicine").Preload("Address").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&subscriptions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load subscriptions"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": subscriptions})
}

// CancelSubscription deactivates a subscription
func CancelSubscription(c *gin.Context) {
	userID := c.GetString("user_id")
	id := c.Param("id")

	var sub models.Subscription
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&sub).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Subscription not found"})
		return
	}

	sub.IsActive = false
	if err := database.DB.Save(&sub).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel subscription"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Subscription cancelled"})
}

// ReactivateSubscription reactivates a paused subscription
func ReactivateSubscription(c *gin.Context) {
	userID := c.GetString("user_id")
	id := c.Param("id")

	var sub models.Subscription
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&sub).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Subscription not found"})
		return
	}

	sub.NextOrderAt = calcNextOrder(sub.Frequency)
	sub.IsActive = true
	if err := database.DB.Save(&sub).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reactivate subscription"})
		return
	}

	database.DB.Preload("Medicine").Preload("Address").First(&sub, "id = ?", sub.ID)
	c.JSON(http.StatusOK, gin.H{"message": "Subscription reactivated", "data": sub})
}
