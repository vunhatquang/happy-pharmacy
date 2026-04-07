package handlers

import (
	"net/http"
	"strings"

	"happy-pharmacy-api/internal/database"
	"happy-pharmacy-api/internal/models"

	"github.com/gin-gonic/gin"
)

// escapeLike escapes LIKE wildcard characters in user input
func escapeLike(s string) string {
	s = strings.ReplaceAll(s, "\\", "\\\\")
	s = strings.ReplaceAll(s, "%", "\\%")
	s = strings.ReplaceAll(s, "_", "\\_")
	return s
}

// GetMedicines returns all active medicines, optionally filtered by category
func GetMedicines(c *gin.Context) {
	var medicines []models.Medicine
	query := database.DB.Preload("Category").Where("is_active = ?", true)

	if cat := c.Query("category"); cat != "" {
		query = query.Joins("JOIN medicine_categories ON medicine_categories.id = medicines.category_id").
			Where("medicine_categories.slug = ?", cat)
	}

	if err := query.Find(&medicines).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch medicines"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": medicines})
}

// GetMedicine returns a single medicine by ID
func GetMedicine(c *gin.Context) {
	id := c.Param("id")
	var medicine models.Medicine
	if err := database.DB.Preload("Category").First(&medicine, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Medicine not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": medicine})
}

// SearchMedicines searches medicines by name, generic name, or description
func SearchMedicines(c *gin.Context) {
	q := c.Query("q")
	if q == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Search query (q) is required"})
		return
	}

	var medicines []models.Medicine
	searchTerm := "%" + escapeLike(strings.ToLower(q)) + "%"
	if err := database.DB.Preload("Category").
		Where("is_active = ? AND (LOWER(name) LIKE ? OR LOWER(generic_name) LIKE ? OR LOWER(description) LIKE ?)",
			true, searchTerm, searchTerm, searchTerm).
		Find(&medicines).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search medicines"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": medicines})
}

// GetCategories returns all medicine categories
func GetCategories(c *gin.Context) {
	var categories []models.MedicineCategory
	if err := database.DB.Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch categories"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": categories})
}
