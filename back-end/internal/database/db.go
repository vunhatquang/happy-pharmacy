package database

import (
	"fmt"
	"log"
	"os"

	"happy-pharmacy-api/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() {
	host := os.Getenv("DB_HOST")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")
	port := os.Getenv("DB_PORT")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Ho_Chi_Minh", 
		host, user, password, dbname, port)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

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
		hash, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
        admin := models.User{
            FullName: "Pharmacy Administrator",
            Email: "admin@happypharmacy.com",
            PasswordHash: string(hash),
            Role: "admin",
        }
        DB.Create(&admin)
		log.Println("Seeded default admin account (admin@happypharmacy.com)")
    }
}
