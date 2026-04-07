# Happy Pharmacy — Deployment Guide

This guide covers deploying the Happy Pharmacy platform to the cloud, starting with the **most budget-friendly approach** and scaling up as needed.

---

## Table of Contents

- [Option 1: Vercel + Railway (Recommended — Cheapest)](#option-1-vercel--railway-recommended--cheapest)
- [Option 2: Vercel + Fly.io (Alternative)](#option-2-vercel--flyio-alternative)
- [Option 3: Single VPS (Full Control)](#option-3-single-vps-full-control)
- [Environment Variables Reference](#environment-variables-reference)
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [CI/CD with GitHub Actions](#cicd-with-github-actions)
- [Post-Deployment Verification](#post-deployment-verification)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Scaling Up](#scaling-up)

---

## Option 1: Vercel + Railway (Recommended — Cheapest)

**Estimated cost: $0–5/month for demo, ~$10/month for light production**

| Component | Service | Cost |
|-----------|---------|------|
| Frontend | Vercel (Hobby) | Free |
| Backend API | Railway | ~$5/month (free trial available) |
| PostgreSQL | Railway | Included (shared resources) |

### Step 1: Push Code to GitHub

```bash
git init
git add .
git commit -m "Initial deployment"
git remote add origin https://github.com/YOUR_USERNAME/happy-pharmacy.git
git push -u origin main
```

### Step 2: Deploy PostgreSQL on Railway

1. Go to [railway.app](https://railway.app/) and sign in with GitHub.
2. Click **New Project** > **Provision PostgreSQL**.
3. Once created, click on the PostgreSQL service > **Variables** tab.
4. Copy the `DATABASE_URL` — it looks like:
   ```
   postgresql://postgres:PASSWORD@HOST:PORT/railway
   ```
5. Also note the individual values: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`.

### Step 3: Deploy the Backend on Railway

1. In the same Railway project, click **New Service** > **GitHub Repo**.
2. Select your `happy-pharmacy` repository.
3. In **Settings**, set:
   - **Root Directory:** `back-end`
   - **Build Command:** `go build -o bin/api cmd/api/main.go`
   - **Start Command:** `./bin/api`
4. In **Variables**, add:

   ```
   PORT=8080
   DB_HOST=<PGHOST from step 2>
   DB_PORT=<PGPORT from step 2>
   DB_USER=<PGUSER from step 2>
   DB_PASSWORD=<PGPASSWORD from step 2>
   DB_NAME=<PGDATABASE from step 2>
   JWT_SECRET=<generate a random 64-char string>
   GIN_MODE=release
   ```

   To generate a JWT secret:
   ```bash
   openssl rand -hex 32
   ```

5. Click **Deploy**. Railway will build and start the Go binary.
6. Once deployed, go to **Settings** > **Networking** > **Generate Domain**.
7. Note your backend URL (e.g., `https://happy-pharmacy-api-production.up.railway.app`).
8. Verify: visit `https://YOUR_BACKEND_URL/health` — should return `{"status":"Healthy"}`.

### Step 4: Deploy the Frontend on Vercel

1. Go to [vercel.com](https://vercel.com/) and sign in with GitHub.
2. Click **Add New** > **Project** > import your `happy-pharmacy` repo.
3. Configure:
   - **Root Directory:** `front-end/pharmacy-ui`
   - **Framework Preset:** Next.js (auto-detected)
   - **Build Command:** `npm run build` (default)
4. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://YOUR_BACKEND_URL/api
   ```
   Replace `YOUR_BACKEND_URL` with the Railway URL from Step 3.
5. Click **Deploy**.
6. Vercel gives you a URL like `https://happy-pharmacy.vercel.app`.

### Step 5: Update Backend CORS

After deployment, update the CORS middleware to only allow your Vercel domain instead of `*`. In `back-end/internal/middleware/cors.go`, change the allowed origin to your Vercel URL, or use an environment variable:

```go
origin := os.Getenv("ALLOWED_ORIGIN")
if origin == "" {
    origin = "*"
}
```

Then add `ALLOWED_ORIGIN=https://happy-pharmacy.vercel.app` to your Railway variables.

---

## Option 2: Vercel + Fly.io (Alternative)

**Estimated cost: $0–3/month — Fly.io has a generous free tier**

| Component | Service | Cost |
|-----------|---------|------|
| Frontend | Vercel (Hobby) | Free |
| Backend API | Fly.io | Free (up to 3 shared VMs) |
| PostgreSQL | Fly.io Postgres | Free (1GB, single node) |

### Step 1: Install Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

### Step 2: Deploy PostgreSQL

```bash
fly postgres create --name happy-pharmacy-db --region sgp --initial-cluster-size 1 --vm-size shared-cpu-1x --volume-size 1
```

Note the connection string from the output.

### Step 3: Create a Dockerfile for the Backend

Create `back-end/Dockerfile`:

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /api cmd/api/main.go

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
COPY --from=builder /api /api
EXPOSE 8080
CMD ["/api"]
```

### Step 4: Deploy the Backend

```bash
cd back-end
fly launch --name happy-pharmacy-api --region sgp --no-deploy
```

Set secrets:
```bash
fly secrets set \
  DB_HOST=<from postgres create output> \
  DB_PORT=5432 \
  DB_USER=postgres \
  DB_PASSWORD=<password> \
  DB_NAME=happy_pharmacy \
  JWT_SECRET=$(openssl rand -hex 32) \
  GIN_MODE=release
```

Attach the database:
```bash
fly postgres attach happy-pharmacy-db --app happy-pharmacy-api
```

Deploy:
```bash
fly deploy
```

### Step 5: Frontend on Vercel

Same as Option 1, Step 4. Set `NEXT_PUBLIC_API_URL` to your Fly.io URL.

---

## Option 3: Single VPS (Full Control)

**Estimated cost: $4–6/month — good for learning and full control**

Suitable providers: **Hetzner** ($4/mo), **DigitalOcean** ($6/mo), **Vultr** ($5/mo), or **Linode** ($5/mo). Choose a Singapore or nearby region for Vietnam latency.

### Step 1: Provision a VPS

- Ubuntu 22.04 LTS
- 1 vCPU, 1GB RAM, 25GB SSD (cheapest tier)
- Region: Singapore (sgp) for low latency to Vietnam

### Step 2: Initial Server Setup

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Update and install essentials
apt update && apt upgrade -y
apt install -y curl git ufw nginx certbot python3-certbot-nginx

# Set up firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
apt install -y docker-compose-plugin
```

### Step 3: Install Go and Node.js

```bash
# Go
wget https://go.dev/dl/go1.22.5.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.22.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Node.js (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
```

### Step 4: Clone and Configure

```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/happy-pharmacy.git
cd happy-pharmacy

# Start PostgreSQL
docker compose up -d

# Create production .env
cat > .env << 'EOF'
PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<STRONG_PASSWORD_HERE>
DB_NAME=happy_pharmacy
JWT_SECRET=<RANDOM_64_CHAR_STRING>
GIN_MODE=release
EOF
```

### Step 5: Build and Run Backend

```bash
cd /opt/happy-pharmacy/back-end
go build -o bin/api cmd/api/main.go
```

Create a systemd service (`/etc/systemd/system/happy-pharmacy-api.service`):

```ini
[Unit]
Description=Happy Pharmacy API
After=network.target postgresql.service

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
systemctl enable happy-pharmacy-api
systemctl start happy-pharmacy-api
```

### Step 6: Build Frontend

```bash
cd /opt/happy-pharmacy/front-end/pharmacy-ui
npm install

# Set the API URL for production
echo "NEXT_PUBLIC_API_URL=https://YOUR_DOMAIN/api" > .env.local

npm run build
```

### Step 7: Configure Nginx

Create `/etc/nginx/sites-available/happy-pharmacy`:

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
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
        client_max_body_size 10M;  # For prescription uploads
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
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### Step 8: SSL with Let's Encrypt

```bash
certbot --nginx -d YOUR_DOMAIN
```

### Step 9: Start Frontend with PM2

```bash
npm install -g pm2
cd /opt/happy-pharmacy/front-end/pharmacy-ui
pm2 start npm --name "happy-pharmacy-ui" -- start
pm2 startup
pm2 save
```

---

## Environment Variables Reference

### Backend (`back-end/.env`)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `PORT` | API server port | `8080` | Yes |
| `DB_HOST` | PostgreSQL host | `localhost` | Yes |
| `DB_PORT` | PostgreSQL port | `5432` | Yes |
| `DB_USER` | Database user | `postgres` | Yes |
| `DB_PASSWORD` | Database password | `password` | Yes |
| `DB_NAME` | Database name | `happy_pharmacy` | Yes |
| `JWT_SECRET` | Secret for signing JWT tokens | `(64-char random string)` | Yes |
| `GIN_MODE` | Gin framework mode | `release` | Production |
| `ALLOWED_ORIGIN` | CORS allowed origin | `https://your-domain.com` | Production |
| `CLAUDE_API_KEY` | Anthropic API key (for AI features) | `sk-ant-...` | Optional |

### Frontend (`front-end/pharmacy-ui/.env.local`)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `https://api.yourdomain.com/api` | Yes |

---

## Pre-Deployment Checklist

Before going to production, address these items:

### Security
- [ ] Change `JWT_SECRET` to a strong random value (not the dev default)
- [ ] Change default admin password (`admin123`) after first login
- [ ] Change PostgreSQL password from `password` to something strong
- [ ] Restrict CORS to your actual frontend domain (not `*`)
- [ ] Enable HTTPS (SSL/TLS) on all endpoints
- [ ] Remove or protect the default admin seed in production
- [ ] Set `GIN_MODE=release` to disable debug output

### Database
- [ ] Set up automated PostgreSQL backups (Railway and Fly.io do this automatically)
- [ ] If using VPS: configure `pg_dump` cron job for daily backups

### Application
- [ ] Set `NEXT_PUBLIC_API_URL` to the production backend URL
- [ ] Verify all 74 API tests pass against the production backend
- [ ] Test the full customer flow: register > browse > cart > checkout > order
- [ ] Test admin flow: login > dashboard > manage products > review prescription

### Infrastructure
- [ ] Set up health check monitoring (e.g., UptimeRobot — free tier)
- [ ] Configure log aggregation (Railway and Fly.io have built-in logs)

---

## CI/CD with GitHub Actions

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
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
      - name: Build backend
        run: cd back-end && go build ./...
      - name: Start backend and run tests
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USER: postgres
          DB_PASSWORD: testpassword
          DB_NAME: happy_pharmacy_test
          JWT_SECRET: ci-test-secret
          PORT: 8080
        run: |
          cd back-end
          go run cmd/api/main.go &
          sleep 5
          bash test_api.sh

  build-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: front-end/pharmacy-ui/package-lock.json
      - name: Install dependencies
        run: cd front-end/pharmacy-ui && npm ci
      - name: Build
        run: cd front-end/pharmacy-ui && npm run build
```

Railway and Vercel both auto-deploy on push to `main`, so the CI/CD pipeline is:

1. Push to GitHub
2. GitHub Actions runs tests and build checks
3. If tests pass, Railway auto-deploys backend
4. Vercel auto-deploys frontend

---

## Post-Deployment Verification

After deploying, run through this checklist:

```bash
# 1. Health check
curl https://YOUR_BACKEND_URL/health

# 2. Run the test suite against production
cd back-end
./test_api.sh https://YOUR_BACKEND_URL

# 3. Check frontend loads
curl -s -o /dev/null -w "%{http_code}" https://YOUR_FRONTEND_URL
# Should return 200
```

Then manually verify:
1. Open the frontend URL in a browser
2. Register a new customer account
3. Browse medicines and search for "Paracetamol"
4. Add items to cart and complete checkout
5. Log in as admin (`admin@happypharmacy.com`) and check the dashboard
6. Update an order status and verify it reflects for the customer

---

## Monitoring & Maintenance

### Free Monitoring

- **[UptimeRobot](https://uptimerobot.com/)** — Free tier monitors up to 50 URLs every 5 minutes. Set up checks for:
  - `https://YOUR_BACKEND_URL/health`
  - `https://YOUR_FRONTEND_URL`
- **Railway Logs** — Built-in log viewer in the Railway dashboard
- **Vercel Analytics** — Built-in page-level analytics (free on Hobby plan)

### Database Backups

**Railway:** Automatic daily backups included.

**VPS (manual):** Add a cron job:
```bash
# /etc/cron.d/pharmacy-backup
0 3 * * * root pg_dump -U postgres happy_pharmacy | gzip > /backups/pharmacy_$(date +\%Y\%m\%d).sql.gz
```

### Updating the Application

```bash
# Push changes to GitHub
git push origin main

# Railway and Vercel auto-deploy from main branch
# Monitor deployment in their respective dashboards
```

For the VPS option:
```bash
cd /opt/happy-pharmacy
git pull origin main

# Rebuild backend
cd back-end && go build -o bin/api cmd/api/main.go
systemctl restart happy-pharmacy-api

# Rebuild frontend
cd ../front-end/pharmacy-ui && npm run build
pm2 restart happy-pharmacy-ui
```

---

## Scaling Up

When you outgrow the initial setup:

| Need | Solution | Cost |
|------|----------|------|
| More backend capacity | Railway Pro plan or multiple Fly.io instances | $20/mo |
| Larger database | Railway Pro or managed Postgres (Supabase, Neon) | $25/mo |
| File storage (prescriptions) | AWS S3 or Cloudflare R2 (10GB free) | $0–5/mo |
| CDN for images | Cloudflare (free tier) | Free |
| Email notifications | Resend (100 emails/day free) or SendGrid | Free–$15/mo |
| Real payments | Stripe / VNPAY / MoMo integration | Per-transaction fees |
| Mobile app | React Native sharing the same Go API | Dev time only |
| Custom domain | Buy from Namecheap/Cloudflare | ~$10/year |

### Recommended Growth Path

1. **Demo phase** (now): Vercel + Railway free trial = $0/mo
2. **Soft launch**: Vercel free + Railway Hobby = $5/mo + custom domain ($10/yr)
3. **Production**: Vercel Pro + Railway Pro + R2 storage = ~$40/mo
4. **Scale**: Add CDN, email, real payments, mobile app as needed
