package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Base model holding UUID primary key and standard audit trails
type Base struct {
	ID        string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

type User struct {
	Base
	FullName     string `gorm:"type:text" json:"full_name"`
	Email        string `gorm:"type:text;uniqueIndex" json:"email"`
	Phone        string `gorm:"type:text" json:"phone"`
	PasswordHash string `gorm:"type:text" json:"-"` // Hidden from JSON
	Role         string `gorm:"type:text;default:'customer'" json:"role"` // 'customer' | 'admin'
}

type Address struct {
	Base
	UserID    string `gorm:"type:uuid" json:"user_id"`
	Label     string `gorm:"type:text" json:"label"` // 'home' | 'work'
	Street    string `gorm:"type:text" json:"street"`
	Ward      string `gorm:"type:text" json:"ward"`
	District  string `gorm:"type:text" json:"district"`
	City      string `gorm:"type:text" json:"city"`
	IsDefault bool   `json:"is_default"`

	User      User   `gorm:"foreignKey:UserID" json:"-"`
}

type MedicineCategory struct {
	Base
	Name     string `gorm:"type:text" json:"name"`
	Slug     string `gorm:"type:text;uniqueIndex" json:"slug"`
	IconURL  string `gorm:"type:text" json:"icon_url"`
	ParentID *string `gorm:"type:uuid" json:"parent_id,omitempty"` // For sub-categories
}

type Medicine struct {
	Base
	Name                string         `gorm:"type:text" json:"name"`
	GenericName         string         `gorm:"type:text" json:"generic_name"`
	CategoryID          string         `gorm:"type:uuid" json:"category_id"`
	RequiresPrescription bool          `json:"requires_prescription"`
	Price               float64        `gorm:"type:numeric(12,2)" json:"price"`
	StockQty            int            `json:"stock_qty"`
	PackagingType       string         `gorm:"type:text" json:"packaging_type"`
	Description         string         `gorm:"type:text" json:"description"`
	ImageURL            string         `gorm:"type:text" json:"image_url"`
	OriginDocURL        string         `gorm:"type:text" json:"origin_doc_url"`
	Attributes          datatypes.JSON `json:"attributes"` // JSONB field
	IsActive            bool           `json:"is_active"`

	Category            MedicineCategory `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
}

type Prescription struct {
	Base
	UserID         string         `gorm:"type:uuid" json:"user_id"`
	ImageURL       string         `gorm:"type:text" json:"image_url"`
	DoctorName     string         `gorm:"type:text" json:"doctor_name"`
	HospitalName   string         `gorm:"type:text" json:"hospital_name"`
	AIExtracted    datatypes.JSON `json:"ai_extracted"`
	Status         string         `gorm:"type:text;default:'pending'" json:"status"` // 'pending' | 'approved' | 'rejected'
	ReviewedByID   *string        `gorm:"type:uuid" json:"reviewed_by_id,omitempty"`
	ReviewedAt     *time.Time     `json:"reviewed_at,omitempty"`
}

type Order struct {
	Base
	UserID         string  `gorm:"type:uuid" json:"user_id"`
	AddressID      string  `gorm:"type:uuid" json:"address_id"`
	PrescriptionID *string `gorm:"type:uuid" json:"prescription_id,omitempty"`
	Status         string  `gorm:"type:text;default:'placed'" json:"status"` // 'placed' | 'processing' | 'shipped' | 'delivered'
	PaymentMethod  string  `gorm:"type:text" json:"payment_method"`
	PaymentStatus  string  `gorm:"type:text;default:'pending'" json:"payment_status"` // 'pending' | 'paid' | 'failed'
	TotalAmount    float64 `gorm:"type:numeric(12,2)" json:"total_amount"`
	Notes          string  `gorm:"type:text" json:"notes"`

	Items          []OrderItem `gorm:"foreignKey:OrderID" json:"items,omitempty"`
	Shipment       *Shipment   `gorm:"foreignKey:OrderID" json:"shipment,omitempty"`
}

type OrderItem struct {
	Base
	OrderID   string  `gorm:"type:uuid;index" json:"order_id"`
	MedicineID string `gorm:"type:uuid" json:"medicine_id"`
	Quantity  int     `json:"quantity"`
	UnitPrice float64 `gorm:"type:numeric(12,2)" json:"unit_price"`

	Medicine  Medicine `gorm:"foreignKey:MedicineID" json:"medicine,omitempty"`
}

type Subscription struct {
	Base
	UserID       string    `gorm:"type:uuid" json:"user_id"`
	MedicineID   string    `gorm:"type:uuid" json:"medicine_id"`
	AddressID    string    `gorm:"type:uuid" json:"address_id"` // Target address
	Frequency    string    `gorm:"type:text" json:"frequency"` // 'weekly' | 'monthly'
	Quantity     int       `json:"quantity"`
	NextOrderAt  time.Time `json:"next_order_at"`
	IsActive     bool      `json:"is_active"`

	Medicine     Medicine  `gorm:"foreignKey:MedicineID" json:"medicine,omitempty"`
	Address      Address   `gorm:"foreignKey:AddressID" json:"address,omitempty"`
}

type Shipment struct {
	Base
	OrderID           string     `gorm:"type:uuid;uniqueIndex" json:"order_id"`
	TrackingCode      string     `gorm:"type:text" json:"tracking_code"`
	Carrier           string     `gorm:"type:text" json:"carrier"`
	Status            string     `gorm:"type:text" json:"status"` // 'prepared' | 'in_transit' | 'delivered'
	EstimatedDelivery *time.Time `json:"estimated_delivery,omitempty"`
	ShipperLat        float64    `gorm:"type:numeric(9,6)" json:"shipper_lat,omitempty"`
	ShipperLng        float64    `gorm:"type:numeric(9,6)" json:"shipper_lng,omitempty"`
}

type InventoryLog struct {
	Base
	MedicineID  string `gorm:"type:uuid" json:"medicine_id"`
	ChangeQty   int    `json:"change_qty"`
	Reason      string `gorm:"type:text" json:"reason"` // 'sale' | 'restock' | 'expired'
	PerformedBy string `gorm:"type:uuid" json:"performed_by_id"`

	Medicine    Medicine `gorm:"foreignKey:MedicineID" json:"medicine,omitempty"`
}

type CartItem struct {
	Base
	UserID     string `gorm:"type:uuid;index" json:"user_id"`
	MedicineID string `gorm:"type:uuid" json:"medicine_id"`
	Quantity   int    `json:"quantity"`

	Medicine   Medicine `gorm:"foreignKey:MedicineID" json:"medicine,omitempty"`
}
