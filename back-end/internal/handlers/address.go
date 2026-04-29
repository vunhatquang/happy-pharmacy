package handlers

import (
	"fmt"
	"net/http"

	"happy-pharmacy-api/internal/database"
	"happy-pharmacy-api/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetAddresses returns all addresses for the authenticated user
func GetAddresses(c *gin.Context) {
	userID := c.GetString("user_id")
	var addresses []models.Address
	if err := database.DB.Where("user_id = ?", userID).Find(&addresses).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load addresses"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": addresses})
}

type AddressRequest struct {
	Label    string `json:"label" binding:"required"`
	Street   string `json:"street" binding:"required"`
	Ward     string `json:"ward" binding:"required"`
	District string `json:"district" binding:"required"`
	City     string `json:"city" binding:"required"`
	IsDefault bool  `json:"is_default"`
}

// CreateAddress adds a new address for the authenticated user.
// Uses a transaction so the "unset other defaults + create" is atomic.
func CreateAddress(c *gin.Context) {
	userID := c.GetString("user_id")
	var req AddressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var address models.Address
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		if req.IsDefault {
			if err := tx.Model(&models.Address{}).Where("user_id = ?", userID).Update("is_default", false).Error; err != nil {
				return fmt.Errorf("failed to unset default: %w", err)
			}
		}

		address = models.Address{
			UserID:    userID,
			Label:     req.Label,
			Street:    req.Street,
			Ward:      req.Ward,
			District:  req.District,
			City:      req.City,
			IsDefault: req.IsDefault,
		}
		return tx.Create(&address).Error
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create address"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Address created", "data": address})
}

type UpdateAddressRequest struct {
	Label     string `json:"label"`
	Street    string `json:"street"`
	Ward      string `json:"ward"`
	District  string `json:"district"`
	City      string `json:"city"`
	IsDefault *bool  `json:"is_default"`
}

// UpdateAddress updates an existing address (partial update supported).
// Uses a transaction so the default address toggle is atomic.
func UpdateAddress(c *gin.Context) {
	userID := c.GetString("user_id")
	id := c.Param("id")

	var req UpdateAddressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var address models.Address
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("id = ? AND user_id = ?", id, userID).First(&address).Error; err != nil {
			return fmt.Errorf("not found")
		}

		if req.IsDefault != nil && *req.IsDefault {
			if err := tx.Model(&models.Address{}).Where("user_id = ? AND id != ?", userID, id).Update("is_default", false).Error; err != nil {
				return err
			}
		}

		if req.Label != "" {
			address.Label = req.Label
		}
		if req.Street != "" {
			address.Street = req.Street
		}
		if req.Ward != "" {
			address.Ward = req.Ward
		}
		if req.District != "" {
			address.District = req.District
		}
		if req.City != "" {
			address.City = req.City
		}
		if req.IsDefault != nil {
			address.IsDefault = *req.IsDefault
		}
		return tx.Save(&address).Error
	})

	if err != nil {
		if err.Error() == "not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Address not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update address"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Address updated", "data": address})
}

// DeleteAddress removes an address
func DeleteAddress(c *gin.Context) {
	userID := c.GetString("user_id")
	id := c.Param("id")

	result := database.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Address{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete address"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Address not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Address deleted"})
}
