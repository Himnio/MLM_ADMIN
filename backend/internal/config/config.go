package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the application
type Config struct {
	App        AppConfig
	Database   DatabaseConfig
	Redis      RedisConfig
	JWT        JWTConfig
	CORS       CORSConfig
	RateLimit  RateLimitConfig
	Logging    LoggingConfig
	Swagger    SwaggerConfig
	Security   SecurityConfig
	Pagination PaginationConfig
	MLM        MLMConfig
}

// AppConfig holds application-specific configuration
type AppConfig struct {
	Env         string
	Port        string
	Name        string
	Version     string
	URL         string
	FrontendURL string
}

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
	Host            string
	Port            string
	Name            string
	User            string
	Password        string
	SSLMode         string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

// RedisConfig holds Redis configuration
type RedisConfig struct {
	URL      string
	Password string
	DB       int
}

// JWTConfig holds JWT configuration
type JWTConfig struct {
	Secret         string
	AccessExpiry   time.Duration
	RefreshExpiry  time.Duration
	Issuer         string
}

// CORSConfig holds CORS configuration
type CORSConfig struct {
	AllowedOrigins []string
	AllowedMethods []string
	AllowedHeaders []string
	AllowCredentials bool
	MaxAge         int
}

// RateLimitConfig holds rate limiting configuration
type RateLimitConfig struct {
	Enabled  bool
	Requests int
	Window   time.Duration
	Burst    int
}

// LoggingConfig holds logging configuration
type LoggingConfig struct {
	Level  string
	Format string
	Output string
}

// SwaggerConfig holds Swagger documentation configuration
type SwaggerConfig struct {
	Enabled   bool
	Host      string
	BasePath  string
}

// SecurityConfig holds security configuration
type SecurityConfig struct {
	BcryptCost      int
	SessionTimeout  time.Duration
	MaxLoginAttempts int
	LockoutDuration time.Duration
}

// PaginationConfig holds pagination configuration
type PaginationConfig struct {
	DefaultPage  int
	DefaultLimit int
	MaxLimit     int
}

// MLMConfig holds MLM-specific configuration
type MLMConfig struct {
	MaxLevels              int
	IncomeCalculationBatchSize int
}

