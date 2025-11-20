from sqlalchemy import Column, String, Integer, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.models.base import BaseModel


class AreaAssignment(BaseModel):
    """Area assignments for moderators - can moderate specific locations"""
    __tablename__ = "area_assignments"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Area Definition
    area_type = Column(String(50), nullable=False)  # district, ward, circle, radius
    area_name = Column(String(255), nullable=False)  # Human-readable name
    area_data = Column(JSONB, nullable=False)  # Flexible area definition
    # Examples:
    # {"type": "district", "name": "Navi Mumbai"}
    # {"type": "radius", "center_lat": 23.34, "center_lon": 85.31, "radius_km": 5}
    # {"type": "polygon", "coordinates": [[lat, lon], ...]}

    is_active = Column(Boolean, default=True, nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Admin who assigned
    notes = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    assigner = relationship("User", foreign_keys=[assigned_by])

    def __repr__(self):
        return f"<AreaAssignment(user_id={self.user_id}, area={self.area_name})>"
