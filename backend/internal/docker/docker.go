package docker

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"3proxy/backend/internal/config"
	"3proxy/backend/internal/logger"
)

// DockerService manages 3proxy Docker container interactions using Docker CLI
type DockerService struct {
	config *config.Config
	logger *logger.Logger
}

// NewDockerService creates a new Docker service
func NewDockerService(cfg *config.Config, log *logger.Logger) (*DockerService, error) {
	// Check if docker is available
	if _, err := exec.LookPath("docker"); err != nil {
		log.Warn("docker command not found, container management will be unavailable")
		return &DockerService{config: cfg, logger: log}, nil
	}

	return &DockerService{
		config: cfg,
		logger: log,
	}, nil
}

// ContainerInfo holds container information
type ContainerInfo struct {
	ID   string
	Name string
}

// Find3proxyContainer finds the 3proxy container using name resolution order
func (s *DockerService) Find3proxyContainer(ctx context.Context) (*ContainerInfo, error) {
	candidates := s.containerNameCandidates()

	for _, name := range candidates {
		cmd := exec.CommandContext(ctx, "docker", "ps", "--filter", fmt.Sprintf("name=^%s$", name), "--format", "{{.ID}}\t{{.Names}}")
		output, err := cmd.Output()
		if err != nil {
			s.logger.Debug("docker container list failed", map[string]interface{}{
				"name":  name,
				"error": err.Error(),
			})
			continue
		}

		lines := strings.Split(strings.TrimSpace(string(output)), "\n")
		if len(lines) > 0 && lines[0] != "" {
			parts := strings.Split(lines[0], "\t")
			if len(parts) >= 2 {
				return &ContainerInfo{
					ID:   parts[0],
					Name: strings.TrimPrefix(parts[1], "/"),
				}, nil
			}
		}
	}

	return nil, nil
}

// containerNameCandidates returns container name candidates in priority order
func (s *DockerService) containerNameCandidates() []string {
	var candidates []string
	if s.config.ProxyContainerName != "" {
		candidates = append(candidates, s.config.ProxyContainerName)
	}
	candidates = append(candidates, "3proxy", "vpn-3proxy")
	return candidates
}

// RestartContainer restarts the 3proxy container
func (s *DockerService) RestartContainer(ctx context.Context) error {
	info, err := s.Find3proxyContainer(ctx)
	if err != nil {
		return err
	}
	if info == nil {
		s.logger.Info("no 3proxy container found, skipping restart")
		return nil
	}

	timeout := 60 * time.Second
	cmd := exec.CommandContext(ctx, "docker", "restart", "--time", fmt.Sprintf("%d", int(timeout.Seconds())), info.ID)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to restart container %s: %w, output: %s", info.ID, err, string(output))
	}

	s.logger.Info("restarted 3proxy container", map[string]interface{}{
		"container_id":   info.ID,
		"container_name": info.Name,
		"output":         string(output),
	})
	return nil
}

// ReloadContainer sends SIGHUP to 3proxy container to reload config
// If that fails, it restarts the container
func (s *DockerService) ReloadContainer() error {
	ctx := context.Background()

	info, err := s.Find3proxyContainer(ctx)
	if err != nil {
		return err
	}
	if info == nil {
		s.logger.Info("no 3proxy container found, config file updated only")
		return nil
	}

	// Try to send SIGHUP first (graceful reload)
	cmd := exec.CommandContext(ctx, "docker", "kill", "--signal=SIGHUP", info.ID)
	output, err := cmd.CombinedOutput()
	if err != nil {
		s.logger.Warn("SIGHUP failed, falling back to restart", map[string]interface{}{
			"container_id": info.ID,
			"error":        err.Error(),
			"output":       string(output),
		})
		return s.RestartContainer(ctx)
	}

	s.logger.Info("sent SIGHUP to 3proxy container for config reload", map[string]interface{}{
		"container_id": info.ID,
		"output":       string(output),
	})
	return nil
}

// Close closes the Docker service (no-op for CLI-based implementation)
func (s *DockerService) Close() error {
	return nil
}
