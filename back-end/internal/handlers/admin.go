package handlers

import (
	"net/http"
	"time"

	"happy-pharmacy-api/internal/database"
	"happy-pharmacy-api/internal/models"

	"github.com/gin-gonic/gin"
)

// ============================================================
// Dashboard & Analytics
// ============================================================

// AdminGetDashboardStats returns real counts for the admin dashboard
func AdminGetDashboardStats(c *gin.Context) {
	var pendingPrescriptions int64
	var activeOrders int64
	var totalMedicines int64
	var lowStockCount int64
	var totalRevenue float64

	database.DB.Model(&models.Prescription{}).Where("status = ?", "pending").Count(&pendingPrescriptions)
	database.DB.Model(&models.Order{}).Where("status IN ?", []string{"placed", "processing", "shipped"}).Count(&activeOrders)
	database.DB.Model(&models.Medicine{}).Where("is_active = ?", true).Count(&totalMedicines)
	database.DB.Model(&models.Medicine{}).Where("is_active = ? AND stock_qty < ?", true, 10).Count(&lowStockCount)
	database.DB.Model(&models.Order{}).Where("payment_status = ?", "paid").Select("COALESCE(SUM(total_amount), 0)").Scan(&totalRevenue)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"pending_prescriptions": pendingPrescriptions,
			"active_orders":         activeOrders,
			"total_medicines":       totalMedicines,
			"low_stock_count":       lowStockCount,
			"total_revenue":         totalRevenue,
		},
	})
}

// AdminGetAnalytics returns sales data for charts
func AdminGetAnalytics(c *gin.Context) {
	// Top selling medicines
	type TopProduct struct {
		MedicineName string  `json:"medicine_name"`
		TotalQty     int     `json:"total_qty"`
		TotalRevenue float64 `json:"total_revenue"`
	}
	var topProducts []TopProduct
	database.DB.Model(&models.OrderItem{}).
		Select("medicines.name as medicine_name, SUM(order_items.quantity) as total_qty, SUM(order_items.unit_price * order_items.quantity) as total_revenue").
		Joins("JOIN medicines ON medicines.id = order_items.medicine_id").
		Group("medicines.name").
		Order("total_qty DESC").
		Limit(10).
		Scan(&topProducts)

	// Orders by day (last 30 days)
	type DailySales struct {
		Date       string  `json:"date"`
		OrderCount int     `json:"order_count"`
		Revenue    float64 `json:"revenue"`
	}
	var dailySales []DailySales
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	database.DB.Model(&models.Order{}).
		Select("DATE(created_at) as date, COUNT(*) as order_count, SUM(total_amount) as revenue").
		Where("created_at >= ?", thirtyDaysAgo).
		Group("DATE(created_at)").
		Order("date ASC").
		Scan(&dailySales)

	// Orders by status
	type StatusCount struct {
		Status string `json:"status"`
		Count  int    `json:"count"`
	}
	var statusCounts []StatusCount
	database.DB.Model(&models.Order{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Scan(&statusCounts)

	c.JSON(http.StatusOK, gin.H{
		"top_products":    topProducts,
		"daily_sales":     dailySales,
		"order_by_status": statusCounts,
	})
}

// ============================================================
// Product Management
// ============================================================

type AdminMedicineRequest struct {
	Name                 string  `json:"name" binding:"required"`
	GenericName          string  `json:"generic_name"`
	CategoryID           string  `json:"category_id" binding:"required"`
	RequiresPrescription bool    `json:"requires_prescription"`
	Price                float64 `json:"price" binding:"required"`
	StockQty             int     `json:"stock_qty"`
	PackagingType        string  `json:"packaging_type"`
	Description          string  `json:"description"`
	ImageURL             string  `json:"image_url"`
	OriginDocURL         string  `json:"origin_doc_url"`
}

func AdminGetMedicines(c *gin.Context) {
	var medicines []models.Medicine
	database.DB.Preload("Category").Order("created_at DESC").Find(&medicines)
	c.JSON(http.StatusOK, gin.H{"data": medicines})
}

func AdminCreateMedicine(c *gin.Context) {
	var req AdminMedicineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	medicine := models.Medicine{
		Name:                 req.Name,
		GenericName:          req.GenericName,
		CategoryID:           req.CategoryID,
		RequiresPrescription: req.RequiresPrescription,
		Price:                req.Price,
		StockQty:             req.StockQty,
		PackagingType:        req.PackagingType,
		Description:          req.Description,
		ImageURL:             req.ImageURL,
		OriginDocURL:         req.OriginDocURL,
		IsActive:             true,
	}

	if err := database.DB.Create(&medicine).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create medicine"})
		return
	}

	database.DB.Preload("Category").First(&medicine, "id = ?", medicine.ID)
	c.JSON(http.StatusCreated, gin.H{"message": "Medicine created", "data": medicine})
}

func AdminUpdateMedicine(c *gin.Context) {
	id := c.Param("id")
	var medicine models.Medicine
	if err := database.DB.First(&medicine, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Medicine not found"})
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if v, ok := updates["name"].(string); ok && v != "" {
		medicine.Name = v
	}
	if v, ok := updates["generic_name"].(string); ok {
		medicine.GenericName = v
	}
	if v, ok := updates["category_id"].(string); ok && v != "" {
		medicine.CategoryID = v
	}
	if v, ok := updates["requires_prescription"].(bool); ok {
		medicine.RequiresPrescription = v
	}
	if v, ok := updates["price"].(float64); ok {
		medicine.Price = v
	}
	if v, ok := updates["stock_qty"].(float64); ok {
		medicine.StockQty = int(v)
	}
	if v, ok := updates["packaging_type"].(string); ok {
		medicine.PackagingType = v
	}
	if v, ok := updates["description"].(string); ok {
		medicine.Description = v
	}
	if v, ok := updates["image_url"].(string); ok {
		medicine.ImageURL = v
	}
	if v, ok := updates["origin_doc_url"].(string); ok {
		medicine.OriginDocURL = v
	}
	if err := database.DB.Save(&medicine).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update medicine"})
		return
	}

	database.DB.Preload("Category").First(&medicine, "id = ?", medicine.ID)
	c.JSON(http.StatusOK, gin.H{"message": "Medicine updated", "data": medicine})
}

func AdminToggleMedicine(c *gin.Context) {
	id := c.Param("id")
	var medicine models.Medicine
	if err := database.DB.First(&medicine, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Medicine not found"})
		return
	}

	medicine.IsActive = !medicine.IsActive
	if err := database.DB.Save(&medicine).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to toggle medicine"})
		return
	}

	status := "activated"
	if !medicine.IsActive {
		status = "deactivated"
	}

	c.JSON(http.StatusOK, gin.H{"message": "Medicine " + status})
}

