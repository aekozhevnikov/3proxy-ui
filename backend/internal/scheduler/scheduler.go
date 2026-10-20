package scheduler

import (
	"context"
	"sync"
	"time"

	"3proxy/backend/internal/logger"
	"3proxy/backend/internal/service"
)

// Scheduler runs the maintenance job periodically
type Scheduler struct {
	maintenanceSvc *service.MaintenanceService
	interval       time.Duration
	logger         *logger.Logger
	mu             sync.Mutex
	running        bool
	stopCh         chan struct{}
	wg             sync.WaitGroup
}

// NewScheduler creates a new scheduler
func NewScheduler(
	maintenanceSvc *service.MaintenanceService,
	interval time.Duration,
	log *logger.Logger,
) *Scheduler {
	return &Scheduler{
		maintenanceSvc: maintenanceSvc,
		interval:       interval,
		logger:         log,
		stopCh:         make(chan struct{}),
	}
}

// Start begins the scheduler
func (s *Scheduler) Start(ctx context.Context) {
	s.mu.Lock()
	if s.running {
		s.mu.Unlock()
		return
	}
	s.running = true
	s.mu.Unlock()

	s.wg.Add(1)
	go s.run(ctx)

	s.logger.Info("maintenance scheduler started", map[string]interface{}{
		"interval": s.interval.String(),
	})
}

// Stop stops the scheduler gracefully
func (s *Scheduler) Stop() {
	s.mu.Lock()
	if !s.running {
		s.mu.Unlock()
		return
	}
	s.running = false
	close(s.stopCh)
	s.mu.Unlock()

	s.wg.Wait()
	s.logger.Info("maintenance scheduler stopped")
}

func (s *Scheduler) run(ctx context.Context) {
	defer s.wg.Done()

	// Run immediately on start
	s.runMaintenance()

	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-s.stopCh:
			return
		case <-ticker.C:
			s.runMaintenance()
		}
	}
}

func (s *Scheduler) runMaintenance() {
	// Non-blocking: if maintenance is already running, skip this tick
	if s.maintenanceSvc.IsRunning() {
		s.logger.Debug("maintenance already running, skipping this tick")
		return
	}

	result, err := s.maintenanceSvc.RunMaintenance()
	if err != nil {
		if err == service.ErrMaintenanceRunning {
			s.logger.Debug("maintenance already running")
			return
		}
		s.logger.Error("maintenance failed", map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	s.logger.Info("scheduled maintenance completed", map[string]interface{}{
		"updated":     result.UpdatedCount,
		"deactivated": result.DeactivatedCount,
		"traffic":     result.TotalTraffic,
		"source":      result.SourceFile,
	})
}

// IsRunning returns whether the scheduler is running
func (s *Scheduler) IsRunning() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.running
}
