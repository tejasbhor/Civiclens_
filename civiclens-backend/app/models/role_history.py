from sqlalchemy import Column, String, Integer, ForeignKey, Text, Enum as SQLEnum, Boolean
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from app.models.user import UserRole


class RoleHistory(BaseModel):
    """Track role changes for audit and accountability"""
    __tablename__ = "role_history"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    old_role = Column(SQLEnum(UserRole, native_enum=True, values_callable=lambda x: [e.value for e in x]), nullable=True)
    new_role = Column(SQLEnum(UserRole, native_enum=True, values_callable=lambda x: [e.value for e in x]), nullable=False)

    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Admin who changed
    reason = Column(Text, nullable=True)
    automatic = Column(Boolean, default=False)  # Auto-promotion vs manual

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    changer = relationship("User", foreign_keys=[changed_by])

    def __repr__(self):
        return f"<RoleHistory(user_id={self.user_id}, {self.old_role} → {self.new_role})>"
