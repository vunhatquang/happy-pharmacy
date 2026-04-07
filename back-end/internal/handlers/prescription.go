package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"happy-pharmacy-api/internal/database"
	"happy-pharmacy-api/internal/models"

	"github.com/gin-gonic/gin"
)

const maxPrescriptionSize = 10 << 20 // 10 MB

var allowedImageTypes = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true, ".heic": true,
}

// UploadPrescription handles prescription image upload and creates a pending record
func UploadPrescription(c *gin.Context) {
	userID := c.GetString("user_id")

	file, err := c.FormFile("prescription_image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Prescription image is required"})
		return
	}

	// Validate file size
	if file.Size > maxPrescriptionSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File too large. Maximum size is 10MB"})
		return
	}

	// Validate file type by extension
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !allowedImageTypes[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Allowed: JPG, PNG, GIF, WebP, HEIC"})
		return
	}

	// Create uploads directory if it doesn't exist
	uploadDir := "./uploads/prescriptions"
	os.MkdirAll(uploadDir, 0755)

	// Save file with unique name
	filename := fmt.Sprintf("%s_%d%s", userID, time.Now().UnixNano(), ext)
	filePath := filepath.Join(uploadDir, filename)

	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	doctorName := c.PostForm("doctor_name")
	hospitalName := c.PostForm("hospital_name")

	prescription := models.Prescription{
		UserID:       userID,
		ImageURL:     "/uploads/prescriptions/" + filename,
		DoctorName:   doctorName,
		HospitalName: hospitalName,
		Status:       "pending",
	}

	if err := database.DB.Create(&prescription).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create prescription record"})
		return
	}

	// [PLACEHOLDER] In production, call Claude Vision API here
	// to extract medicine names, doctor name, hospital from the image
	c.JSON(http.StatusCreated, gin.H{
		"message": "Prescription uploaded successfully. Pending pharmacy review.",
		"data":    prescription,
		"ai_extracted": gin.H{
			"doctor_name": "Dr. Placeholder",
			"hospital":    "City Hospital",
			"medicines":   []string{"Amoxicillin 500mg"},
			"note":        "[AI placeholder] Real extraction will use Claude Vision API",
		},
	})
}

// GetPrescriptions returns the user's prescription history
func GetPrescriptions(c *gin.Context) {
	userID := c.GetString("user_id")
	var prescriptions []models.Prescription
	if err := database.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&prescriptions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load prescriptions"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": prescriptions})
}

// GetPrescription returns a single prescription
func GetPrescription(c *gin.Context) {
	userID := c.GetString("user_id")
	id := c.Param("id")
	var prescription models.Prescription
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&prescription).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Prescription not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": prescription})
}

// --- AI Placeholders ---

type ChatRequest struct {
	Symptoms string `json:"symptoms" binding:"required"`
}

func AskClaudeAssistant(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// [PLACEHOLDER] Call Claude API for medicine suggestions
	suggestion := fmt.Sprintf("Dựa trên triệu chứng '%s', chúng tôi gợi ý bạn thử các thuốc không kê đơn sau.", req.Symptoms)

	c.JSON(http.StatusOK, gin.H{
		"reply":              suggestion,
		"suggested_products": []string{"Paracetamol", "Vitamin C 1000mg"},
	})
}
