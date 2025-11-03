from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from geoalchemy2.functions import ST_DWithin, ST_MakePoint
from app.crud.base import CRUDBase
from app.models.report import Report, ReportStatus, ReportSeverity
from app.schemas.report import ReportCreate, ReportUpdate


class CRUDReport(CRUDBase[Report, ReportCreate, ReportUpdate]):
    """CRUD operations for Report model"""
    
    async def get_with_relations(
        self,
        db: AsyncSession,
        report_id: int
    ) -> Optional[Report]:
        """Get report with all relationships loaded"""
        return await self.get(
            db,
            report_id,
            relationships=['user', 'department', 'media', 'task']
        )
    
    async def get_by_status(
        self,
        db: AsyncSession,
        status: ReportStatus,
        skip: int = 0,
        limit: int = 100
    ) -> List[Report]:
        """Get reports by status"""
        return await self.get_multi(
            db,
            skip=skip,
            limit=limit,
            filters={'status': status},
            relationships=['user', 'department']
        )
    
    async def get_by_user(
        self,
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Report]:
        """Get all reports by a user"""
        return await self.get_multi(
            db,
            skip=skip,
            limit=limit,
            filters={'user_id': user_id},
            relationships=['department', 'media', 'task']
        )
    
    async def get_by_department(
        self,
        db: AsyncSession,
        department_id: int,
        status: Optional[ReportStatus] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Report]:
        """Get reports by department"""
        filters = {'department_id': department_id}
        if status:
            filters['status'] = status
        
        return await self.get_multi(
            db,
            skip=skip,
            limit=limit,
            filters=filters,
            relationships=['user', 'task']
        )
    
    async def get_nearby(
        self,
        db: AsyncSession,
        latitude: float,
        longitude: float,
        radius_meters: float = 1000,
        limit: int = 50
    ) -> List[Report]:
        """Get reports within a radius (in meters) of a location"""
        # Using PostGIS geography type for accurate distance calculation
        point = func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326)
        
        query = (
            select(Report)
            .where(
                func.ST_DWithin(
                    func.ST_SetSRID(func.ST_MakePoint(Report.longitude, Report.latitude), 4326),
                    point,
                    radius_meters
                )
            )
            .limit(limit)
        )
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def search(
        self,
        db: AsyncSession,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        skip: int = 0,
        limit: int = 100,
        relationships: Optional[List[str]] = None
    ) -> List[Report]:
        """Search reports by title, description, or address with optional filters"""
        search_filter = or_(
            Report.title.ilike(f"%{query}%"),
            Report.description.ilike(f"%{query}%"),
            Report.address.ilike(f"%{query}%"),
            Report.report_number.ilike(f"%{query}%")
        )
        
        stmt = select(Report).where(search_filter)
        
        # Add relationships if specified
        if relationships:
            from sqlalchemy.orm import selectinload
            for rel in relationships:
                if hasattr(Report, rel):
                    stmt = stmt.options(selectinload(getattr(Report, rel)))
        
        # Apply additional filters
        if filters:
            for key, value in filters.items():
                if hasattr(Report, key):
                    stmt = stmt.where(getattr(Report, key) == value)
        
        stmt = (
            stmt
            .order_by(Report.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        
        result = await db.execute(stmt)
        return result.scalars().all()
    
    async def count_search(
        self,
        db: AsyncSession,
        query: str,
        filters: Optional[Dict[str, Any]] = None
    ) -> int:
        """Count search results with optional filters"""
        search_filter = or_(
            Report.title.ilike(f"%{query}%"),
            Report.description.ilike(f"%{query}%"),
            Report.address.ilike(f"%{query}%"),
            Report.report_number.ilike(f"%{query}%")
        )
        
        stmt = select(func.count(Report.id)).where(search_filter)
        
        # Apply additional filters
        if filters:
            for key, value in filters.items():
                if hasattr(Report, key):
                    stmt = stmt.where(getattr(Report, key) == value)
        
        result = await db.execute(stmt)
        return result.scalar() or 0
    
    async def get_statistics(
        self,
        db: AsyncSession,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Get report statistics"""
        query = select(Report)
        
        if filters:
            for key, value in filters.items():
                if hasattr(Report, key):
                    query = query.where(getattr(Report, key) == value)
        
        # Total count
        total = await self.count(db, filters)
        
        # Count by status
        status_query = (
            select(Report.status, func.count(Report.id))
            .group_by(Report.status)
        )
        
        if filters:
            for key, value in filters.items():
                if hasattr(Report, key) and key != 'status':
                    status_query = status_query.where(getattr(Report, key) == value)
        
        status_result = await db.execute(status_query)
        by_status = {status: count for status, count in status_result.all()}
        
        # Count by category - ONLY active reports (exclude closed, resolved, rejected)
        # Closed/resolved reports should only contribute to their own status counts
        category_query = (
            select(Report.category, func.count(Report.id))
            .where(Report.status.not_in([
                ReportStatus.CLOSED,
                ReportStatus.RESOLVED,
                ReportStatus.REJECTED
            ]))
            .group_by(Report.category)
        )
        
        if filters:
            for key, value in filters.items():
                if hasattr(Report, key) and key != 'category':
                    category_query = category_query.where(getattr(Report, key) == value)
        
        category_result = await db.execute(category_query)
        by_category = {category: count for category, count in category_result.all()}
        
        # Count by severity - ONLY active reports (exclude closed, resolved, rejected)
        # Closed/resolved reports should only contribute to their own status counts
        severity_query = (
            select(Report.severity, func.count(Report.id))
            .where(Report.status.not_in([
                ReportStatus.CLOSED,
                ReportStatus.RESOLVED,
                ReportStatus.REJECTED
            ]))
            .group_by(Report.severity)
        )
        
        if filters:
            for key, value in filters.items():
                if hasattr(Report, key) and key != 'severity':
                    severity_query = severity_query.where(getattr(Report, key) == value)
        
        severity_result = await db.execute(severity_query)
        by_severity = {severity: count for severity, count in severity_result.all()}
        
        return {
            'total': total,
            'by_status': by_status,
            'by_category': by_category,
            'by_severity': by_severity,
        }


# Singleton instance
report_crud = CRUDReport(Report)
