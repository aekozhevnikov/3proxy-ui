package parser

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"

	"3proxy/backend/internal/logger"
)

// SyncState represents the traffic sync state
type SyncState struct {
	LastSync         string           `json:"last_sync,omitempty"`
	UpdatedCount     int              `json:"updated_count,omitempty"`
	DeactivatedCount int              `json:"deactivated_count,omitempty"`
	TotalTraffic     int64            `json:"total_traffic,omitempty"`
	SourceFile       string           `json:"source_file,omitempty"`
	Offsets          map[string]int64 `json:"offsets,omitempty"`
	Existed          bool             `json:"existed"`
}

// TrafficSyncService manages incremental log reading with offsets
type TrafficSyncService struct {
	syncFile string
	logger   *logger.Logger
	mu       sync.Mutex
}

// NewTrafficSyncService creates a new traffic sync service
func NewTrafficSyncService(syncFile string, log *logger.Logger) *TrafficSyncService {
	return &TrafficSyncService{
		syncFile: syncFile,
		logger:   log,
	}
}

// ReadSyncState reads the sync state from file
func (s *TrafficSyncService) ReadSyncState() (*SyncState, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	content, err := os.ReadFile(s.syncFile)
	if err != nil {
		if os.IsNotExist(err) {
			return &SyncState{Offsets: nil, Existed: false}, nil
		}
		return nil, err
	}

	var state SyncState
	if err := json.Unmarshal(content, &state); err != nil {
		// Corrupt file - assume nothing was accounted for
		return &SyncState{Offsets: nil, Existed: true}, nil
	}

	if state.Offsets == nil {
		state.Offsets = make(map[string]int64)
	}
	state.Existed = true

	return &state, nil
}

// WriteSyncState writes the sync state to file
func (s *TrafficSyncService) WriteSyncState(state *SyncState) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Ensure directory exists
	if err := os.MkdirAll(filepath.Dir(s.syncFile), 0755); err != nil {
		s.logger.Error("failed to create sync info directory", map[string]interface{}{
			"error": err.Error(),
		})
		return err
	}

	data, err := json.Marshal(state)
	if err != nil {
		return err
	}

	// Atomic write
	tempFile := s.syncFile + ".tmp"
	if err := os.WriteFile(tempFile, data, 0644); err != nil {
		return err
	}

	return os.Rename(tempFile, s.syncFile)
}

// SeedOffsets initializes offsets for all log files (used on first run or upgrade)
func (s *TrafficSyncService) SeedOffsets(files []*LogFileIdentity) map[string]int64 {
	offsets := make(map[string]int64)
	for _, file := range files {
		offsets[file.Key] = file.Size
	}
	return offsets
}
