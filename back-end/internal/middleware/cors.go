package middleware

import (
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

// CORS configures Cross-Origin Resource Sharing headers.
// Set ALLOWED_ORIGINS env var to restrict origins in production (comma-separated).
// Example: ALLOWED_ORIGINS=https://happy-pharmacy.vercel.app,https://www.happypharmacy.vn
func CORS() gin.HandlerFunc {
	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")

		if allowedOrigins == "" {
			// Development: allow all
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		} else {
			for _, allowed := range strings.Split(allowedOrigins, ",") {
				if strings.TrimSpace(allowed) == origin {
					c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
					c.Writer.Header().Set("Vary", "Origin")
					break
				}
			}
		}

		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}
