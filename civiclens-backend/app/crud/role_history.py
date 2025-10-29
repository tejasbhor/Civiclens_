from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func
from app.crud.base import CRUDBase
from app.models.role_history import RoleHistory
from app.models.user import UserRole


class CRUDRoleHistory(CRUDBase[RoleHistory, None, None]):
    """CRUD operations for RoleHistory model (read-only)"""

    async def get_by_user(
        self,
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[RoleHistory]:
        """Get role history for a user"""
        result = await db.execute(
            select(RoleHistory)
            .where(RoleHistory.user_id == user_id)
            .order_by(desc(RoleHistory.created_at))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_changer(
        self,
        db: AsyncSession,
        changed_by: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[RoleHistory]:
        """Get role changes made by a specific admin"""
        result = await db.execute(
            select(RoleHistory)
            .where(RoleHistory.changed_by == changed_by)
            .order_by(desc(RoleHistory.created_at))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_recent_changes(
        self,
        db: AsyncSession,
        days: int = 30,
        skip: int = 0,
        limit: int = 100
    ) -> List[RoleHistory]:
        """Get recent role changes"""
        from datetime import datetime, timedelta

        cutoff_date = datetime.utcnow() - timedelta(days=days)

        result = await db.execute(
            select(RoleHistory)
            .where(RoleHistory.created_at >= cutoff_date)
            .order_by(desc(RoleHistory.created_at))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_auto_promotions(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100
    ) -> List[RoleHistory]:
        """Get automatic role promotions"""
        result = await db.execute(
            select(RoleHistory)
            .where(RoleHistory.automatic == True)
            .order_by(desc(RoleHistory.created_at))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_role_statistics(
        self,
        db: AsyncSession,
        days: int = 30
    ) -> dict:
        """Get role change statistics"""
        from datetime import datetime, timedelta

        cutoff_date = datetime.utcnow() - timedelta(days=days)

        # Total changes in period
        total_result = await db.execute(
            select(RoleHistory)
            .where(RoleHistory.created_at >= cutoff_date)
        )
        total_changes = len(total_result.scalars().all())

        # Automatic vs manual
        auto_result = await db.execute(
            select(RoleHistory)
            .where(
                and_(
                    RoleHistory.created_at >= cutoff_date,
                    RoleHistory.automatic == True
                )
            )
        )
        auto_promotions = len(auto_result.scalars().all())

        # By role changes
        role_changes = {}
        role_result = await db.execute(
            select(RoleHistory.new_role, func.count(RoleHistory.id))
            .where(RoleHistory.created_at >= cutoff_date)
            .group_by(RoleHistory.new_role)
        )
        for role, count in role_result.all():
            role_changes[role.value] = count

        return {
            "total_changes": total_changes,
            "auto_promotions": auto_promotions,
            "manual_changes": total_changes - auto_promotions,
            "by_role": role_changes
        }


# Singleton instance
role_history_crud = CRUDRoleHistory(RoleHistory)
