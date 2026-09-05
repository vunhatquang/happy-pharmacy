package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"happy-pharmacy-api/internal/database"
	"happy-pharmacy-api/internal/handlers"
	"happy-pharmacy-api/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Initialize Database
	database.Connect()

	// Set Gin mode from env
	if mode := os.Getenv("GIN_MODE"); mode != "" {
		gin.SetMode(mode)
	}

	// Initialize Router
	r := gin.Default()

	// Middleware
	r.Use(middleware.CORS())

	// Serve uploaded files (prescriptions, etc.)
	r.Static("/uploads", "./uploads")

	// Health Check — verifies database connectivity
	r.GET("/health", func(c *gin.Context) {
		sqlDB, err := database.DB.DB()
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "Unhealthy", "error": "database unavailable"})
			return
		}
		if err := sqlDB.Ping(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "Unhealthy", "error": "database unreachable"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status":  "Healthy",
			"message": "Happy Pharmacy API is running!",
		})
	})

	// ========================================
	// Public Routes (no auth required)
	// ========================================
	api := r.Group("/api")
	{
		// Auth (rate limited: 10 requests per minute per IP)
		authLimiter := middleware.RateLimit(10, time.Minute)
		api.POST("/register", authLimiter, handlers.RegisterUser)
		api.POST("/login", authLimiter, handlers.LoginUser)

		// Browse medicines (public)
		api.GET("/medicines", handlers.GetMedicines)
		api.GET("/medicines/:id", handlers.GetMedicine)
		api.GET("/medicines/search", handlers.SearchMedicines)
		api.GET("/categories", handlers.GetCategories)

		// AI (rate limited: 5 requests per minute per IP)
		aiLimiter := middleware.RateLimit(5, time.Minute)
		api.POST("/ai/chat", aiLimiter, handlers.AskClaudeAssistant)
	}

	// ========================================
	// Authenticated Routes (customer + admin)
	// ========================================
	auth := api.Group("")
	auth.Use(middleware.AuthRequired())
	{
		// Profile
		auth.GET("/profile", handlers.GetProfile)
		auth.PUT("/profile", handlers.UpdateProfile)

		// Addresses
		auth.GET("/addresses", handlers.GetAddresses)
		auth.POST("/addresses", handlers.CreateAddress)
		auth.PUT("/addresses/:id", handlers.UpdateAddress)
		auth.DELETE("/addresses/:id", handlers.DeleteAddress)

		// Cart
		auth.GET("/cart", handlers.GetCart)
		auth.POST("/cart", handlers.AddToCart)
		auth.PUT("/cart/:id", handlers.UpdateCartItem)
		auth.DELETE("/cart/:id", handlers.RemoveFromCart)
		auth.DELETE("/cart", handlers.ClearCart)

		// Orders
		auth.POST("/orders", handlers.CreateOrder)
		auth.GET("/orders", handlers.GetOrders)
		auth.GET("/orders/:id", handlers.GetOrder)

		// Prescriptions
		auth.POST("/prescriptions", handlers.UploadPrescription)
		auth.GET("/prescriptions", handlers.GetPrescriptions)
		auth.GET("/prescriptions/:id", handlers.GetPrescription)

		// Subscriptions
		auth.POST("/subscriptions", handlers.CreateSubscription)
		auth.GET("/subscriptions", handlers.GetSubscriptions)
		auth.PUT("/subscriptions/:id/cancel", handlers.CancelSubscription)
		auth.PUT("/subscriptions/:id/reactivate", handlers.ReactivateSubscription)
	}

	// ========================================
	// Admin Routes (admin role required)
	// ========================================
	admin := api.Group("/admin")
	admin.Use(middleware.AuthRequired(), middleware.AdminRequired())
	{
		// Dashboard
		admin.GET("/stats", handlers.AdminGetDashboardStats)
		admin.GET("/analytics", handlers.AdminGetAnalytics)

		// Product Management
		admin.GET("/medicines", handlers.AdminGetMedicines)
		admin.POST("/medicines", handlers.AdminCreateMedicine)
		admin.PUT("/medicines/:id", handlers.AdminUpdateMedicine)
		admin.PATCH("/medicines/:id/toggle", handlers.AdminToggleMedicine)

		// Order Management
		admin.GET("/orders", handlers.AdminGetOrders)
		admin.PUT("/orders/:id", handlers.AdminUpdateOrder)

		// Prescription Review
		admin.GET("/prescriptions", handlers.AdminGetPrescriptions)
		admin.PUT("/prescriptions/:id/review", handlers.AdminReviewPrescription)

		// Inventory
		admin.GET("/inventory", handlers.AdminGetInventory)
		admin.PUT("/inventory/:id/stock", handlers.AdminUpdateStock)
		admin.GET("/inventory/:id/logs", handlers.AdminGetInventoryLogs)
	}

	// Run Server with graceful shutdown
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Server starting on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	// Wait for interrupt signal for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Give active connections 10 seconds to finish
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	// Close database connection
	if sqlDB, err := database.DB.DB(); err == nil {
		sqlDB.Close()
	}

	log.Println("Server exited gracefully")
}
