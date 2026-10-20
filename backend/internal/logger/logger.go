package logger

import (
	"encoding/json"
	"os"
	"time"
)

// Level represents log level
type Level int

const (
	DebugLevel Level = iota
	InfoLevel
	WarnLevel
	ErrorLevel
)

// Logger provides structured JSON logging
type Logger struct {
	level Level
}

type logEntry struct {
	Level   string                 `json:"level"`
	Time    string                 `json:"timestamp"`
	Message string                 `json:"message"`
	Fields  map[string]interface{} `json:"fields,omitempty"`
}

// New creates a new logger
func New(level Level) *Logger {
	return &Logger{level: level}
}

// Debug logs at debug level
func (l *Logger) Debug(message string, fields ...map[string]interface{}) {
	l.log(DebugLevel, message, fields...)
}

// Info logs at info level
func (l *Logger) Info(message string, fields ...map[string]interface{}) {
	l.log(InfoLevel, message, fields...)
}

// Warn logs at warn level
func (l *Logger) Warn(message string, fields ...map[string]interface{}) {
	l.log(WarnLevel, message, fields...)
}

// Error logs at error level
func (l *Logger) Error(message string, fields ...map[string]interface{}) {
	l.log(ErrorLevel, message, fields...)
}

func (l *Logger) log(level Level, message string, fields ...map[string]interface{}) {
	if level < l.level {
		return
	}

	var levelStr string
	switch level {
	case DebugLevel:
		levelStr = "debug"
	case InfoLevel:
		levelStr = "info"
	case WarnLevel:
		levelStr = "warn"
	case ErrorLevel:
		levelStr = "error"
	}

	entry := logEntry{
		Level:   levelStr,
		Time:    time.Now().UTC().Format(time.RFC3339),
		Message: message,
	}

	if len(fields) > 0 && fields[0] != nil {
		entry.Fields = fields[0]
	}

	data, _ := json.Marshal(entry)
	os.Stdout.Write(append(data, '\n'))
}
