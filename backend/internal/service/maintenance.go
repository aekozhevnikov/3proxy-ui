package service

import (
	"errors"
	"sync"
	"time"

	"3proxy/backend/internal/config"
	"3proxy/backend/internal/docker"
	"3proxy/backend/internal/logger"
	"3proxy/backend/internal/parser"
	"3proxy/backend/internal/repository"
)

var (
	ErrMaintenanceRunning = errors.New("maintenance already running")
)

// MaintenanceService handles the maintenance job
type MaintenanceService struct {
	proxyUserRepo repository.ProxyUserRepository
	parserService *parser.LogParserService
	trafficSync   *parser.TrafficSyncService
	dockerService *docker.DockerService
	proxyUserSvc  *ProxyUserService
	config        *config.Config
	logger        *logger.Logger
	mu            sync.Mutex
	running       bool
}

// NewMaintenanceService creates a new maintenance service
func NewMaintenanceService(
	proxyUserRepo repository.ProxyUserRepository,
	parserService *parser.LogParserService,
	trafficSync *parser.TrafficSyncService,
	dockerService *docker.DockerService,
	proxyUserSvc *ProxyUserService,
	cfg *config.Config,
	log *logger.Logger,
) *MaintenanceService {
	return &MaintenanceService{
		proxyUserRepo: proxyUserRepo,
		parserService: parserService,
		trafficSync:   trafficSync,
		dockerService: dockerService,
		proxyUserSvc:  proxyUserSvc,
		config:        cfg,
		logger:        log,
	}
}

// MaintenanceResult represents the result of a maintenance run
type MaintenanceResult struct {
	UpdatedCount     int
	DeactivatedCount int
	TotalTraffic     int64
	SourceFile       string
}

// RunMaintenance executes the maintenance job atomically
func (s *MaintenanceService) RunMaintenance() (*MaintenanceResult, error) {
	// Non-blocking lock - if maintenance is already running, return error
	if !s.mu.TryLock() {
		return nil, ErrMaintenanceRunning
	}
	defer s.mu.Unlock()

	s.running = true
	defer func() { s.running = false }()

	now := time.Now()
	result := &MaintenanceResult{
		SourceFile: "no logs",
	}

	// Read sync state
	state, err := s.trafficSync.ReadSyncState()
	if err != nil {
		s.logger.Error("failed to read sync state", map[string]interface{}{"error": err.Error()})
		state = &parser.SyncState{Offsets: make(map[string]int64), Existed: false}
	}

	// Get log files
	logFiles, err := s.parserService.GetLogFiles()
	if err != nil {
		s.logger.Error("failed to get log files", map[string]interface{}{"error": err.Error()})
	} else if len(logFiles) > 0 {
		// Identify log files
		var identities []*parser.LogFileIdentity
		for _, name := range logFiles {
			filePath := s.parserService.GetLogFilePath(name)
			identity, err := s.parserService.IdentifyLogFile(filePath)
			if err != nil {
				s.logger.Warn("failed to identify log file", map[string]interface{}{
					"file":  name,
					"error": err.Error(),
				})
				continue
			}
			identities = append(identities, identity)
		}

		if len(identities) > 0 {
			// Initialize offsets if needed (upgrade from previous version)
			offsets := state.Offsets
			if offsets == nil {
				if state.Existed {
					// Upgrade: state file existed but no offsets - history already accounted for
					offsets = s.trafficSync.SeedOffsets(identities)
				} else {
					// Clean start: read from zero
					offsets = make(map[string]int64)
				}
			}

			var contributor string

			// Process each log file
			for _, file := range identities {
				storedOffset := offsets[file.Key]
				if storedOffset == 0 && !state.Existed {
					storedOffset = 0
				}

				// Read new content
				newContent, err := s.parserService.ReadNewLogContent(
					s.parserService.GetLogFilePath(file.Key),
					storedOffset,
					file.Size,
				)
				if err != nil {
					s.logger.Warn("failed to read new log content", map[string]interface{}{
						"file":  file.Key,
						"error": err.Error(),
					})
					continue
				}

				offsets[file.Key] = newContent.NextOffset

				if len(newContent.Lines) == 0 {
					continue
				}

				// Parse and aggregate traffic
				trafficMap, totalTraffic := s.parserService.ParseTrafficLogs(newContent.Lines)

				if totalTraffic > 0 {
					contributor = file.Key
				}

				// Update user data usage in database
				for username, stats := range trafficMap {
					// Find user by username
					user, err := s.proxyUserRepo.GetByUsername(username)
					if err != nil || user == nil {
						// Try with IP as username (text format logs)
						continue
					}

					totalUsed := stats.BytesSent + stats.BytesRecv
					newDataUsed := user.DataUsed + totalUsed

					// Check if should deactivate due to data limit
					shouldDeactivate := user.DataLimit != nil &&
						newDataUsed >= int64(*user.DataLimit)*1024*1024 &&
						user.IsActive

					// Update data usage
					if err := s.proxyUserRepo.IncrementDataUsed(username, totalUsed); err != nil {
						s.logger.Error("failed to increment data usage", map[string]interface{}{
							"username": username,
							"error":    err.Error(),
						})
						continue
					}

					result.UpdatedCount++
					result.TotalTraffic += totalUsed

					// Deactivate if limit exceeded
					if shouldDeactivate {
						nowTime := time.Now()
						user.IsActive = false
						user.DeactivatedAt = &nowTime
						if err := s.proxyUserRepo.Update(user); err != nil {
							s.logger.Error("failed to deactivate user", map[string]interface{}{
								"username": username,
								"error":    err.Error(),
							})
							continue
						}

						result.DeactivatedCount++

						// Send Telegram notification
						if user.TelegramUserID != "" && s.config.TelegramBotToken != "" {
							if err := s.sendTelegramNotification(user, newDataUsed, *user.DataLimit, "data limit exceeded"); err != nil {
								s.logger.Error("failed to send telegram notification", map[string]interface{}{
									"username": username,
									"error":    err.Error(),
								})
							}
						}

						s.logger.Debug("user deactivated due to data limit", map[string]interface{}{
							"username": username,
							"used_mb":  newDataUsed / 1024 / 1024,
							"limit_mb": *user.DataLimit,
						})
					}
				}

				s.logger.Debug("traffic sync", map[string]interface{}{
					"file":          file.Key,
					"users_updated": len(trafficMap),
					"total_traffic": totalTraffic,
				})
			}

			result.SourceFile = contributor
			if result.SourceFile == "" && len(identities) > 0 {
				result.SourceFile = identities[0].Key
			}
		}
	}

	// Process expiration
	expiredCount, err := s.processExpiration(now)
	if err != nil {
		s.logger.Error("failed to process expiration", map[string]interface{}{"error": err.Error()})
	}
	result.DeactivatedCount += expiredCount

	// Regenerate .proxyauth and reload 3proxy
	if err := s.proxyUserSvc.RegenerateProxyAuthAndReload(); err != nil {
		s.logger.Error("failed to regenerate proxyauth", map[string]interface{}{"error": err.Error()})
	}

	// Update sync state
	state.Offsets = state.Offsets // Already updated above
	state.LastSync = now.Format(time.RFC3339)
	state.UpdatedCount = result.UpdatedCount
	state.DeactivatedCount = result.DeactivatedCount
	state.TotalTraffic = result.TotalTraffic
	state.SourceFile = result.SourceFile

	if err := s.trafficSync.WriteSyncState(state); err != nil {
		s.logger.Error("failed to write sync state", map[string]interface{}{"error": err.Error()})
	}

	s.logger.Info("maintenance completed", map[string]interface{}{
		"updated":     result.UpdatedCount,
		"deactivated": result.DeactivatedCount,
		"traffic":     result.TotalTraffic,
		"source":      result.SourceFile,
	})

	return result, nil
}

