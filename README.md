# Happy Pharmacy — Online Pharmacy Platform

A full-stack e-commerce platform built for a family pharmacy in Vietnam. Customers can browse medicines, upload prescriptions, place orders, and subscribe to recurring deliveries. Pharmacy admins manage inventory, review prescriptions, and track orders through a dedicated dashboard.

> **Status:** MVP complete. All core flows working end-to-end with 74/74 API tests passing.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Design](#database-design)
- [Features](#features)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [AI-Assisted Development](#ai-assisted-development)
- [Deployment](#deployment)

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 16, React 19, TypeScript | App Router with SSR/SSG support, Vietnamese locale |
| **Styling** | Tailwind CSS 4 | Utility-first, fast iteration, responsive out of the box |
| **Backend** | Go 1.26, Gin web framework | Fast, compiled, single binary — easy to deploy |
| **ORM** | GORM | Auto-migration, relationships, soft deletes |
| **Database** | PostgreSQL 15 | JSONB for flexible fields (prescriptions, medicine attributes) |
| **Auth** | JWT (HS256, 72h expiry) | Stateless, works across web and future mobile app |
| **Password** | bcrypt | Industry standard hashing |
| **Container** | Docker Compose | One-command Postgres for local dev |
| **AI (planned)** | Claude API | Prescription image extraction, symptom-based chat assistant |
| **Payments (placeholder)** | VietQR, COD, Card | UI and method selection built; gateway integration pending |

### Key Libraries

**Backend (Go):**
- `gin-gonic/gin` — HTTP router and middleware
- `gorm.io/gorm` + `gorm.io/driver/postgres` — ORM with PostgreSQL
- `golang-jwt/jwt/v5` — JWT token generation and validation
- `golang.org/x/crypto` — bcrypt password hashing
- `joho/godotenv` — Environment variable loading
- `gorm.io/datatypes` — JSONB column support

**Frontend (Node.js):**
- `next` 16.2.2 — React framework with App Router
- `react` 19.2.4 — UI library
- `tailwindcss` 4 — CSS framework

---

## Project Structure

```
happy-pharmacy/
├── back-end/
│   ├── cmd/api/main.go              # Entry point, route registration
│   ├── internal/
│   │   ├── database/
│   │   │   ├── db.go                # Connection, migration, admin seed
│   │   │   └── seed.go              # Categories & medicines seed data
│   │   ├── handlers/
│   │   │   ├── auth.go              # Register, login, profile
│   │   │   ├── address.go           # CRUD for user addresses
│   │   │   ├── medicine.go          # Browse, search, detail
│   │   │   ├── cart.go              # Cart operations
│   │   │   ├── order.go             # Order creation & history
│   │   │   ├── prescription.go      # Upload, list, AI chat placeholder
│   │   │   ├── subscription.go      # Recurring order management
│   │   │   └── admin.go             # Dashboard, products, orders, inventory, prescriptions, analytics
│   │   ├── middleware/
│   │   │   ├── auth.go              # JWT auth + admin role check
│   │   │   └── cors.go              # CORS configuration
│   │   └── models/
│   │       └── models.go            # All GORM models
│   ��── test_api.sh                  # 74-assertion end-to-end test suite
│   ├── go.mod / go.sum
│   └── uploads/                     # Prescription images (local dev)
│
├── front-end/pharmacy-ui/
│   ├── app/                         # Next.js App Router pages
│   │   ├── layout.tsx               # Root layout, metadata, providers
│   │   ├── page.tsx                 # Homepage (browse, search, categories)
│   │   ├── providers.tsx            # Auth + Cart context providers
│   │   ├── login/ & register/       # Auth pages
│   │   ├── medicines/[id]/          # Product detail page
│   │   ├── cart/                    # Shopping cart
│   │   ├── checkout/                # Address + payment + order
│   │   ├── orders/ & orders/[id]/   # Order history & detail
│   │   ├── prescriptions/           # Upload & list prescriptions
│   │   ├── subscriptions/           # Manage recurring orders
│   │   ├── profile/                 # User profile & addresses
│   │   └── admin/                   # Admin dashboard
│   │       ├── products/            # Medicine CRUD
│   │       ├── orders/              # Order management
│   │       ├── prescriptions/       # Prescription review
│   │       ├── inventory/           # Stock management
│   │       └── analytics/           # Sales charts & reports
│   ├── components/
│   │   ├── Navbar.tsx               # Nav with auth state, cart badge
│   │   ├── Footer.tsx               # Site footer
│   │   └── ChatAssistant.tsx        # Floating AI chat widget
│   └── lib/
│       ├── api.ts                   # Centralized API client + types
│       ├── auth-context.tsx         # Auth state (login, register, logout)
│       └── cart-context.tsx         # Cart state (add, remove, sync)
│
├── docker-compose.yml               # PostgreSQL 15 container
├── .env                             # Environment variables
├── DEPLOYMENT.md                    # Cloud deployment guide
└── README.md                        # This file
```

---

## Database Design

PostgreSQL with 11 tables. All tables use **UUID primary keys** and **soft deletes** (records are never physically removed).

### Entity-Relationship Diagram

```
┌──────────┐     1:N     ┌───────────┐
│  users   │────────────>│ addresses  │
│          │             └───────────┘
│  (admin  │     1:N     ┌───────────────┐
│   or     │────────────>│ prescriptions │
│  customer)│            └───────────────┘
│          │     1:N     ┌──────────┐    1:N    ┌─────────────┐
│          │────────────>│  orders  │──────────>│ order_items  │
│          │             │          │           └──────┬──────┘
│          │             │          │    0..1   ┌──────┴──────┐
│          │             │          │──────────>│  shipments   │
│          │             └──────────┘           └─────────────┘
│          │     1:N     ┌───────────────┐
│          │────────────>│ subscriptions │
│          │             └───────────────┘
│          │     1:N     ┌────────────┐
│          │────────────>│ cart_items  │
└──────────┘             └─────┬──────┘
                               │ N:1
┌────────────────────┐   ┌─────┴──────┐   1:N   ┌────────────────┐
│ medicine_categories│──>│ medicines  │────────>│ inventory_logs │
└────────────────────┘   └────────────┘         └────────────────┘
```

### Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `users` | Customer and admin accounts | email (unique), password_hash, role |
| `addresses` | Shipping addresses per user | street, ward, district, city, is_default |
| `medicine_categories` | Product categories | name, slug (unique), icon_url, parent_id |
| `medicines` | Product catalog | name, price (VND), stock_qty, requires_prescription, is_active |
| `prescriptions` | Uploaded prescription images | image_url, status (pending/approved/rejected), ai_extracted (JSONB) |
| `orders` | Customer orders | status (placed > processing > shipped > delivered), payment_method, total_amount |
| `order_items` | Line items in an order | medicine_id, quantity, unit_price (snapshot) |
| `shipments` | Tracking info (1:1 with order) | tracking_code, carrier, estimated_delivery |
| `subscriptions` | Recurring medicine orders | frequency (weekly/monthly), next_order_at, is_active |
| `cart_items` | Shopping cart per user | medicine_id, quantity |
| `inventory_logs` | Stock change audit trail | change_qty, reason (restock/expired/damaged/sale) |

### Design Decisions

- **UUID primary keys** — avoids sequential ID enumeration; ready for distributed systems
- **Soft deletes** — `deleted_at` column; records are never lost, queries filter automatically via GORM
- **Price snapshot in order_items** — `unit_price` captures the price at time of purchase, independent of future price changes
- **JSONB for prescriptions** — `ai_extracted` stores flexible AI output without schema migration
- **Vietnamese addresses** — ward/district/city fields match Vietnam's administrative structure
- **Prices in VND** — `numeric(12,2)` accommodates Vietnamese Dong amounts (e.g., 25,000 VND)

---

## Features

### Customer-Facing
- Account registration & login with JWT authentication
- Browse medicines by health condition categories (6 categories, 13+ products)
- Full-text search across medicine name, generic name, and description
- Product detail page with proof-of-origin support
- Shopping cart with stock validation
- Checkout with address selection, payment method (COD/VietQR/Card), and order placement
- Order history with status tracking timeline (placed > processing > shipped > delivered)
- Prescription upload with image storage and pharmacy review workflow
- Subscription management (weekly/monthly auto-reorder setup)
- User profile with multiple shipping addresses
- AI chat assistant (placeholder — returns symptom-based suggestions)

### Admin Dashboard
- Real-time stats: pending prescriptions, active orders, low stock alerts, revenue
- Product management: create, edit, activate/deactivate medicines
- Order management: view all orders, update status & payment, auto-create shipments
- Prescription review: approve/reject with reviewer tracking
- Inventory management: stock adjustments with reason logging and audit trail
- Analytics: top-selling products, daily revenue chart, order status breakdown

### API
- 40+ REST endpoints across public, authenticated, and admin route groups
- JWT-based auth middleware with role-based access control
- Consistent JSON response format with proper HTTP status codes
- 74 automated test assertions covering all endpoints

---

## Getting Started

### Prerequisites

- **Go** 1.22+ — [install](https://go.dev/dl/)
- **Node.js** 20+ — [install](https://nodejs.org/)
- **Docker** — [install](https://www.docker.com/products/docker-desktop/)

### 1. Start the Database

```bash
docker compose up -d
```

This starts PostgreSQL 15 on port 5432. The database auto-creates tables and seeds sample data on first backend start.

### 2. Configure Environment

The `.env` file at the project root has defaults for local development:

```env
PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=happy_pharmacy
JWT_SECRET=happy-pharmacy-dev-secret-change-in-production
```

### 3. Start the Backend

```bash
cd back-end
go run cmd/api/main.go
```

The API will be running at `http://localhost:8080`. On first start it will:
- Auto-migrate all database tables
- Create a default admin account (`admin@happypharmacy.com` / `admin123`)
- Seed 6 medicine categories and 13 sample medicines with Vietnamese data

### 4. Start the Frontend

```bash
cd front-end/pharmacy-ui
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

### Default Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@happypharmacy.com | admin123 |
| Customer | (register a new account) | |

---

## Running Tests

The project includes an end-to-end API test suite that exercises all 40+ endpoints:

```bash
cd back-end
# Make sure the backend is running first
./test_api.sh
```

The test suite covers:
- Auth: registration, login, duplicate rejection, invalid input, JWT validation
- Profile & addresses: CRUD with partial updates
- Medicines: listing, filtering, search, single product
- Cart: add, update, remove, clear, stock validation
- Orders: placement, cart clearing, empty cart rejection, history, detail
- Prescriptions: upload, list, review
- Subscriptions: create, cancel, reactivate, invalid frequency
- Admin: stats, analytics, product CRUD, order management, prescription review, inventory
- Security: invalid JWT, missing auth, non-admin access blocked (403)

---

## AI-Assisted Development

This project was built with significant AI assistance using **Claude Code** (Anthropic's CLI agent). Here's how AI was used throughout development:

### How Claude Code Helped Build This Project

**Architecture & Planning**
- Analyzed the initial proposal and produced a detailed gap analysis comparing what existed vs. what was needed
- Designed the 3-phase implementation plan prioritizing core e-commerce flow first
- Proposed the database schema with Vietnamese localization considerations

**Backend Development**
- Generated all Go handler code: auth, cart, orders, prescriptions, subscriptions, admin
- Implemented JWT middleware with role-based access control
- Built the database seeding system with realistic Vietnamese pharmacy data (VND prices, Vietnamese category names)
- Restructured from 2 monolithic files into a clean domain-separated architecture

**Frontend Development**
- Built all 18 Next.js pages with Tailwind CSS styling
- Created the centralized API client with TypeScript types
- Implemented React Context for auth and cart state management
- Built responsive layouts with Vietnamese language support

**Testing & Quality**
- Generated the 74-assertion end-to-end test suite
- Identified and fixed bugs found during testing:
  - Incorrect HTTP status codes (200 vs 201 for resource creation)
  - 500 error on duplicate email (fixed to 409 Conflict)
  - Address/medicine updates requiring all fields (fixed to support partial updates)
  - Inconsistent API response structure

**Documentation**
- This README, the deployment guide, and inline code documentation

### AI Features in the App (Planned)

The app has placeholder endpoints for two Claude API integrations:

1. **Prescription Reading** — Upload a prescription photo, Claude Vision extracts medicine names, doctor name, and hospital. Currently returns mock data.
2. **Symptom Chat Assistant** — Describe symptoms, get non-prescription medicine suggestions. Currently returns a hardcoded Vietnamese response.

These will be connected to the Claude API when ready for production.

---

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full cloud deployment guide.

**Quick summary — most budget-friendly approach:**

| Component | Service | Free Tier |
|-----------|---------|-----------|
| Frontend | Vercel | Free (hobby plan) |
| Backend | Railway | $5/month (or free trial) |
| Database | Railway PostgreSQL | Included with backend plan |

Estimated monthly cost for a demo/small-scale deployment: **$0 – $5/month**.

---

## License

Private project. All rights reserved.
