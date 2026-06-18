package database

import (
	"errors"
	"fmt"
	"net/url"
	"os"

	"mlm-admin-backend/internal/config"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

// RunMigrations applies SQL migrations from the given directory.
func RunMigrations(cfg *config.DatabaseConfig, migrationsDir string) error {
	if migrationsDir == "" {
		migrationsDir = "migrations"
	}
	if envPath := os.Getenv("MIGRATIONS_PATH"); envPath != "" {
		migrationsDir = envPath
	}

	dsn, err := postgresMigrateDSN(cfg)
	if err != nil {
		return err
	}

	sourceURL := fmt.Sprintf("file://%s", migrationsDir)
	m, err := migrate.New(sourceURL, dsn)
	if err != nil {
		return fmt.Errorf("create migrate instance: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("migrate up: %w", err)
	}

	return nil
}

func postgresMigrateDSN(cfg *config.DatabaseConfig) (string, error) {
	if cfg.DatabaseURL != "" {
		return cfg.DatabaseURL, nil
	}
	u := &url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(cfg.User, cfg.Password),
		Host:   fmt.Sprintf("%s:%s", cfg.Host, cfg.Port),
		Path: "/" + cfg.Name,
	}
	q := u.Query()
	q.Set("sslmode", cfg.SSLMode)
	u.RawQuery = q.Encode()
	return u.String(), nil
}