// processExpiration deactivates users past their expiration date
func (s *MaintenanceService) processExpiration(now time.Time) (int, error) {
	// Get all active users
	users, err := s.proxyUserRepo.GetAllActive()
	if err != nil {
		return 0, err
	}

	deactivatedCount := 0
	for _, user := range users {
		if user.ExpiresAt != nil && user.ExpiresAt.Before(now) {
			user.IsActive = false
			user.DeactivatedAt = &now
			if err := s.proxyUserRepo.Update(user); err != nil {
				s.logger.Error("failed to deactivate expired user", map[string]interface{}{
					"username": user.Username,
					"error":    err.Error(),
				})
				continue
			}

			deactivatedCount++

			// Send Telegram notification
			if user.TelegramUserID != "" && s.config.TelegramBotToken != "" {
				if err := s.sendTelegramNotification(user, user.DataUsed, 0, "subscription expired"); err != nil {
					s.logger.Error("failed to send telegram notification for expiry", map[string]interface{}{
						"username": user.Username,
						"error":    err.Error(),
					})
				}
			}

			s.logger.Debug("user deactivated due to expiration", map[string]interface{}{
				"username":   user.Username,
				"expired_at": user.ExpiresAt,
			})
		}
	}

	if deactivatedCount > 0 {
		s.logger.Debug("deactivated users due to expiration", map[string]interface{}{
			"count": deactivatedCount,
		})
	}

	return deactivatedCount, nil
}

// sendTelegramNotification sends a deactivation notification via Telegram
func (s *MaintenanceService) sendTelegramNotification(user *repository.ProxyUser, dataUsed int64, dataLimit int64, reason string) error {
	// This would make an HTTP request to Telegram API
	// For now, just log it
	s.logger.Info("telegram notification", map[string]interface{}{
		"telegram_user_id": user.TelegramUserID,
		"username":         user.Username,
		"data_used_mb":     dataUsed / 1024 / 1024,
		"data_limit_mb":    dataLimit / 1024 / 1024,
		"reason":           reason,
	})
	return nil
}

// IsRunning returns whether maintenance is currently running
func (s *MaintenanceService) IsRunning() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.running
}
