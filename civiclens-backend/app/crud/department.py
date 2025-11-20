#!/usr/bin/env python3
"""
Department CRUD operations
"""

from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.crud.base import CRUDBase
from app.models.department import Department
from app.schemas.department import DepartmentCreate, DepartmentUpdate


class CRUDDepartment(CRUDBase[Department, DepartmentCreate, DepartmentUpdate]):
    """CRUD operations for Department"""
    
    async def get_by_name(self, db: AsyncSession, name: str) -> Optional[Department]:
        """Get department by name"""
        result = await db.execute(
            select(Department).where(Department.name == name)
        )
        return result.scalar_one_or_none()
    
    async def get_by_code(self, db: AsyncSession, code: str) -> Optional[Department]:
        """Get department by code"""
        result = await db.execute(
            select(Department).where(Department.code == code)
        )
        return result.scalar_one_or_none()
    
    async def get_active_departments(self, db: AsyncSession) -> List[Department]:
        """Get all active departments"""
        result = await db.execute(
            select(Department).where(Department.is_active == True).order_by(Department.name)
        )
        return result.scalars().all()
    
    async def search_by_keywords(self, db: AsyncSession, keywords: List[str]) -> List[Department]:
        """Search departments by keywords"""
        query = select(Department)
        
        # Search in name, description, and keywords fields
        for keyword in keywords:
            keyword_filter = (
                Department.name.ilike(f"%{keyword}%") |
                Department.description.ilike(f"%{keyword}%") |
                Department.keywords.ilike(f"%{keyword}%")
            )
            query = query.where(keyword_filter)
        
        result = await db.execute(query.order_by(Department.name))
        return result.scalars().all()


# Create the CRUD instance
department_crud = CRUDDepartment(Department)
