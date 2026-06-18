package utils

import (
	"io"
	"os"
	"time"

	"github.com/rs/zerolog"
)

// Logger wraps zerolog with additional context
type Logger struct {
	logger zerolog.Logger
}

// LogEntry represents a structured log entry
type LogEntry struct {
	Level     string                 `json:"level"`
	Message   string                 `json:"message"`
	Timestamp time.Time              `json:"timestamp"`
	Service   string                 `json:"service,omitempty"`
	Version   string                 `json:"version,omitempty"`
	RequestID string                 `json:"request_id,omitempty"`
	UserID    string                 `json:"user_id,omitempty"`
	IPAddress string                 `json:"ip_address,omitempty"`
	UserAgent string                 `json:"user_agent,omitempty"`
	Path      string                 `json:"path,omitempty"`
	Method    string                 `json:"method,omitempty"`
	StatusCode int                   `json:"status_code,omitempty"`
	Duration  string                 `json:"duration,omitempty"`
	Error     string                 `json:"error,omitempty"`
	Fields    map[string]interface{} `json:"fields,omitempty"`
}

// NewLogger creates a new logger instance
func NewLogger(env, level, format, output string) *Logger {
	// Set log level
	logLevel, err := zerolog.ParseLevel(level)
	if err != nil {
		logLevel = zerolog.InfoLevel
	}

	// Set output writer
	var writer io.Writer
	switch output {
	case "stdout":
		writer = os.Stdout
	case "stderr":
		writer = os.Stderr
	default:
		writer = os.Stdout
	}

	// Format output based on environment
	if env != "production" && format != "json" {
		// Pretty console output for development
		writer = zerolog.ConsoleWriter{
			Out:        writer,
			TimeFormat: "2006-01-02 15:04:05",
		}
	}

	// Create logger
	logger := zerolog.New(writer).
		Level(logLevel).
		With().
		Timestamp().
		Logger()

	return &Logger{
		logger: logger,
	}
}

// WithContext returns a new logger with additional context
func (l *Logger) WithContext(fields map[string]interface{}) *Logger {
	contextLogger := l.logger.With()
	for key, value := range fields {
		contextLogger = contextLogger.Interface(key, value)
	}
	
	return &Logger{
		logger: contextLogger.Logger(),
	}
}

// WithRequestID adds request ID to the logger context
func (l *Logger) WithRequestID(requestID string) *Logger {
	return &Logger{
		logger: l.logger.With().Str("request_id", requestID).Logger(),
	}
}

// WithUserID adds user ID to the logger context
func (l *Logger) WithUserID(userID string) *Logger {
	return &Logger{
		logger: l.logger.With().Str("user_id", userID).Logger(),
	}
}

// Debug logs a debug message
func (l *Logger) Debug(msg string, fields map[string]interface{}) {
	if fields != nil {
		l.logger.Debug().Fields(fields).Msg(msg)
	} else {
		l.logger.Debug().Msg(msg)
	}
}

// Info logs an info message
func (l *Logger) Info(msg string, fields map[string]interface{}) {
	if fields != nil {
		l.logger.Info().Fields(fields).Msg(msg)
	} else {
		l.logger.Info().Msg(msg)
	}
}

// Warn logs a warning message
func (l *Logger) Warn(msg string, fields map[string]interface{}) {
	if fields != nil {
		l.logger.Warn().Fields(fields).Msg(msg)
	} else {
		l.logger.Warn().Msg(msg)
	}
}

// Error logs an error message
func (l *Logger) Error(err error, msg string, fields map[string]interface{}) {
	event := l.logger.Error()
	if err != nil {
		event = event.Err(err)
	}
	if fields != nil {
		event = event.Fields(fields)
	}
	event.Msg(msg)
}

// Fatal logs a fatal message and exits
func (l *Logger) Fatal(err error, msg string, fields map[string]interface{}) {
	event := l.logger.Fatal()
	if err != nil {
		event = event.Err(err)
	}
	if fields != nil {
		event = event.Fields(fields)
	}
	event.Msg(msg)
}

// Panic logs a panic message and panics
func (l *Logger) Panic(err error, msg string, fields map[string]interface{}) {
	event := l.logger.Panic()
	if err != nil {
		event = event.Err(err)
	}
	if fields != nil {
		event = event.Fields(fields)
	}
	event.Msg(msg)
}

// LogHTTPResponse logs an HTTP response
func (l *Logger) LogHTTPResponse(method, path string, statusCode int, duration time.Duration, fields map[string]interface{}) {
	l.Info("HTTP response", mergeFields(fields, map[string]interface{}{
		"method":      method,
		"path":        path,
		"status_code": statusCode,
		"duration":    duration.String(),
	}))
}

// LogHTTPRequest logs an HTTP request
func (l *Logger) LogHTTPRequest(method, path, clientIP, userAgent string, fields map[string]interface{}) {
	l.Info("HTTP request", mergeFields(fields, map[string]interface{}{
		"method":      method,
		"path":        path,
		"ip_address":  clientIP,
		"user_agent":  userAgent,
	}))
}

// mergeFields merges two field maps
func mergeFields(base, additional map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{})
	for k, v := range base {
		result[k] = v
	}
	for k, v := range additional {
		result[k] = v
	}
	return result
}

// Global logger instance
var globalLogger *Logger

// InitGlobalLogger initializes the global logger
func InitGlobalLogger(env, level, format, output string) {
	globalLogger = NewLogger(env, level, format, output)
}

// GetGlobalLogger returns the global logger instance
func GetGlobalLogger() *Logger {
	if globalLogger == nil {
		// Initialize with defaults if not set
		globalLogger = NewLogger("development", "info", "console", "stdout")
	}
	return globalLogger
}