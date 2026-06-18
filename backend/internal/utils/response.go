package utils

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// Response represents a standardized API response
type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Meta    *Meta       `json:"meta,omitempty"`
}

// Meta represents pagination metadata
type Meta struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
	HasNext    bool  `json:"has_next"`
	HasPrev    bool  `json:"has_prev"`
}

// SuccessResponse sends a success response
func SuccessResponse(c *gin.Context, statusCode int, message string, data interface{}) {
	c.JSON(statusCode, Response{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// SuccessResponseWithMeta sends a success response with pagination metadata
func SuccessResponseWithMeta(c *gin.Context, statusCode int, message string, data interface{}, meta *Meta) {
	c.JSON(statusCode, Response{
		Success: true,
		Message: message,
		Data:    data,
		Meta:    meta,
	})
}

// SendPaginatedResponse sends a paginated response with standard wrapper
func SendPaginatedResponse(c *gin.Context, statusCode int, message string, data interface{}, total int64, page, limit int) {
	c.JSON(statusCode, Response{
		Success: true,
		Message: message,
		Data:    data,
		Meta:    CalculatePaginationMeta(page, limit, total),
	})
}

// GetPaginationParams extracts and validates pagination parameters from request
func GetPaginationParams(c *gin.Context, defaultLimit, maxLimit int) (int, int) {
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", strconv.Itoa(defaultLimit))

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = defaultLimit
	}
	if limit > maxLimit {
		limit = maxLimit
	}

	return page, limit
}

// GetQueryParamPtr returns a pointer to a query parameter value, or nil if empty
func GetQueryParamPtr(c *gin.Context, key string) *string {
	val := c.Query(key)
	if val == "" {
		return nil
	}
	return &val
}

// GetQueryParamInt returns query parameter as integer with default value
func GetQueryParamInt(c *gin.Context, key string, defaultVal int) int {
	val := c.Query(key)
	if val == "" {
		return defaultVal
	}
	intVal, err := strconv.Atoi(val)
	if err != nil || intVal < 1 {
		return defaultVal
	}
	return intVal
}

// ErrorResponse sends an error response
func ErrorResponse(c *gin.Context, statusCode int, message string, err string) {
	c.JSON(statusCode, Response{
		Success: false,
		Message: message,
		Error:   err,
	})
}

// BadRequestResponse sends a 400 Bad Request response
func BadRequestResponse(c *gin.Context, message string, err string) {
	ErrorResponse(c, http.StatusBadRequest, message, err)
}

// UnauthorizedResponse sends a 401 Unauthorized response
func UnauthorizedResponse(c *gin.Context, message string, err string) {
	ErrorResponse(c, http.StatusUnauthorized, message, err)
}

// ForbiddenResponse sends a 403 Forbidden response
func ForbiddenResponse(c *gin.Context, message string, err string) {
	ErrorResponse(c, http.StatusForbidden, message, err)
}

// NotFoundResponse sends a 404 Not Found response
func NotFoundResponse(c *gin.Context, message string, err string) {
	ErrorResponse(c, http.StatusNotFound, message, err)
}

// ConflictResponse sends a 409 Conflict response
func ConflictResponse(c *gin.Context, message string, err string) {
	ErrorResponse(c, http.StatusConflict, message, err)
}

// InternalServerErrorResponse sends a 500 Internal Server Error response
func InternalServerErrorResponse(c *gin.Context, message string, err string) {
	ErrorResponse(c, http.StatusInternalServerError, message, err)
}

// CalculatePaginationMeta calculates pagination metadata
func CalculatePaginationMeta(page, limit int, total int64) *Meta {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}

	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	return &Meta{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
	}
}

// PaginatedResponse represents a paginated response
type PaginatedResponse struct {
	Items interface{} `json:"items"`
	Meta  *Meta       `json:"meta"`
}

// NewPaginatedResponse creates a new paginated response
func NewPaginatedResponse(items interface{}, page, limit int, total int64) *PaginatedResponse {
	return &PaginatedResponse{
		Items: items,
		Meta:  CalculatePaginationMeta(page, limit, total),
	}
}

// SuccessPaginatedResponse sends a success response with pagination
func SuccessPaginatedResponse(c *gin.Context, statusCode int, message string, items interface{}, page, limit int, total int64) {
	SuccessResponseWithMeta(c, statusCode, message, items, CalculatePaginationMeta(page, limit, total))
}

// ValidationErrorResponse sends a validation error response
func ValidationErrorResponse(c *gin.Context, errors map[string]string) {
	c.JSON(http.StatusBadRequest, Response{
		Success: false,
		Message: "Validation failed",
		Error:   "Invalid input data",
		Data:    gin.H{"errors": errors},
	})
}
