# Build stage
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /api cmd/api/main.go

# Runtime stage
FROM alpine:3.20
RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Asia/Ho_Chi_Minh

COPY --from=builder /api /api

# Create uploads directory
RUN mkdir -p /app/uploads/prescriptions
WORKDIR /app

EXPOSE 8080
CMD ["/api"]
