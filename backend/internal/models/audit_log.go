package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AuditLog represents an audit log entry for tracking changes
type AuditLog struct {
	ID         uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	AdminID    *uuid.UUID     `gorm:"type:uuid;index" json:"admin_id,omitempty"`
	Action     string         `gorm:"type:varchar(100);not null;index" json:"action"`
	EntityType string         `gorm:"type:varchar(50);index" json:"entity_type,omitempty"`
	EntityID   *uuid.UUID     `gorm:"type:uuid" json:"entity_id,omitempty"`
	OldValue   string         `gorm:"type:jsonb" json:"old_value,omitempty"`
	NewValue   string         `gorm:"type:jsonb" json:"new_value,omitempty"`
	IPAddress  string         `gorm:"type:varchar(45)" json:"ip_address,omitempty"`
	UserAgent  string         `gorm:"type:text" json:"user_agent,omitempty"`
	CreatedAt  time.Time      `gorm:"not null;index" json:"created_at"`
	
	// Relationships
	Admin      *Admin         `gorm:"foreignKey:AdminID" json:"admin,omitempty"`
}

// TableName specifies the table name for AuditLog model
func (AuditLog) TableName() string {
	return "audit_logs"
}

// BeforeCreate hook to generate UUID before inserting
func (a *AuditLog) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

// AuditAction represents the type of action performed
type AuditAction string

const (
	ActionCreate AuditAction = "create"
	ActionUpdate AuditAction = "update"
	ActionDelete AuditAction = "delete"
	ActionLogin  AuditAction = "login"
	ActionLogout AuditAction = "logout"
	ActionView   AuditAction = "view"
	ActionExport AuditAction = "export"
	ActionImport AuditAction = "import"
)

// EntityType represents the type of entity being audited
type EntityType string

const (
	EntityAdmin    EntityType = "admin"
	EntityMember   EntityType = "member"
	EntityReferral EntityType = "referral"
	EntityIncome   EntityType = "income"
	EntitySystem   EntityType = "system"
)

// CreateAuditLogInput represents input for creating an audit log entry
type CreateAuditLogInput struct {
	AdminID    string `json:"admin_id,omitempty" validate:"omitempty,uuid"`
	Action     string `json:"action" validate:"required"`
	EntityType string `json:"entity_type,omitempty" validate:"omitempty"`
	EntityID   string `json:"entity_id,omitempty" validate:"omitempty,uuid"`
	OldValue   string `json:"old_value,omitempty"`
	NewValue   string `json:"new_value,omitempty"`
	IPAddress  string `json:"ip_address,omitempty"`
	UserAgent  string `json:"user_agent,omitempty"`
}

// AuditLogResponse represents the response for audit log data
type AuditLogResponse struct {
	ID         string     `json:"id"`
	AdminID    *string    `json:"admin_id,omitempty"`
	AdminName  *string    `json:"admin_name,omitempty"`
	Action     string     `json:"action"`
	EntityType string     `json:"entity_type,omitempty"`
	EntityID   *string    `json:"entity_id,omitempty"`
	OldValue   string     `json:"old_value,omitempty"`
	NewValue   string     `json:"new_value,omitempty"`
	IPAddress  string     `json:"ip_address,omitempty"`
	UserAgent  string     `json:"user_agent,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
}

// ToResponse converts AuditLog to AuditLogResponse
func (a *AuditLog) ToResponse() *AuditLogResponse {
	resp := &AuditLogResponse{
		ID:         a.ID.String(),
		Action:     a.Action,
		EntityType: a.EntityType,
		OldValue:   a.OldValue,
		NewValue:   a.NewValue,
		IPAddress:  a.IPAddress,
		UserAgent:  a.UserAgent,
		CreatedAt:  a.CreatedAt,
	}
	
	if a.AdminID != nil {
		adminIDStr := a.AdminID.String()
		resp.AdminID = &adminIDStr
	}
	
	if a.Admin != nil {
		resp.AdminName = &a.Admin.FullName
	}
	
	if a.EntityID != nil {
		entityIDStr := a.EntityID.String()
		resp.EntityID = &entityIDStr
	}
	
	return resp
}

// AuditLogFilter represents filter options for audit log queries
type AuditLogFilter struct {
	AdminID    *uuid.UUID `json:"admin_id,omitempty"`
	Action     *string    `json:"action,omitempty"`
	EntityType *string    `json:"entity_type,omitempty"`
	EntityID   *uuid.UUID `json:"entity_id,omitempty"`
	FromDate   *time.Time `json:"from_date,omitempty"`
	ToDate     *time.Time `json:"to_date,omitempty"`
	IPAddress  *string    `json:"ip_address,omitempty"`
}

// ToMap converts AuditLogFilter to a map for GORM queries
func (f *AuditLogFilter) ToMap() map[string]interface{} {
	m := make(map[string]interface{})
	
	if f.AdminID != nil {
		m["admin_id"] = *f.AdminID
	}
	if f.Action != nil {
		m["action"] = *f.Action
	}
	if f.EntityType != nil {
		m["entity_type"] = *f.EntityType
	}
	if f.EntityID != nil {
		m["entity_id"] = *f.EntityID
	}
	if f.IPAddress != nil {
		m["ip_address"] = *f.IPAddress
	}
	
	return m
}

// AuditLogSummary represents a summary of audit log data
type AuditLogSummary struct {
	TotalLogs     int64                `json:"total_logs"`
	ByAction      map[string]int64     `json:"by_action"`
	ByEntityType  map[string]int64     `json:"by_entity_type"`
	UniqueAdmins  int64                `json:"unique_admins"`
	PeriodStart   time.Time            `json:"period_start"`
	PeriodEnd     time.Time            `json:"period_end"`
}

// NewAuditLog creates a new audit log entry
func NewAuditLog(action AuditAction, entityType EntityType, entityID *uuid.UUID, adminID *uuid.UUID, oldValue, newValue interface{}, ipAddress, userAgent string) *AuditLog {
	var oldValStr, newValStr string
	
	// In production, you would marshal the interface to JSON
	// For simplicity, we're using string representation
	if oldValue != nil {
		oldValStr = formatValue(oldValue)
	}
	if newValue != nil {
		newValStr = formatValue(newValue)
	}
	
	return &AuditLog{
		Action:     string(action),
		EntityType: string(entityType),
		EntityID:   entityID,
		AdminID:    adminID,
		OldValue:   oldValStr,
		NewValue:   newValStr,
		IPAddress:  ipAddress,
		UserAgent:  userAgent,
		CreatedAt:  time.Now(),
	}
}

// formatValue formats a value for storage in the audit log
func formatValue(v interface{}) string {
	// Simple implementation - in production, use proper JSON marshaling
	return ""
}