// ============================================================
// Order Management
// ============================================================

func AdminGetOrders(c *gin.Context) {
	var orders []models.Order
	query := database.DB.Preload("Items.Medicine").Preload("Shipment")

	// Filter by status
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	query.Order("created_at DESC").Find(&orders)
	c.JSON(http.StatusOK, gin.H{"data": orders})
}

type AdminUpdateOrderRequest struct {
	Status        string `json:"status"`
	PaymentStatus string `json:"payment_status"`
}

func AdminUpdateOrder(c *gin.Context) {
	id := c.Param("id")
	var order models.Order
	if err := database.DB.First(&order, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	var req AdminUpdateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Status != "" {
		order.Status = req.Status
	}
	if req.PaymentStatus != "" {
		order.PaymentStatus = req.PaymentStatus
	}
	if err := database.DB.Save(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update order"})
		return
	}

	// If shipped, create a shipment record
	if req.Status == "shipped" {
		var existing models.Shipment
		if database.DB.Where("order_id = ?", order.ID).First(&existing).Error != nil {
			shipment := models.Shipment{
				OrderID:      order.ID,
				TrackingCode: "HP-" + order.ID[:8],
				Carrier:      "Giao Hàng Nhanh",
				Status:       "in_transit",
			}
			est := time.Now().AddDate(0, 0, 3)
			shipment.EstimatedDelivery = &est
			database.DB.Create(&shipment)
		}
	}

	database.DB.Preload("Items.Medicine").Preload("Shipment").First(&order, "id = ?", order.ID)
	c.JSON(http.StatusOK, gin.H{"message": "Order updated", "data": order})
}

// ============================================================
// Prescription Review
// ============================================================

func AdminGetPrescriptions(c *gin.Context) {
	var prescriptions []models.Prescription
	query := database.DB

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	query.Order("created_at DESC").Find(&prescriptions)
	c.JSON(http.StatusOK, gin.H{"data": prescriptions})
}

type AdminReviewPrescriptionRequest struct {
	Status string `json:"status" binding:"required"` // 'approved' | 'rejected'
}

func AdminReviewPrescription(c *gin.Context) {
	id := c.Param("id")
	adminID := c.GetString("user_id")

	var prescription models.Prescription
	if err := database.DB.First(&prescription, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Prescription not found"})
		return
	}

	var req AdminReviewPrescriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Status != "approved" && req.Status != "rejected" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Status must be 'approved' or 'rejected'"})
		return
	}

	now := time.Now()
	prescription.Status = req.Status
	prescription.ReviewedByID = &adminID
	prescription.ReviewedAt = &now
	if err := database.DB.Save(&prescription).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to review prescription"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Prescription " + req.Status, "data": prescription})
}

// ============================================================
// Inventory Management
// ============================================================

func AdminGetInventory(c *gin.Context) {
	var medicines []models.Medicine
	database.DB.Preload("Category").Where("is_active = ?", true).Order("stock_qty ASC").Find(&medicines)
	c.JSON(http.StatusOK, gin.H{"data": medicines})
}

type AdminUpdateStockRequest struct {
	ChangeQty int    `json:"change_qty" binding:"required"` // positive=restock, negative=remove
	Reason    string `json:"reason" binding:"required"`     // 'restock' | 'expired' | 'damaged' | 'adjustment'
}

func AdminUpdateStock(c *gin.Context) {
	id := c.Param("id")
	adminID := c.GetString("user_id")

	var medicine models.Medicine
	if err := database.DB.First(&medicine, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Medicine not found"})
		return
	}

	var req AdminUpdateStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	newQty := medicine.StockQty + req.ChangeQty
	if newQty < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Stock cannot go below 0"})
		return
	}

	medicine.StockQty = newQty
	database.DB.Save(&medicine)

	// Log the change
	log := models.InventoryLog{
		MedicineID:  id,
		ChangeQty:   req.ChangeQty,
		Reason:      req.Reason,
		PerformedBy: adminID,
	}
	database.DB.Create(&log)

	c.JSON(http.StatusOK, gin.H{
		"message":   "Stock updated",
		"new_stock": newQty,
	})
}

func AdminGetInventoryLogs(c *gin.Context) {
	id := c.Param("id") // medicine ID
	var logs []models.InventoryLog
	database.DB.Where("medicine_id = ?", id).Order("created_at DESC").Limit(50).Find(&logs)
	c.JSON(http.StatusOK, gin.H{"data": logs})
}
