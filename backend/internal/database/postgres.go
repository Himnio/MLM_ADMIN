package database

import (
	"fmt"
	"time"

	"mlm-admin-backend/internal/config"
	"mlm-admin-backend/internal/utils"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// PostgresDB wraps gorm.DB with additional functionality
type PostgresDB struct {
	DB     *gorm.DB
	Config *config.DatabaseConfig
	logger *utils.Logger
}

// NewPostgresDB creates a new PostgreSQL database connection
func NewPostgresDB(cfg *config.DatabaseConfig, log *utils.Logger) (*PostgresDB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=UTC",
		cfg.Host,
		cfg.Port,
		cfg.User,
		cfg.Password,
		cfg.Name,
		cfg.SSLMode,
	)

	// Configure GORM logger based on environment
	var gormLogger logger.Interface
	if cfg.SSLMode == "disable" {
		// Development: more verbose logging
		gormLogger = logger.Default.LogMode(logger.Info)
	} else {
		// Production: minimal logging
		gormLogger = logger.Default.LogMode(logger.Warn)
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: gormLogger,
	})
	if err != nil {
		log.Error(err, "Failed to connect to database", nil)
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Get underlying SQL DB for connection pooling configuration
	sqlDB, err := db.DB()
	if err != nil {
		log.Error(err, "Failed to get underlying SQL DB", nil)
		return nil, fmt.Errorf("failed to get underlying SQL DB: %w", err)
	}

	// Configure connection pool
	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(cfg.ConnMaxLifetime)

	// Test connection
	if err := sqlDB.Ping(); err != nil {
		log.Error(err, "Failed to ping database", nil)
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Info("Successfully connected to database", map[string]interface{}{
		"host": cfg.Host,
		"port": cfg.Port,
		"name": cfg.Name,
	})

	return &PostgresDB{
		DB:     db,
		Config: cfg,
		logger: log,
	}, nil
}

// Close closes the database connection
func (p *PostgresDB) Close() error {
	sqlDB, err := p.DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// Health checks the database connection
func (p *PostgresDB) Health() error {
	sqlDB, err := p.DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Ping()
}

// BeginTx starts a new transaction
func (p *PostgresDB) BeginTx() (*gorm.DB, error) {
	tx := p.DB.Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}
	return tx, nil
}

// WithContext returns a new DB instance with the given context
func (p *PostgresDB) WithContext(ctx interface{}) *gorm.DB {
	// Note: This is a simplified version. In real usage, you'd pass context.Context
	return p.DB
}

// AutoMigrate runs auto migration for given models
func (p *PostgresDB) AutoMigrate(models ...interface{}) error {
	return p.DB.AutoMigrate(models...)
}

// ExecuteRawSQL executes raw SQL
func (p *PostgresDB) ExecuteRawSQL(query string, values ...interface{}) error {
	return p.DB.Exec(query, values...).Error
}

// Transaction executes a function within a transaction
func (p *PostgresDB) Transaction(fn func(tx *gorm.DB) error) error {
	return p.DB.Transaction(fn)
}

// GetDB returns the underlying gorm.DB instance
func (p *PostgresDB) GetDB() *gorm.DB {
	return p.DB
}

// SetupTestDatabase creates a test database connection
func SetupTestDatabase(cfg *config.DatabaseConfig) (*PostgresDB, error) {
	// Use a test database name
	testCfg := *cfg
	testCfg.Name = cfg.Name + "_test"

	return NewPostgresDB(&testCfg, utils.NewLogger("test", "debug", "console", "stdout"))
}

// WaitForDatabase waits for the database to be available
func WaitForDatabase(cfg *config.DatabaseConfig, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	
	for time.Now().Before(deadline) {
		dsn := fmt.Sprintf(
			"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=UTC",
			cfg.Host,
			cfg.Port,
			cfg.User,
			cfg.Password,
			cfg.Name,
			cfg.SSLMode,
		)

		db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err == nil {
			if sqlDB, err := db.DB(); err == nil {
				if err := sqlDB.Ping(); err == nil {
					return nil
				}
			}
		}
		
		time.Sleep(2 * time.Second)
	}
	
	return fmt.Errorf("database connection timeout after %v", timeout)
}