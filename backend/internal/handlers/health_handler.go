package handlers

import (
	"fmt"
	"net/http"
	"runtime"
	"time"

	"mlm-admin-backend/internal/config"
	"mlm-admin-backend/internal/database"
	"mlm-admin-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// HealthHandler handles health check requests
type HealthHandler struct {
	config *config.Config
	db     *database.PostgresDB
	logger *utils.Logger
}

// NewHealthHandler creates a new HealthHandler
func NewHealthHandler(cfg *config.Config, db *database.PostgresDB, log *utils.Logger) *HealthHandler {
	return &HealthHandler{
		config: cfg,
		db:     db,
		logger: log,
	}
}

// HealthResponse represents the health check response
type HealthResponse struct {
	Status    string         `json:"status"`
	Timestamp string         `json:"timestamp"`
	Service   ServiceInfo    `json:"service"`
	System    SystemInfo     `json:"system"`
	Database  ComponentState `json:"database"`
	Redis     ComponentState `json:"redis,omitempty"`
}

// ServiceInfo contains service metadata
type ServiceInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
	Env     string `json:"env"`
}

// SystemInfo contains system metrics
type SystemInfo struct {
	GoVersion   string `json:"go_version"`
	NumGoroutine int   `json:"num_goroutine"`
	NumCPU      int    `json:"num_cpu"`
	MemoryAlloc string `json:"memory_alloc"`
}

// ComponentState represents the state of a component
type ComponentState struct {
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
}

// @Summary Health check
// @Description Check the health status of the API
// @Tags health
// @Produce json
// @Success 200 {object} HealthResponse
// @Router /health [get]
func (h *HealthHandler) Health(c *gin.Context) {
	requestID := c.GetString("request_id")
	if requestID == "" {
		requestID = uuid.New().String()
	}

	// Check database health
	dbStatus := "healthy"
	dbMessage := ""
	if err := h.db.Health(); err != nil {
		dbStatus = "unhealthy"
		dbMessage = err.Error()
		h.logger.Error(err, "Database health check failed", map[string]interface{}{
			"request_id": requestID,
		})
	}

	// Get memory stats
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	response := HealthResponse{
		Status:    determineOverallStatus(dbStatus),
		Timestamp: getCurrentTimestamp(),
		Service: ServiceInfo{
			Name:    h.config.App.Name,
			Version: h.config.App.Version,
			Env:     h.config.App.Env,
		},
		System: SystemInfo{
			GoVersion:    runtime.Version(),
			NumGoroutine: runtime.NumGoroutine(),
			NumCPU:       runtime.NumCPU(),
			MemoryAlloc:  formatBytes(memStats.Alloc),
		},
		Database: ComponentState{
			Status:  dbStatus,
			Message: dbMessage,
		},
	}

	c.JSON(http.StatusOK, response)
}

// @Summary Readiness check
// @Description Check if the API is ready to accept requests
// @Tags health
// @Produce json
// @Success 200 {object} map[string]string
// @Router /health/ready [get]
func (h *HealthHandler) Ready(c *gin.Context) {
	// Check if database is connected
	if err := h.db.Health(); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"status":  "not_ready",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "ready",
	})
}

// @Summary Liveness check
// @Description Check if the API is alive
// @Tags health
// @Produce json
// @Success 200 {object} map[string]string
// @Router /health/live [get]
func (h *HealthHandler) Live(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "alive",
	})
}

// determineOverallStatus determines the overall health status
func determineOverallStatus(dbStatus string) string {
	if dbStatus == "healthy" {
		return "healthy"
	}
	return "degraded"
}

// getCurrentTimestamp returns current timestamp in ISO 8601 format
func getCurrentTimestamp() string {
	return time.Now().UTC().Format(time.RFC3339)
}

// formatBytes formats bytes to human readable string
func formatBytes(bytes uint64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := uint64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %ciB", float64(bytes)/float64(div), "KMGTPE"[exp])
}
