package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync/atomic"
	"syscall"
	"time"

	_ "mlm-admin-backend/docs"
	"mlm-admin-backend/internal/auth"
	"mlm-admin-backend/internal/config"
	"mlm-admin-backend/internal/database"
	"mlm-admin-backend/internal/handlers"
	"mlm-admin-backend/internal/middleware"
	"mlm-admin-backend/internal/repositories"
	"mlm-admin-backend/internal/services"
	"mlm-admin-backend/internal/utils"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

var (
	serverReady atomic.Bool
	fullRouter  http.Handler
)

// @title MLM Admin API
// @version 1.0.0
// @description Admin API for MLM management system
// @description
// @description This API provides endpoints for managing MLM operations including:
// @description - Admin authentication and authorization
// @description - Member management
// @description - Referral tree management
// @description - Income calculations and distributions
// @description - Reports and analytics
// @description - Audit logging
// @host localhost:8080
// @BasePath /api/v1
// @schemes http https
// @securityDefinitions.apikey Bearer
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token
func main() {
	fmt.Fprintf(os.Stderr, "MLM_ADMIN_BOOT: main() started\n")

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	fmt.Fprintf(os.Stderr, "MLM_ADMIN_BOOT: config loaded, port=%s env=%s\n", cfg.App.Port, cfg.App.Env)

	logger := utils.NewLogger(cfg.App.Env, cfg.Logging.Level, cfg.Logging.Format, cfg.Logging.Output)
	utils.InitGlobalLogger(cfg.App.Env, cfg.Logging.Level, cfg.Logging.Format, cfg.Logging.Output)

	logger.Info("Starting MLM Admin API", map[string]interface{}{
		"version": cfg.App.Version,
		"env":     cfg.App.Env,
		"port":    cfg.App.Port,
	})

	// Gateway handler: responds immediately even before DB is ready
	gateway := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if serverReady.Load() && fullRouter != nil {
			fullRouter.ServeHTTP(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		path := r.URL.Path
		if strings.HasPrefix(path, "/api/v1/health") || strings.HasPrefix(path, "/health") || strings.HasPrefix(path, "/ready") || strings.HasPrefix(path, "/live") {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"status":"starting","message":"Server is initializing"}`))
		} else {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte(`{"status":"not_ready","message":"Server is starting up, please retry in a few seconds"}`))
		}
	})

	srv := &http.Server{
		Addr:         ":" + cfg.App.Port,
		Handler:      gateway,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		logger.Info(fmt.Sprintf("Server listening on port %s", cfg.App.Port), nil)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal(err, "Failed to start server", nil)
		}
	}()

	// ---- initialize database (server is already running) ----
	{
		logger.Info("Waiting for database to be ready...", nil)
		if err := database.WaitForDatabase(&cfg.Database, 30*time.Second); err != nil {
			logger.Fatal(err, "Database not available", nil)
		}

		db, err := database.NewPostgresDB(&cfg.Database, logger)
		if err != nil {
			logger.Fatal(err, "Failed to connect to database", nil)
		}
		defer db.Close()

		logger.Info("Running database migrations", nil)
		if err := database.RunMigrations(&cfg.Database, "migrations"); err != nil {
			logger.Fatal(err, "Failed to run migrations", nil)
		}

		fullRouter = setupRouter(cfg, db, logger)
		serverReady.Store(true)
		logger.Info("Database initialized, server is ready", nil)
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...", nil)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal(err, "Server forced to shutdown", nil)
	}
	logger.Info("Server exited gracefully", nil)
}

// setupRouter configures the Gin router with all middleware and routes
func setupRouter(cfg *config.Config, db *database.PostgresDB, logger *utils.Logger) *gin.Engine {
	// Set Gin mode based on environment
	if cfg.App.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// Apply middleware
	r.Use(middleware.CORS(cfg.CORS))
	r.Use(middleware.SecureHeaders())
	r.Use(middleware.RequestLogger(logger))
	r.Use(middleware.RateLimiter(cfg.RateLimit))

	// Initialize repositories
	adminRepo := repositories.NewAdminRepository(db)
	memberRepo := repositories.NewMemberRepository(db)
	referralRepo := repositories.NewReferralRepository(db)
	incomeRepo := repositories.NewIncomeRepository(db)
	commissionRepo := repositories.NewCommissionRepository(db)

	// Initialize JWT manager
	jwtMgr := auth.NewJWTManager(&cfg.JWT)

	// Initialize services
	authService := services.NewAuthService(adminRepo, jwtMgr, cfg, logger)
	memberService := services.NewMemberService(memberRepo, cfg, logger)
	referralService := services.NewReferralService(referralRepo, cfg, logger)
	incomeService, err := services.NewIncomeService(incomeRepo, commissionRepo, memberRepo, referralRepo, cfg, logger)
	if err != nil {
		logger.Fatal(err, "Failed to initialize income service", nil)
	}

	// Initialize referral link system
	referralLinkRepo := repositories.NewReferralLinkRepository(db)
	referralLinkService := services.NewReferralLinkService(referralLinkRepo, cfg, logger)
	referralLinkHandler := handlers.NewReferralLinkHandler(referralLinkService, cfg, logger)

	// Initialize dashboard service
	dashboardService := services.NewDashboardService(db.DB, memberRepo, incomeRepo, referralRepo, cfg, logger)

	// Initialize handlers
	healthHandler := handlers.NewHealthHandler(cfg, db, logger)
	authHandler := handlers.NewAuthHandler(authService, cfg, logger)
	memberHandler := handlers.NewMemberHandler(memberService, cfg, logger)
	referralHandler := handlers.NewReferralHandler(referralService, cfg, logger)
	incomeHandler := handlers.NewIncomeHandler(incomeService, cfg, logger)
	dashboardHandler := handlers.NewDashboardHandler(dashboardService, cfg, logger)

	// Health routes (no authentication required)
	r.GET("/health", healthHandler.Health)
	r.GET("/health/ready", healthHandler.Ready)
	r.GET("/health/live", healthHandler.Live)

	// Swagger documentation - mounted at root level
	if cfg.Swagger.Enabled {
		// Serve swagger UI - doc.json is embedded in swaggerFiles automatically
		r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	}

	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		// Health endpoints
		v1.GET("/health", healthHandler.Health)

		// Public referral link routes (no auth required)
		v1.GET("/referral-link/:code/validate", referralLinkHandler.ValidateReferralCode)
		v1.POST("/referral-link/:code/register", referralLinkHandler.RegisterWithReferral)

		// Auth routes (public)
		authRoutes := v1.Group("/auth")
		{
			authRoutes.POST("/login", authHandler.Login)
			authRoutes.POST("/refresh", authHandler.RefreshToken)

			// Protected auth routes
			authProtected := authRoutes.Group("")
			authProtected.Use(middleware.Auth(&cfg.JWT))
			{
				authProtected.POST("/logout", authHandler.Logout)
				authProtected.GET("/me", authHandler.GetProfile)
				authProtected.POST("/change-password", authHandler.ChangePassword)
				authProtected.POST("/register", middleware.RequireRole("super_admin"), authHandler.Register)
			}
		}

		// Protected routes (require authentication)
		protected := v1.Group("")
		protected.Use(middleware.Auth(&cfg.JWT))
		{
			// Member routes
			memberRoutes := protected.Group("/members")
			{
				memberRoutes.GET("", memberHandler.ListMembers)
				memberRoutes.GET("/stats", memberHandler.GetMemberStats)
				memberRoutes.GET("/search", memberHandler.SearchMembers)
				memberRoutes.GET("/:id", memberHandler.GetMember)
				memberRoutes.POST("", memberHandler.CreateMember)
				memberRoutes.PUT("/:id", memberHandler.UpdateMember)
				memberRoutes.DELETE("/:id", memberHandler.DeleteMember)

				// Referral tree endpoints
				memberRoutes.GET("/:id/downline", memberHandler.GetDownline)
				memberRoutes.GET("/:id/upline", memberHandler.GetUpline)
			}

			// Referral routes (new)
			referralRoutes := protected.Group("/referrals")
			{
				referralRoutes.GET("/commission-config", referralHandler.GetCommissionConfig)
				referralRoutes.PUT("/commission-config/:level", referralHandler.UpdateCommissionConfig)
				referralRoutes.GET("/:id/downline", referralHandler.GetDownline)
				referralRoutes.GET("/:id/upline", referralHandler.GetUpline)
				referralRoutes.GET("/:id/summary", referralHandler.GetTreeSummary)
				referralRoutes.GET("/:id/income-projection", referralHandler.GetIncomeProjection)
				referralRoutes.GET("/projected-growth/:level", referralHandler.CalculateProjectedGrowth)
				referralRoutes.GET("/:id/stats", referralHandler.GetReferralStats)
			}

			// Income routes (Phase 5)
			incomeRoutes := protected.Group("/income")
			{
				incomeRoutes.POST("/calculate", incomeHandler.CalculateIncome)
				incomeRoutes.GET("/member/:member_id/history", incomeHandler.GetMemberIncomeHistory)
				incomeRoutes.GET("/member/:member_id/total", incomeHandler.GetMemberTotalIncome)
				incomeRoutes.GET("/member/:member_id/projection", incomeHandler.GetIncomeProjection)
				incomeRoutes.GET("/member/:member_id/snapshot/:level", incomeHandler.GetLevelSnapshotHistory)
				incomeRoutes.GET("/level/:level", incomeHandler.GetIncomeByLevel)
				incomeRoutes.POST("/:income_id/reverse", middleware.RequireRole("super_admin"), incomeHandler.ReverseIncome)
				incomeRoutes.GET("/statistics", incomeHandler.GetIncomeStatistics)
			}

			// Commission routes (Phase 5)
			commissionRoutes := protected.Group("/commission")
			{
				commissionRoutes.GET("/config", incomeHandler.GetCommissionConfig)
				commissionRoutes.PUT("/config/:level", middleware.RequireRole("super_admin"), incomeHandler.UpdateCommissionConfig)
			}

			// Dashboard routes (Phase 6)
			dashboardRoutes := protected.Group("/dashboard")
			{
				dashboardRoutes.GET("/overview", dashboardHandler.GetOverview)
				dashboardRoutes.GET("/members", dashboardHandler.GetMemberStats)
				dashboardRoutes.GET("/income", dashboardHandler.GetIncomeStats)
				dashboardRoutes.GET("/health", dashboardHandler.GetSystemHealth)
				dashboardRoutes.GET("/charts/income", dashboardHandler.GetIncomeChartData)
				dashboardRoutes.GET("/charts/growth", dashboardHandler.GetMemberGrowthChart)
				dashboardRoutes.GET("/levels", dashboardHandler.GetLevelDistribution)
				dashboardRoutes.GET("/top-earners", dashboardHandler.GetTopEarners)
				dashboardRoutes.GET("/activity", dashboardHandler.GetRecentActivity)
				dashboardRoutes.GET("/alerts", dashboardHandler.GetSystemAlerts)
			}

			// Referral link admin routes
			referralLinkAdmin := protected.Group("/admin")
			{
				referralLinkAdmin.POST("/referral", referralLinkHandler.CreateReferralCode)
				referralLinkAdmin.GET("/referral-codes", referralLinkHandler.ListReferralCodes)
				referralLinkAdmin.GET("/referral-codes/search", referralLinkHandler.SearchByCreator)
				referralLinkAdmin.GET("/referral/:code/registrations", referralLinkHandler.GetRegistrations)
			}
		}
	}

	return r
}
