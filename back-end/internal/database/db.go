package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"happy-pharmacy-api/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() {
	// Support DATABASE_URL (Railway, Heroku, Fly.io) or individual vars
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		host := os.Getenv("DB_HOST")
		user := os.Getenv("DB_USER")
		password := os.Getenv("DB_PASSWORD")
		dbname := os.Getenv("DB_NAME")
		port := os.Getenv("DB_PORT")

		sslMode := os.Getenv("DB_SSLMODE")
		if sslMode == "" {
			sslMode = "disable"
		}

		dsn = fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Ho_Chi_Minh",
			host, user, password, dbname, port, sslMode)
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Configure connection pool
	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatalf("Failed to get underlying DB: %v", err)
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)
	sqlDB.SetConnMaxIdleTime(3 * time.Minute)

	log.Println("Successfully connected to the database!")

	// Auto Migrate the schema definitions to Postgres
	err = DB.AutoMigrate(
		&models.User{},
		&models.Address{},
		&models.MedicineCategory{},
		&models.Medicine{},
		&models.Prescription{},
		&models.Order{},
		&models.OrderItem{},
		&models.Subscription{},
		&models.Shipment{},
		&models.InventoryLog{},
		&models.CartItem{},
	)
	
	if err != nil {
		log.Fatalf("Failed to execute database migration: %v", err)
	}
	log.Println("Database AutoMigration completed successfully.")
	
	// Seed Default Admin User
	seedAdminUser()

	// Seed categories and demo medicines
	SeedData()
}

func seedAdminUser() {
	var adminCount int64
	DB.Model(&models.User{}).Where("role = ?", "admin").Count(&adminCount)

	if adminCount == 0 {
		adminPassword := os.Getenv("ADMIN_DEFAULT_PASSWORD")
		if adminPassword == "" {
			adminPassword = "admin123"
			log.Println("WARNING: Using default admin password. Set ADMIN_DEFAULT_PASSWORD env var in production!")
		}

		hash, err := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("Failed to hash admin password: %v", err)
			return
		}
		admin := models.User{
			FullName:     "Pharmacy Administrator",
			Email:        "admin@happypharmacy.com",
			PasswordHash: string(hash),
			Role:         "admin",
		}
		DB.Create(&admin)
		log.Println("Seeded default admin account (admin@happypharmacy.com)")
	}
}
