from sqlalchemy import Column, String, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Department(BaseModel):
    __tablename__ = "departments"
    
    name = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    keywords = Column(Text, nullable=True)  # Comma-separated keywords for AI classification
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(20), nullable=True)
    
    # Relationships
    reports = relationship("Report", back_populates="department")
    officers = relationship("User", back_populates="department")
    
    def __repr__(self):
        return f"<Department(id={self.id}, name={self.name})>"
