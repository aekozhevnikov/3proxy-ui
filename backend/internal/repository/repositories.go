package repository

import (
	"gorm.io/gorm"
)

// UserRepository defines the interface for user operations
type UserRepository interface {
	GetByUsername(username string) (*User, error)
	GetByID(id uint) (*User, error)
	Create(user *User) error
	Update(user *User) error
	BumpSessionVersion(userID uint) error
}

// UserRepositoryImpl implements UserRepository using GORM
type UserRepositoryImpl struct{}

func NewUserRepository() UserRepository {
	return &UserRepositoryImpl{}
}

func (r *UserRepositoryImpl) GetByUsername(username string) (*User, error) {
	var user User
	err := DB.Where("username = ?", username).First(&user).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &user, err
}

func (r *UserRepositoryImpl) GetByID(id uint) (*User, error) {
	var user User
	err := DB.First(&user, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &user, err
}

func (r *UserRepositoryImpl) Create(user *User) error {
	return DB.Create(user).Error
}

func (r *UserRepositoryImpl) Update(user *User) error {
	return DB.Save(user).Error
}

func (r *UserRepositoryImpl) BumpSessionVersion(userID uint) error {
	return DB.Model(&User{}).Where("id = ?", userID).Update("session_version", gorm.Expr("session_version + 1")).Error
}

// ProxyUserRepository defines the interface for proxy user operations
type ProxyUserRepository interface {
	List(page, pageSize int, filters map[string]interface{}) ([]*ProxyUser, int64, error)
	GetByID(id uint) (*ProxyUser, error)
	GetByUsername(username string) (*ProxyUser, error)
	Create(user *ProxyUser) error
	Update(user *ProxyUser) error
	Delete(id uint) error
	IncrementDataUsed(username string, bytes int64) error
	CountActive() (int64, error)
	GetAllActive() ([]*ProxyUser, error)
}

// ProxyUserRepositoryImpl implements ProxyUserRepository using GORM
type ProxyUserRepositoryImpl struct{}

func NewProxyUserRepository() ProxyUserRepository {
	return &ProxyUserRepositoryImpl{}
}

func (r *ProxyUserRepositoryImpl) List(page, pageSize int, filters map[string]interface{}) ([]*ProxyUser, int64, error) {
	var users []*ProxyUser
	var total int64

	query := DB.Model(&ProxyUser{})

	// Apply filters
	if username, ok := filters["username"].(string); ok && username != "" {
		query = query.Where("username LIKE ?", "%"+username+"%")
	}
	if isActive, ok := filters["isActive"].(bool); ok {
		query = query.Where("is_active = ?", isActive)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination
	offset := (page - 1) * pageSize
	if err := query.Order("username ASC").Offset(offset).Limit(pageSize).Find(&users).Error; err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

func (r *ProxyUserRepositoryImpl) GetByID(id uint) (*ProxyUser, error) {
	var user ProxyUser
	err := DB.First(&user, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &user, err
}

func (r *ProxyUserRepositoryImpl) GetByUsername(username string) (*ProxyUser, error) {
	var user ProxyUser
	err := DB.Where("username = ?", username).First(&user).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &user, err
}

func (r *ProxyUserRepositoryImpl) Create(user *ProxyUser) error {
	return DB.Create(user).Error
}

func (r *ProxyUserRepositoryImpl) Update(user *ProxyUser) error {
	return DB.Save(user).Error
}

func (r *ProxyUserRepositoryImpl) Delete(id uint) error {
	return DB.Delete(&ProxyUser{}, id).Error
}

func (r *ProxyUserRepositoryImpl) IncrementDataUsed(username string, bytes int64) error {
	return DB.Model(&ProxyUser{}).Where("username = ?", username).
		Update("data_used", gorm.Expr("data_used + ?", bytes)).Error
}

func (r *ProxyUserRepositoryImpl) CountActive() (int64, error) {
	var count int64
	err := DB.Model(&ProxyUser{}).Where("is_active = ?", true).Count(&count).Error
	return count, err
}

func (r *ProxyUserRepositoryImpl) GetAllActive() ([]*ProxyUser, error) {
	var users []*ProxyUser
	err := DB.Where("is_active = ?", true).Order("username ASC").Find(&users).Error
	return users, err
}

// ConfigRepository defines the interface for config operations
type ConfigRepository interface {
	GetLatest() (*ConfigVersion, error)
	Save(config string) error
}

// ConfigRepositoryImpl implements ConfigRepository
type ConfigRepositoryImpl struct{}

func NewConfigRepository() ConfigRepository {
	return &ConfigRepositoryImpl{}
}

func (r *ConfigRepositoryImpl) GetLatest() (*ConfigVersion, error) {
	var config ConfigVersion
	err := DB.Order("version DESC").First(&config).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &config, err
}

func (r *ConfigRepositoryImpl) Save(config string) error {
	return DB.Create(&ConfigVersion{Config: config}).Error
}
