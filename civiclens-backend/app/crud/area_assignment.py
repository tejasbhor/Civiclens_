from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.crud.base import CRUDBase
from app.models.area_assignment import AreaAssignment
from app.schemas.user import AreaAssignmentCreate


class CRUDAreaAssignment(CRUDBase[AreaAssignment, AreaAssignmentCreate, AreaAssignmentCreate]):
    """CRUD operations for AreaAssignment model"""

    async def get_by_user(
        self,
        db: AsyncSession,
        user_id: int,
        active_only: bool = True
    ) -> List[AreaAssignment]:
        """Get area assignments for a user"""
        query = select(AreaAssignment).where(AreaAssignment.user_id == user_id)
        if active_only:
            query = query.where(AreaAssignment.is_active == True)

        result = await db.execute(query)
        return result.scalars().all()

    async def get_by_area(
        self,
        db: AsyncSession,
        area_type: str,
        area_name: str,
        active_only: bool = True
    ) -> List[AreaAssignment]:
        """Get assignments for a specific area"""
        query = select(AreaAssignment).where(
            and_(
                AreaAssignment.area_type == area_type,
                AreaAssignment.area_name == area_name
            )
        )
        if active_only:
            query = query.where(AreaAssignment.is_active == True)

        result = await db.execute(query)
        return result.scalars().all()

    async def create_assignment(
        self,
        db: AsyncSession,
        obj_in: AreaAssignmentCreate,
        assigned_by: int,
        commit: bool = True
    ) -> AreaAssignment:
        """Create area assignment"""
        db_obj = AreaAssignment(
            user_id=obj_in.user_id,
            area_type=obj_in.area_type,
            area_name=obj_in.area_name,
            area_data=obj_in.area_data,
            assigned_by=assigned_by,
            notes=obj_in.notes,
            is_active=True
        )

        db.add(db_obj)
        if commit:
            await db.commit()
            await db.refresh(db_obj)

        return db_obj

    async def deactivate_assignment(
        self,
        db: AsyncSession,
        assignment_id: int,
        commit: bool = True
    ) -> Optional[AreaAssignment]:
        """Deactivate area assignment"""
        assignment = await self.get(db, assignment_id)
        if assignment:
            assignment.is_active = False

            if commit:
                await db.commit()
                await db.refresh(assignment)

        return assignment

    async def get_moderators_for_area(
        self,
        db: AsyncSession,
        area_type: str,
        area_name: str
    ) -> List[AreaAssignment]:
        """Get active moderators for a specific area"""
        result = await db.execute(
            select(AreaAssignment)
            .join(AreaAssignment.user)
            .where(
                and_(
                    AreaAssignment.area_type == area_type,
                    AreaAssignment.area_name == area_name,
                    AreaAssignment.is_active == True
                )
            )
        )
        return result.scalars().all()

    async def check_user_can_moderate_area(
        self,
        db: AsyncSession,
        user_id: int,
        area_type: str,
        area_name: str
    ) -> bool:
        """Check if user can moderate a specific area"""
        result = await db.execute(
            select(AreaAssignment)
            .where(
                and_(
                    AreaAssignment.user_id == user_id,
                    AreaAssignment.area_type == area_type,
                    AreaAssignment.area_name == area_name,
                    AreaAssignment.is_active == True
                )
            )
        )
        assignment = result.scalar_one_or_none()
        return assignment is not None


# Singleton instance
area_assignment_crud = CRUDAreaAssignment(AreaAssignment)
