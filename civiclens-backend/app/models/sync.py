"""
Sync Models for Offline-First Mobile App Support
Tracks client sync state, conflicts, and offline actions
"""

from sqlalchemy import Column, String, Integer, ForeignKey, Boolean, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.models.base import BaseModel
from datetime import datetime


class ClientSyncState(BaseModel):
    """Track sync state for each client device"""
    __tablename__ = "client_sync_state"
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    device_id = Column(String(255), nullable=False, index=True)
    
    # Sync timestamps
    last_sync_timestamp = Column(DateTime(timezone=True), nullable=True)
    last_upload_timestamp = Column(DateTime(timezone=True), nullable=True)
    last_download_timestamp = Column(DateTime(timezone=True), nullable=True)
    
    # Sync version for conflict detection
    sync_version = Column(Integer, default=1, nullable=False)
    
    # Device information
    device_info = Column(JSONB, nullable=True)  # {platform, os_version, app_version, etc.}
    
    # Relationships
    user = relationship("User", back_populates="sync_states")
    
    def __repr__(self):
        return f"<ClientSyncState(user_id={self.user_id}, device_id={self.device_id})>"
    
    def to_dict(self) -> dict:
        return {
            "device_id": self.device_id,
            "last_sync": self.last_sync_timestamp.isoformat() if self.last_sync_timestamp else None,
            "sync_version": self.sync_version,
            "device_info": self.device_info
        }


class SyncConflict(BaseModel):
    """Track sync conflicts for resolution"""
    __tablename__ = "sync_conflicts"
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    device_id = Column(String(255), nullable=False)
    
    # Entity information
    entity_type = Column(String(50), nullable=False)  # report, profile, task, etc.
    entity_id = Column(Integer, nullable=False)
    
    # Conflict data
    client_version = Column(JSONB, nullable=False)  # Client's version of data
    server_version = Column(JSONB, nullable=False)  # Server's version of data
    
    # Resolution
    resolution_strategy = Column(String(50), nullable=True)  # server_wins, client_wins, merge, manual
    resolved = Column(Boolean, default=False, nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_data = Column(JSONB, nullable=True)  # Final resolved data
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<SyncConflict(entity={self.entity_type}:{self.entity_id}, resolved={self.resolved})>"


class OfflineAction(BaseModel):
    """Log of offline actions for processing"""
    __tablename__ = "offline_actions_log"
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    device_id = Column(String(255), nullable=False, index=True)
    
    # Action details
    action_type = Column(String(50), nullable=False)  # create_report, update_profile, etc.
    entity_type = Column(String(50), nullable=False)  # report, user, task, etc.
    entity_id = Column(String(255), nullable=False)  # Client-side UUID
    
    # Action payload
    payload = Column(JSONB, nullable=False)
    
    # Processing status
    processed = Column(Boolean, default=False, nullable=False, index=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    result = Column(JSONB, nullable=True)  # Processing result
    error_message = Column(Text, nullable=True)
    
    # Priority and retry
    priority = Column(Integer, default=0, nullable=False)  # Higher = more important
    retry_count = Column(Integer, default=0, nullable=False)
    max_retries = Column(Integer, default=3, nullable=False)
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<OfflineAction(action={self.action_type}, entity={self.entity_type}, processed={self.processed})>"
    
    def can_retry(self) -> bool:
        """Check if action can be retried"""
        return self.retry_count < self.max_retries and not self.processed
