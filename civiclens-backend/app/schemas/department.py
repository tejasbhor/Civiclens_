#!/usr/bin/env python3
"""
Department Pydantic schemas
"""

from typing import Optional, List
from pydantic import BaseModel, Field


class DepartmentBase(BaseModel):
    """Base department schema"""
    name: str = Field(..., min_length=1, max_length=255, description="Department name")
    code: str = Field(..., min_length=2, max_length=10, description="Department code (e.g., PWD, SAN)")
    description: Optional[str] = Field(None, max_length=1000, description="Department description")
    keywords: Optional[str] = Field(None, max_length=1000, description="Comma-separated keywords for AI classification")
    contact_email: Optional[str] = Field(None, max_length=255, description="Department contact email")
    contact_phone: Optional[str] = Field(None, max_length=20, description="Department contact phone")
    is_active: bool = Field(True, description="Whether department is active")


class DepartmentCreate(DepartmentBase):
    """Schema for creating a department"""
    pass


class DepartmentUpdate(BaseModel):
    """Schema for updating a department"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    code: Optional[str] = Field(None, min_length=2, max_length=10)
    description: Optional[str] = Field(None, max_length=1000)
    keywords: Optional[str] = Field(None, max_length=1000)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None


class DepartmentResponse(DepartmentBase):
    """Schema for department response"""
    id: int
    created_at: str
    updated_at: Optional[str] = None
    
    class Config:
        from_attributes = True


class DepartmentListResponse(BaseModel):
    """Schema for department list response"""
    departments: List[DepartmentResponse]
    total: int
