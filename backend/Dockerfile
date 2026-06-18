# Build stage
FROM golang:1.23-alpine AS builder

# Install necessary build dependencies
RUN apk add --no-cache git

# Set working directory
WORKDIR /app

# Copy go mod files first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/server

# Runtime stage
FROM alpine:latest

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates tzdata wget

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Set working directory
WORKDIR /root/

# Copy binary from builder
COPY --from=builder /app/server .

# Copy migrations directory
COPY --from=builder /app/migrations ./migrations

# Note: .env file is copied from host during docker-compose up via environment variables
# Do not copy .env in Dockerfile as it's in .dockerignore

# Change ownership to non-root user
RUN chown -R appuser:appgroup /root/

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider "http://localhost:${PORT:-8080}/api/v1/health" || exit 1

# Run the application
CMD ["./server"]