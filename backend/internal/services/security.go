package services

import (
    "crypto/rand"
    "encoding/hex"
    "fmt"
    "time"

    "golang.org/x/crypto/bcrypt"
)

type SecurityService struct{}

func NewSecurityService() *SecurityService {
    return &SecurityService{}
}

func (s *SecurityService) HashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    return string(bytes), err
}

func (s *SecurityService) CheckPassword(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}

func (s *SecurityService) GenerateOTP() string {
    // Generate 6-digit OTP
    bytes := make([]byte, 3)
    rand.Read(bytes)
    
    // Convert to 6-digit number
    num := int(bytes[0])<<16 + int(bytes[1])<<8 + int(bytes[2])
    otp := num % 1000000
    
    return fmt.Sprintf("%06d", otp)
}

func (s *SecurityService) GenerateSecureToken() string {
    bytes := make([]byte, 32)
    rand.Read(bytes)
    return hex.EncodeToString(bytes)
}

func (s *SecurityService) IsOTPExpired(createdAt time.Time) bool {
    return time.Since(createdAt) > 15*time.Minute // 15 minutes expiry
}