package service

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"3proxy/backend/internal/config"
	"3proxy/backend/internal/docker"
	"3proxy/backend/internal/logger"
	"3proxy/backend/internal/repository"
)

// SystemService provides system status information
type SystemService struct {
	dockerService *docker.DockerService
	proxyUserRepo repository.ProxyUserRepository
	config        *config.Config
	logger        *logger.Logger
	startTime     time.Time
}

// NewSystemService creates a new system service
func NewSystemService(
	dockerService *docker.DockerService,
	proxyUserRepo repository.ProxyUserRepository,
	cfg *config.Config,
	log *logger.Logger,
) *SystemService {
	return &SystemService{
		dockerService: dockerService,
		proxyUserRepo: proxyUserRepo,
		config:        cfg,
		logger:        log,
		startTime:     time.Now(),
	}
}

// SystemStatus represents the system status response
type SystemStatus struct {
	Status struct {
		IsRunning   bool   `json:"isRunning"`
		Version     string `json:"version"`
		MemoryUsage int64  `json:"memoryUsage,omitempty"`
		PID         int    `json:"pid,omitempty"`
	} `json:"status"`
	Config struct {
		Exists   bool   `json:"exists"`
		Modified string `json:"modified,omitempty"`
		Path     string `json:"path"`
	} `json:"config"`
	Users struct {
		Count         int    `json:"count"`
		ProxyAuthSize int64  `json:"proxyauthSize"`
		ProxyAuthMod  string `json:"proxyauthModified,omitempty"`
	} `json:"users"`
	Proxy struct {
		Host       string `json:"host"`
		SOCKS5Port int    `json:"socks5Port"`
		HTTPPort   int    `json:"httpPort"`
	} `json:"proxy"`
	Logs struct {
		Size      int64  `json:"size"`
		FileCount int    `json:"fileCount"`
		Path      string `json:"path"`
	} `json:"logs"`
	Timestamp   string           `json:"timestamp"`
	TrafficSync *TrafficSyncInfo `json:"trafficSync,omitempty"`
}

// TrafficSyncInfo represents traffic sync information
type TrafficSyncInfo struct {
	LastSync     string `json:"lastSync"`
	UpdatedCount int    `json:"updatedCount"`
}

// GetSystemStatus returns the current system status
func (s *SystemService) GetSystemStatus() (*SystemStatus, error) {
	status := &SystemStatus{}
	status.Timestamp = time.Now().Format(time.RFC3339)

	// Check 3proxy status
	isRunning := false
	var pid int
	var containerInfo *docker.ContainerInfo
	var version string

	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	containerInfo, _ = s.dockerService.Find3proxyContainer(ctx)

	if containerInfo != nil {
		// Container found - assume running if found
		isRunning = true
		version = s.get3proxyVersion(containerInfo)
	} else {
		// Check local process
		// In container environment, 3proxy runs in container
		isRunning = false
		version = "Not found"
	}

	status.Status.IsRunning = isRunning
	status.Status.Version = version
	status.Status.PID = pid

	// Memory usage (from container if available)
	if containerInfo != nil && isRunning {
		// Would need docker stats - skipping for now
	}

	// Config file info
	configPath := filepath.Join(s.config.LogsDir, "..", "3proxy.cfg")
	if info, err := os.Stat(configPath); err == nil {
		status.Config.Exists = true
		status.Config.Modified = info.ModTime().Format(time.RFC3339)
	}
	status.Config.Path = configPath

	// User count from database
	count, _ := s.proxyUserRepo.CountActive()
	status.Users.Count = int(count)

	// .proxyauth file info
	if info, err := os.Stat(s.config.ProxyAuthPath); err == nil {
		status.Users.ProxyAuthSize = info.Size()
		status.Users.ProxyAuthMod = info.ModTime().Format(time.RFC3339)
	}

	// Proxy config
	status.Proxy.Host = "127.0.0.1"
	status.Proxy.SOCKS5Port = parsePort(s.config.SOCKSPort)
	status.Proxy.HTTPPort = parsePort(s.config.HTTPPort)

	// Logs directory stats
	logSize, logCount := s.getDirectoryStats(s.config.LogsDir)
	status.Logs.Size = logSize
	status.Logs.FileCount = logCount
	status.Logs.Path = s.config.LogsDir

	// Traffic sync info
	if content, err := os.ReadFile(s.config.SyncInfoFile); err == nil {
		var syncInfo struct {
			LastSync     string `json:"last_sync"`
			UpdatedCount int    `json:"updated_count"`
		}
		if json.Unmarshal(content, &syncInfo) == nil {
			status.TrafficSync = &TrafficSyncInfo{
				LastSync:     syncInfo.LastSync,
				UpdatedCount: syncInfo.UpdatedCount,
			}
		}
	}

	return status, nil
}

// GetHealth returns health check response
func (s *SystemService) GetHealth() map[string]interface{} {
	return map[string]interface{}{
		"status":    "ok",
		"timestamp": time.Now().Format(time.RFC3339),
		"uptime":    time.Since(s.startTime).Seconds(),
	}
}

// getDirectoryStats calculates total size and file count of a directory
func (s *SystemService) getDirectoryStats(dirPath string) (int64, int) {
	var totalSize int64
	var fileCount int

	filepath.WalkDir(dirPath, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() {
			return nil
		}
		info, err := d.Info()
		if err != nil {
			return nil
		}
		totalSize += info.Size()
		fileCount++
		return nil
	})

	return totalSize, fileCount
}

func (s *SystemService) get3proxyVersion(containerInfo *docker.ContainerInfo) string {
	if containerInfo == nil {
		return "Not found"
	}

	// Try to get version from container
	_, _ = context.WithTimeout(context.Background(), 5*time.Second)
	// This would exec 3proxy -v in container
	// For now, return a placeholder
	return "3proxy (container)"
}

func parsePort(portStr string) int {
	var port int
	fmt.Sscanf(portStr, "%d", &port)
	return port
}
