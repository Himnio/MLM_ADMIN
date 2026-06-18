package auth

import (
	"errors"
	"fmt"
	"time"

	"mlm-admin-backend/internal/config"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// JWTClaims represents the claims in a JWT token
type JWTClaims struct {
	UserID   string `json:"user_id"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	TokenType string `json:"token_type"` // "access" or "refresh"
	jwt.RegisteredClaims
}

// TokenPair represents a pair of access and refresh tokens
type TokenPair struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
	TokenType    string    `json:"token_type"`
}

// JWTManager handles JWT token operations
type JWTManager struct {
	secretKey    string
	accessExpiry time.Duration
	refreshExpiry time.Duration
	issuer       string
}

// NewJWTManager creates a new JWT manager
func NewJWTManager(cfg *config.JWTConfig) *JWTManager {
	return &JWTManager{
		secretKey:    cfg.Secret,
		accessExpiry: cfg.AccessExpiry,
		refreshExpiry: cfg.RefreshExpiry,
		issuer:       cfg.Issuer,
	}
}

// GenerateTokenPair generates both access and refresh tokens
func (jm *JWTManager) GenerateTokenPair(userID uuid.UUID, email, role string) (*TokenPair, error) {
	// Generate access token
	accessToken, expiresAt, err := jm.GenerateToken(userID, email, role, "access", jm.accessExpiry)
	if err != nil {
		return nil, err
	}

	// Generate refresh token
	refreshToken, _, err := jm.GenerateToken(userID, email, role, "refresh", jm.refreshExpiry)
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    expiresAt,
		TokenType:    "Bearer",
	}, nil
}

// GenerateToken generates a JWT token
func (jm *JWTManager) GenerateToken(userID uuid.UUID, email, role, tokenType string, expiry time.Duration) (string, time.Time, error) {
	now := time.Now()
	expiresAt := now.Add(expiry)

	claims := JWTClaims{
		UserID:    userID.String(),
		Email:     email,
		Role:      role,
		TokenType: tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    jm.issuer,
			Subject:   userID.String(),
			ID:        uuid.New().String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(jm.secretKey))
	if err != nil {
		return "", time.Time{}, fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, expiresAt, nil
}

// ValidateToken validates a JWT token and returns the claims
func (jm *JWTManager) ValidateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(jm.secretKey), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

// ValidateAccessToken validates an access token
func (jm *JWTManager) ValidateAccessToken(tokenString string) (*JWTClaims, error) {
	claims, err := jm.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	if claims.TokenType != "access" {
		return nil, errors.New("invalid token type: expected access token")
	}

	return claims, nil
}

// ValidateRefreshToken validates a refresh token
func (jm *JWTManager) ValidateRefreshToken(tokenString string) (*JWTClaims, error) {
	claims, err := jm.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	if claims.TokenType != "refresh" {
		return nil, errors.New("invalid token type: expected refresh token")
	}

	return claims, nil
}

// RevokeToken marks a token as revoked (in production, use Redis or database)
func (jm *JWTManager) RevokeToken(tokenString string) error {
	// In production, add token to a blacklist in Redis with TTL
	// For now, we'll just return nil (tokens will expire naturally)
	return nil
}

// IsTokenRevoked checks if a token has been revoked
func (jm *JWTManager) IsTokenRevoked(tokenString string) bool {
	// In production, check Redis blacklist
	return false
}

// ExtractUserID extracts the user ID from a token string
func (jm *JWTManager) ExtractUserID(tokenString string) (uuid.UUID, error) {
	claims, err := jm.ValidateToken(tokenString)
	if err != nil {
		return uuid.Nil, err
	}

	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid user ID in token: %w", err)
	}

	return userID, nil
}

// RefreshAccessToken generates a new access token using a refresh token
func (jm *JWTManager) RefreshAccessToken(refreshToken string) (*TokenPair, error) {
	// Validate refresh token
	claims, err := jm.ValidateRefreshToken(refreshToken)
	if err != nil {
		return nil, err
	}

	// Check if token is revoked
	if jm.IsTokenRevoked(refreshToken) {
		return nil, errors.New("token has been revoked")
	}

	// Parse user ID
	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		return nil, err
	}

	// Generate new token pair
	return jm.GenerateTokenPair(userID, claims.Email, claims.Role)
}