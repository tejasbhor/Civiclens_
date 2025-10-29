"""
Session Management Model
Tracks active user sessions for security and device management
"""

from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.models.base import BaseModel
from datetime import datetime


class Session(BaseModel):
    """Track active user sessions"""
    __tablename__ = "sessions"
    
    # User reference
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Token identification
    jti = Column(String(255), unique=True, nullable=False, index=True)  # JWT ID
    refresh_token_jti = Column(String(255), unique=True, nullable=True, index=True)  # Refresh token ID
    
    # Device information
    device_info = Column(JSONB, nullable=True)  # {device_type, os, browser, etc.}
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    user_agent = Column(Text, nullable=True)
    
    # Session tracking
    last_activity = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Session metadata
    login_method = Column(String(50), default="password")  # password, otp, sso
    is_active = Column(Integer, default=1)  # 1=active, 0=logged out
    
    # Session fingerprinting (Priority 2)
    fingerprint = Column(String(64), nullable=True)  # SHA256 hash of session characteristics
    
    # Relationships
    user = relationship("User", back_populates="sessions")
    
    def __repr__(self):
        return f"<Session(user_id={self.user_id}, jti={self.jti[:8]}..., active={self.is_active})>"
    
    def is_expired(self) -> bool:
        """Check if session has expired"""
        return datetime.utcnow() > self.expires_at
    
    def to_dict(self) -> dict:
        """Convert session to dictionary for API response"""
        return {
            "id": self.id,
            "device_info": self.device_info,
            "ip_address": self.ip_address,
            "last_activity": self.last_activity.isoformat() if self.last_activity else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "is_active": bool(self.is_active),
            "login_method": self.login_method
        }
