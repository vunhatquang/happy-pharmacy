# Happy Pharmacy — Deployment & CI/CD Guide

This guide covers deploying Happy Pharmacy to the cloud with a fully automated CI/CD pipeline.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Option 1: Vercel + Railway (Recommended)](#option-1-vercel--railway-recommended)
- [Option 2: Vercel + Fly.io (Alternative)](#option-2-vercel--flyio-alternative)
- [Option 3: Single VPS (Full Control)](#option-3-single-vps-full-control)
- [Environment Variables Reference](#environment-variables-reference)
- [CI/CD Pipeline](#cicd-pipeline)
- [Pre-Deployment Security Checklist](#pre-deployment-security-checklist)
- [Post-Deployment Verification](#post-deployment-verification)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Scaling Up](#scaling-up)

---

## Architecture Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Vercel CDN │────▶│  Go API      │────▶│  PostgreSQL   │
│  (Next.js)   │     │  (Gin)       │     │  (Database)   │
│  Front-end   │     │  Back-end    │     │               │
└──────────────┘     └──────────────┘     └──────────────┘
        ▲                    ▲
        │                    │
   ┌────┴────────────────────┴────┐
   │    GitHub Actions CI/CD      │
   │  lint → build → test → deploy│
   └──────────────────────────────┘
```

---

## Option 1: Vercel + Railway (Recommended)

**Estimated cost: $0–5/month for demo, ~$10/month for light production**

| Component | Service | Cost |
|-----------|---------|------|
| Frontend | Vercel (Hobby) | Free |
| Backend API | Railway | ~$5/month (free trial available) |
| PostgreSQL | Railway | Included (shared resources) |

### Step 1: Push Code to GitHub

```bash
git add .
git commit -m "Prepare for deployment"
git remote add origin https://github.com/YOUR_USERNAME/happy-pharmacy.git
git push -u origin main
```

### Step 2: Deploy PostgreSQL on Railway

1. Go to [railway.app](https://railway.app/) and sign in with GitHub.
2. Click **New Project** > **Provision PostgreSQL**.
3. Once created, click on the PostgreSQL service > **Variables** tab.
4. Copy the individual values: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`.

### Step 3: Deploy the Backend on Railway

1. In the same Railway project, click **New Service** > **GitHub Repo**.
2. Select your `happy-pharmacy` repository.
3. In **Settings**, set:
   - **Root Directory:** `back-end`
   - **Build Command:** `go build -o bin/api cmd/api/main.go`
   - **Start Command:** `./bin/api`
4. In **Variables**, add all variables from the [Environment Variables Reference](#environment-variables-reference).
5. Click **Deploy**. Go to **Settings** > **Networking** > **Generate Domain**.
6. Verify: visit `https://YOUR_BACKEND_URL/health` — should return `{"status":"Healthy"}`.

### Step 4: Deploy the Frontend on Vercel

1. Go to [vercel.com](https://vercel.com/) and sign in with GitHub.
2. Click **Add New** > **Project** > import your `happy-pharmacy` repo.
3. Configure:
   - **Root Directory:** `front-end/pharmacy-ui`
   - **Framework Preset:** Next.js (auto-detected)
4. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://YOUR_BACKEND_URL/api
   ```
5. Click **Deploy**.

### Step 5: Update Backend CORS

Add `ALLOWED_ORIGINS=https://happy-pharmacy.vercel.app` to your Railway variables so the backend restricts cross-origin requests to your frontend domain only.

---

## Option 2: Vercel + Fly.io (Alternative)

**Estimated cost: $0–3/month**

| Component | Service | Cost |
|-----------|---------|------|
| Frontend | Vercel (Hobby) | Free |
| Backend API | Fly.io | Free (up to 3 shared VMs) |
| PostgreSQL | Fly.io Postgres | Free (1GB, single node) |

### Step 1: Install Fly CLI & Deploy Database

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
fly postgres create --name happy-pharmacy-db --region sgp --initial-cluster-size 1 --vm-size shared-cpu-1x --volume-size 1
```

### Step 2: Deploy the Backend

The repo includes a Dockerfile at `back-end/Dockerfile`.

```bash
cd back-end
fly launch --name happy-pharmacy-api --region sgp --no-deploy

fly secrets set \
  DB_HOST=<from postgres create output> \
  DB_PORT=5432 \
  DB_USER=postgres \
  DB_PASSWORD=<password> \
  DB_NAME=happy_pharmacy \
  DB_SSLMODE=require \
  JWT_SECRET=$(openssl rand -hex 32) \
  ADMIN_DEFAULT_PASSWORD=$(openssl rand -base64 16) \
  GIN_MODE=release \
  ALLOWED_ORIGINS=https://happy-pharmacy.vercel.app

fly postgres attach happy-pharmacy-db --app happy-pharmacy-api
fly deploy
```

### Step 3: Frontend on Vercel

Same as Option 1, Step 4. Set `NEXT_PUBLIC_API_URL` to your Fly.io URL.

---

## Option 3: Single VPS (Full Control)

**Estimated cost: $4–6/month**

Providers: **Hetzner** ($4/mo), **DigitalOcean** ($6/mo), **Vultr** ($5/mo). Choose Singapore region for Vietnam latency.

### Step 1: Provision & Setup

```bash
ssh root@YOUR_SERVER_IP

apt update && apt upgrade -y
apt install -y curl git ufw nginx certbot python3-certbot-nginx

# Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable

# Docker
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin

# Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20

# Go
wget https://go.dev/dl/go1.22.5.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.22.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
```

### Step 2: Clone, Configure & Build

```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/happy-pharmacy.git
cd happy-pharmacy

# Create production .env
cat > .env << 'EOF'
PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<STRONG_PASSWORD>
DB_NAME=happy_pharmacy
DB_SSLMODE=disable
JWT_SECRET=<RANDOM_64_CHAR_STRING>
ADMIN_DEFAULT_PASSWORD=<STRONG_ADMIN_PASSWORD>
GIN_MODE=release
ALLOWED_ORIGINS=https://YOUR_DOMAIN
EOF

# Start PostgreSQL
docker compose up -d

# Build backend
cd back-end && go build -o bin/api cmd/api/main.go
```

### Step 3: Systemd Service

Create `/etc/systemd/system/happy-pharmacy-api.service`:

```ini
[Unit]
Description=Happy Pharmacy API
After=network.target docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/happy-pharmacy/back-end
EnvironmentFile=/opt/happy-pharmacy/.env
ExecStart=/opt/happy-pharmacy/back-end/bin/api
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now happy-pharmacy-api
```

### Step 4: Frontend & Nginx

```bash
cd /opt/happy-pharmacy/front-end/pharmacy-ui
npm ci
echo "NEXT_PUBLIC_API_URL=https://YOUR_DOMAIN/api" > .env.local
npm run build
npm install -g pm2
pm2 start npm --name "happy-pharmacy-ui" -- start
pm2 startup && pm2 save
```

Create `/etc/nginx/sites-available/happy-pharmacy`:

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 10M;
    }

    # Uploaded files
    location /uploads/ {
        proxy_pass http://localhost:8080;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:8080;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/happy-pharmacy /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
certbot --nginx -d YOUR_DOMAIN
```

---

## Environment Variables Reference

### Backend

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | API server port | `8080` | No |
| `DB_HOST` | PostgreSQL host | — | Yes |
| `DB_PORT` | PostgreSQL port | — | Yes |
| `DB_USER` | Database user | — | Yes |
| `DB_PASSWORD` | Database password | — | Yes |
| `DB_NAME` | Database name | — | Yes |
| `DB_SSLMODE` | PostgreSQL SSL mode | `disable` | Production: `require` |
| `JWT_SECRET` | Secret for signing JWT tokens | dev fallback | Yes |
| `GIN_MODE` | Gin framework mode | `debug` | Production: `release` |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | `*` (all) | Production: your domain |
| `ADMIN_DEFAULT_PASSWORD` | Initial admin account password | `admin123` | Production: strong password |
| `CLAUDE_API_KEY` | Anthropic API key (AI features) | — | Optional |

Generate secure values:
```bash
# JWT secret
openssl rand -hex 32

# Admin password
openssl rand -base64 16
```

### Frontend

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `https://api.yourdomain.com/api` |

---

## CI/CD Pipeline

### GitHub Actions Workflows

Create `.github/workflows/ci.yml` — runs on every push and PR:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # ─── Backend: Build & Test ─────────────────────────
  backend-build:
    name: Backend Build
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: back-end
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'
          cache-dependency-path: back-end/go.sum
      - name: Build
        run: go build -v ./...
      - name: Vet
        run: go vet ./...

  backend-test:
    name: Backend Integration Tests
    runs-on: ubuntu-latest
    needs: backend-build
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: testpassword
          POSTGRES_DB: happy_pharmacy_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'
          cache-dependency-path: back-end/go.sum
      - name: Start backend
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USER: postgres
          DB_PASSWORD: testpassword
          DB_NAME: happy_pharmacy_test
          JWT_SECRET: ci-test-secret-do-not-use-in-prod
          PORT: 8080
          GIN_MODE: test
        run: |
          cd back-end
          go run cmd/api/main.go &
          # Wait for server to be ready
          for i in $(seq 1 30); do
            curl -s http://localhost:8080/health && break
            sleep 1
          done
      - name: Run API tests
        run: cd back-end && bash test_api.sh

  # ─── Frontend: Lint & Build ─────────────────────────
  frontend-build:
    name: Frontend Build
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: front-end/pharmacy-ui
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: front-end/pharmacy-ui/package-lock.json
      - name: Install dependencies
        run: npm ci
      - name: Lint
        run: npm run lint
      - name: Build
        env:
          NEXT_PUBLIC_API_URL: https://placeholder.example.com/api
        run: npm run build

  # ─── Docker: Build Image ───────────────────────────
  docker-build:
    name: Docker Build (Backend)
    runs-on: ubuntu-latest
    needs: backend-build
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t happy-pharmacy-api back-end/
```

### Deploy Workflow (on merge to main)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

# Prevent concurrent deployments
concurrency:
  group: production
  cancel-in-progress: false

jobs:
  # Run CI first
  ci:
    uses: ./.github/workflows/ci.yml

  # Deploy backend to Railway (auto-deploys on push, this is a gate)
  deploy-backend:
    name: Deploy Backend
    runs-on: ubuntu-latest
    needs: ci
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Trigger Railway deploy
        run: |
          echo "Railway auto-deploys from main branch."
          echo "CI passed — Railway deployment will proceed."
          # If using Railway deploy hook:
          # curl -X POST "${{ secrets.RAILWAY_DEPLOY_HOOK }}"

  # Vercel auto-deploys, but we can add a check
  deploy-frontend:
    name: Deploy Frontend
    runs-on: ubuntu-latest
    needs: ci
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Verify deployment
        run: |
          echo "Vercel auto-deploys from main branch."
          echo "CI passed — Vercel deployment will proceed."
```

### Branch Strategy

```
main (production)
 └── develop (staging)
      └── feature/* (feature branches)
```

- **feature branches** → PR to `develop` → CI runs → merge
- **develop** → PR to `main` → CI runs → merge triggers deploy
- **hotfix branches** → PR directly to `main` for urgent fixes

### Setting Up Auto-Deploy

**Railway:**
1. In Railway project settings, connect your GitHub repo
2. Set auto-deploy branch to `main`
3. Optionally add a deploy webhook URL to `RAILWAY_DEPLOY_HOOK` GitHub secret

**Vercel:**
1. Vercel auto-deploys on push to `main` by default
2. Preview deployments are created for every PR

---

## Pre-Deployment Security Checklist

### Critical (must do before going live)

- [ ] Set `JWT_SECRET` to a cryptographically random 64-char string
- [ ] Set `ADMIN_DEFAULT_PASSWORD` to a strong password (then change via UI)
- [ ] Set `DB_PASSWORD` to a strong password
- [ ] Set `ALLOWED_ORIGINS` to your actual frontend domain(s)
- [ ] Set `GIN_MODE=release` to disable debug output
- [ ] Set `DB_SSLMODE=require` if database is remote
- [ ] Enable HTTPS on all endpoints (Vercel/Railway do this automatically)
- [ ] Remove or rotate the default admin password after first login

### Recommended

- [ ] Set up automated PostgreSQL backups
- [ ] Configure health check monitoring (UptimeRobot free tier)
- [ ] Review and test the complete user flow end-to-end
- [ ] Run `bash test_api.sh` against production URL

---

## Post-Deployment Verification

```bash
# 1. Health check (should return {"status":"Healthy"})
curl https://YOUR_BACKEND_URL/health

# 2. Run the API test suite against production
cd back-end
API_BASE=https://YOUR_BACKEND_URL/api bash test_api.sh

# 3. Frontend loads (should return 200)
curl -s -o /dev/null -w "%{http_code}" https://YOUR_FRONTEND_URL
```

Manual checks:
1. Register a new customer account
2. Browse medicines and search for "Paracetamol"
3. Add items to cart and complete checkout
4. Log in as admin and check the dashboard
5. Update an order status and verify it reflects for the customer

---

## Monitoring & Maintenance

### Free Monitoring

- **[UptimeRobot](https://uptimerobot.com/)** — monitors up to 50 URLs every 5 minutes (free). Set up:
  - `https://YOUR_BACKEND_URL/health`
  - `https://YOUR_FRONTEND_URL`
- **Railway/Vercel Logs** — built-in log viewer in their dashboards
- **Vercel Analytics** — built-in page-level analytics (free on Hobby plan)

### Database Backups

**Railway/Fly.io:** Automatic daily backups included.

**VPS:** Add a cron job:
```bash
# /etc/cron.d/pharmacy-backup
0 3 * * * root pg_dump -U postgres happy_pharmacy | gzip > /backups/pharmacy_$(date +\%Y\%m\%d).sql.gz
# Keep last 14 days
0 4 * * * root find /backups -name "pharmacy_*.sql.gz" -mtime +14 -delete
```

### Updating the Application

```bash
# 1. Push changes to GitHub
git push origin main

# 2. CI runs automatically
# 3. Railway and Vercel auto-deploy on success

# For VPS:
cd /opt/happy-pharmacy && git pull origin main
cd back-end && go build -o bin/api cmd/api/main.go
systemctl restart happy-pharmacy-api
cd ../front-end/pharmacy-ui && npm ci && npm run build
pm2 restart happy-pharmacy-ui
```

---

## Scaling Up

When you outgrow the initial setup:

| Need | Solution | Cost |
|------|----------|------|
| More backend capacity | Railway Pro or multiple Fly.io instances | $20/mo |
| Larger database | Managed Postgres (Supabase, Neon) | $25/mo |
| File storage (prescriptions) | AWS S3 or Cloudflare R2 (10GB free) | $0–5/mo |
| CDN for images | Cloudflare (free tier) | Free |
| Email notifications | Resend (100/day free) or SendGrid | Free–$15/mo |
| Real payments | Stripe / VNPAY / MoMo | Per-transaction |
| Custom domain | Namecheap / Cloudflare | ~$10/year |

### Recommended Growth Path

1. **Demo** (now): Vercel + Railway free trial = $0/mo
2. **Soft launch**: Vercel free + Railway Hobby = $5/mo + custom domain ($10/yr)
3. **Production**: Vercel Pro + Railway Pro + R2 storage = ~$40/mo
4. **Scale**: Add CDN, email, payments, mobile app as needed