// Load reads configuration from environment variables
func Load() (*Config, error) {
	// Load .env file if it exists (only in development)
	if os.Getenv("APP_ENV") != "production" {
		if err := godotenv.Load(); err != nil {
			// Don't fail if .env doesn't exist in development
			fmt.Println("No .env file found, using environment variables")
		}
	}

	// Validate required environment variables
	if err := validateRequiredEnv(); err != nil {
		return nil, err
	}

	// Parse configuration
	config := &Config{
		App: AppConfig{
			Env:         getEnv("APP_ENV", "development"),
			Port:        getEnv("APP_PORT", "8080"),
			Name:        getEnv("APP_NAME", "mlm-admin-api"),
			Version:     getEnv("APP_VERSION", "1.0.0"),
			URL:         getEnv("APP_URL", "http://localhost:8080"),
			FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),
		},
		Database: DatabaseConfig{
			Host:            getEnv("DB_HOST", "localhost"),
			Port:            getEnv("DB_PORT", "5432"),
			Name:            getEnv("DB_NAME", "mlm_admin"),
			User:            getEnv("DB_USER", "admin"),
			Password:        getEnvOrPanic("DB_PASSWORD"),
			SSLMode:         getEnv("DB_SSL_MODE", "disable"),
			MaxOpenConns:    getEnvInt("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns:    getEnvInt("DB_MAX_IDLE_CONNS", 5),
			ConnMaxLifetime: getEnvDuration("DB_CONN_MAX_LIFETIME", 1*time.Hour),
		},
		Redis: RedisConfig{
			URL:      getEnv("REDIS_URL", "redis://localhost:6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getEnvInt("REDIS_DB", 0),
		},
		JWT: JWTConfig{
			Secret:        getEnvOrPanic("JWT_SECRET"),
			AccessExpiry:  getEnvDuration("JWT_ACCESS_EXPIRY", 15*time.Minute),
			RefreshExpiry: getEnvDuration("JWT_REFRESH_EXPIRY", 7*24*time.Hour),
			Issuer:        getEnv("JWT_ISSUER", "mlm-admin-api"),
		},
		CORS: CORSConfig{
			AllowedOrigins:   getEnvArray("CORS_ALLOWED_ORIGINS", []string{"http://localhost:3000"}),
			AllowedMethods:   getEnvArray("CORS_ALLOWED_METHODS", []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"}),
			AllowedHeaders:   getEnvArray("CORS_ALLOWED_HEADERS", []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"}),
			AllowCredentials: getEnvBool("CORS_ALLOW_CREDENTIALS", true),
			MaxAge:           getEnvInt("CORS_MAX_AGE", 86400),
		},
		RateLimit: RateLimitConfig{
			Enabled:  getEnvBool("RATE_LIMIT_ENABLED", true),
			Requests: getEnvInt("RATE_LIMIT_REQUESTS", 100),
			Window:   getEnvDuration("RATE_LIMIT_WINDOW", 1*time.Minute),
			Burst:    getEnvInt("RATE_LIMIT_BURST", 10),
		},
		Logging: LoggingConfig{
			Level:  getEnv("LOG_LEVEL", "info"),
			Format: getEnv("LOG_FORMAT", "json"),
			Output: getEnv("LOG_OUTPUT", "stdout"),
		},
		Swagger: SwaggerConfig{
			Enabled:  getEnvBool("SWAGGER_ENABLED", true),
			Host:     getEnv("SWAGGER_HOST", "localhost:8080"),
			BasePath: getEnv("SWAGGER_BASE_PATH", "/api/v1"),
		},
		Security: SecurityConfig{
			BcryptCost:      getEnvInt("BCRYPT_COST", 12),
			SessionTimeout:  getEnvDuration("SESSION_TIMEOUT", 30*time.Minute),
			MaxLoginAttempts: getEnvInt("MAX_LOGIN_ATTEMPTS", 5),
			LockoutDuration: getEnvDuration("LOCKOUT_DURATION", 15*time.Minute),
		},
		Pagination: PaginationConfig{
			DefaultPage:  getEnvInt("DEFAULT_PAGE", 1),
			DefaultLimit: getEnvInt("DEFAULT_LIMIT", 20),
			MaxLimit:     getEnvInt("MAX_LIMIT", 100),
		},
		MLM: MLMConfig{
			MaxLevels:              getEnvInt("MLM_MAX_LEVELS", 10),
			IncomeCalculationBatchSize: getEnvInt("INCOME_CALCULATION_BATCH_SIZE", 100),
		},
	}

	return config, nil
}

// validateRequiredEnv checks that all required environment variables are set
func validateRequiredEnv() error {
	requiredVars := []string{
		"DB_PASSWORD",
		"JWT_SECRET",
	}

	var missingVars []string
	for _, varName := range requiredVars {
		if os.Getenv(varName) == "" {
			missingVars = append(missingVars, varName)
		}
	}

	if len(missingVars) > 0 {
		return fmt.Errorf("missing required environment variables: %v", missingVars)
	}

	return nil
}

// getEnv returns the value of an environment variable or a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvOrPanic returns the value of an environment variable or panics if not set
func getEnvOrPanic(key string) string {
	value := os.Getenv(key)
	if value == "" {
		panic(fmt.Sprintf("Required environment variable %s is not set", key))
	}
	return value
}

// getEnvInt returns the integer value of an environment variable or a default value
func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

// getEnvBool returns the boolean value of an environment variable or a default value
func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}

// getEnvDuration returns the duration value of an environment variable or a default value
func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if durationValue, err := time.ParseDuration(value); err == nil {
			return durationValue
		}
	}
	return defaultValue
}

// getEnvArray returns the string array value of an environment variable or a default value
func getEnvArray(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		// Split by comma
		parts := splitString(value, ",")
		if len(parts) > 0 {
			return parts
		}
	}
	return defaultValue
}

// splitString splits a string by a delimiter and trims whitespace
func splitString(s, delimiter string) []string {
	if s == "" {
		return []string{}
	}
	
	var result []string
	for _, part := range split(s, delimiter) {
		trimmed := trimSpace(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

// split splits a string by a delimiter (simple implementation to avoid strings import)
func split(s, sep string) []string {
	var result []string
	start := 0
	for i := 0; i <= len(s); i++ {
		if i == len(s) || s[i:i+len(sep)] == sep {
			result = append(result, s[start:i])
			start = i + len(sep)
		}
	}
	return result
}

// trimSpace trims leading and trailing whitespace
func trimSpace(s string) string {
	start := 0
	end := len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t') {
		end--
	}
	return s[start:end]
}