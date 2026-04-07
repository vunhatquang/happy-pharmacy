package database

import (
	"log"

	"happy-pharmacy-api/internal/models"
)

// SeedData creates initial categories and medicines if they don't exist.
func SeedData() {
	log.Println("Seeding categories and medicines...")

	// Categories
	catPain := models.MedicineCategory{Name: "Giảm đau", Slug: "giam-dau", IconURL: "💊"}
	catVitamins := models.MedicineCategory{Name: "Vitamin & Thực phẩm chức năng", Slug: "vitamin", IconURL: "🍊"}
	catCold := models.MedicineCategory{Name: "Cảm cúm", Slug: "cam-cum", IconURL: "🤧"}
	catSkin := models.MedicineCategory{Name: "Chăm sóc da", Slug: "cham-soc-da", IconURL: "🧴"}
	catDigestive := models.MedicineCategory{Name: "Tiêu hóa", Slug: "tieu-hoa", IconURL: "🫄"}
	catEyeEar := models.MedicineCategory{Name: "Mắt & Tai", Slug: "mat-tai", IconURL: "👁️"}

	DB.FirstOrCreate(&catPain, models.MedicineCategory{Slug: "giam-dau"})
	DB.FirstOrCreate(&catVitamins, models.MedicineCategory{Slug: "vitamin"})
	DB.FirstOrCreate(&catCold, models.MedicineCategory{Slug: "cam-cum"})
	DB.FirstOrCreate(&catSkin, models.MedicineCategory{Slug: "cham-soc-da"})
	DB.FirstOrCreate(&catDigestive, models.MedicineCategory{Slug: "tieu-hoa"})
	DB.FirstOrCreate(&catEyeEar, models.MedicineCategory{Slug: "mat-tai"})

	// Medicines — prices in VND
	medicines := []struct {
		Name        string
		GenericName string
		CategoryID  string
		Price       float64
		StockQty    int
		Description string
		Packaging   string
		Prescription bool
	}{
		{"Paracetamol", "Acetaminophen", catPain.ID, 25000, 100, "Thuốc giảm đau, hạ sốt phổ biến.", "Hộp 30 viên", false},
		{"Ibuprofen", "Ibuprofen", catPain.ID, 45000, 50, "Thuốc chống viêm không steroid (NSAID).", "Hộp 20 viên", false},
		{"Aspirin", "Acetylsalicylic Acid", catPain.ID, 30000, 150, "Giảm đau, chống viêm, hạ sốt.", "Lọ 100 viên", false},
		{"Vitamin C 1000mg", "Vitamin C", catVitamins.ID, 120000, 200, "Tăng cường hệ miễn dịch, chống oxy hóa.", "Lọ 60 viên", false},
		{"Vitamin D3 2000IU", "Cholecalciferol", catVitamins.ID, 150000, 120, "Hỗ trợ sức khỏe xương và hệ miễn dịch.", "Lọ 90 viên", false},
		{"DayQuil", "Acetaminophen/Dextromethorphan", catCold.ID, 185000, 80, "Giảm triệu chứng cảm cúm ban ngày.", "Lọ 24 viên", false},
		{"Siro ho", "Guaifenesin", catCold.ID, 65000, 60, "Long đờm, giảm nghẹt ngực.", "Chai 118ml", false},
		{"Kem Hydrocortisone", "Hydrocortisone 1%", catSkin.ID, 85000, 40, "Kem chống ngứa cho kích ứng da.", "Tuýp 28g", false},
		{"Amoxicillin 500mg", "Amoxicillin", catPain.ID, 55000, 30, "Kháng sinh điều trị nhiễm khuẩn (cần đơn thuốc).", "Hộp 21 viên", true},
		{"Omeprazole 20mg", "Omeprazole", catDigestive.ID, 75000, 90, "Giảm axit dạ dày, điều trị trào ngược.", "Hộp 28 viên", false},
		{"Smecta", "Diosmectite", catDigestive.ID, 48000, 70, "Điều trị tiêu chảy, bảo vệ niêm mạc dạ dày.", "Hộp 30 gói", false},
		{"Nhỏ mắt Rohto", "Naphazoline/Zinc", catEyeEar.ID, 35000, 110, "Nhỏ mắt giảm mỏi, đỏ mắt.", "Lọ 13ml", false},
	}

	for _, m := range medicines {
		med := models.Medicine{
			GenericName:          m.GenericName,
			CategoryID:           m.CategoryID,
			Price:                m.Price,
			StockQty:             m.StockQty,
			Description:          m.Description,
			PackagingType:        m.Packaging,
			RequiresPrescription: m.Prescription,
			IsActive:             true,
		}
		DB.FirstOrCreate(&med, models.Medicine{Name: m.Name})
	}

	log.Println("Seeding complete.")
}
