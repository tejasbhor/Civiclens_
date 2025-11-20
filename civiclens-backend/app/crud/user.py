from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from app.crud.base import CRUDBase
from app.models.user import User, UserRole, ProfileCompletionLevel
from app.models.role_history import RoleHistory
from app.schemas.user import UserCreate, UserUpdate, UserProfileUpdate, OfficerCreate, RoleChangeRequest
from app.core.security import get_password_hash, get_password_hash_direct, verify_password, verify_password_direct
from app.core.enhanced_security import validate_password_strength
from app.core.exceptions import ValidationException
from datetime import datetime
import re


class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    """CRUD operations for User model"""

    async def get_by_phone(self, db: AsyncSession, phone: str) -> Optional[User]:
        """Get user by phone number (handles multiple formats)"""
        # Normalize phone number for search
        # Remove all non-digit characters except +
        normalized = phone.strip()
        
        # Try exact match first
        result = await db.execute(select(User).where(User.phone == normalized))
        user = result.scalar_one_or_none()
        if user:
            return user
        
        # If phone starts with +91, try without it
        if normalized.startswith('+91') and len(normalized) == 13:
            without_prefix = normalized[3:]  # Remove +91
            result = await db.execute(select(User).where(User.phone == without_prefix))
            user = result.scalar_one_or_none()
            if user:
                return user
        
        # If phone is 10 digits, try with +91 prefix
        digits_only = re.sub(r'\D', '', normalized)
        if len(digits_only) == 10 and digits_only[0] != '0':
            with_prefix = f"+91{digits_only}"
            result = await db.execute(select(User).where(User.phone == with_prefix))
            user = result.scalar_one_or_none()
            if user:
                return user
        
        return None

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        """Get user by email"""
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def create_minimal_user(
        self,
        db: AsyncSession,
        phone: str,
        commit: bool = True
    ) -> User:
        """Create user with minimal information (phone only)"""
        db_obj = User(
            phone=phone,
            phone_verified=False,
            profile_completion=ProfileCompletionLevel.MINIMAL,
            role=UserRole.CITIZEN,
            account_created_via="otp"
        )

        db.add(db_obj)
        if commit:
            await db.commit()
            await db.refresh(db_obj)

        return db_obj

    async def create_with_password(
        self,
        db: AsyncSession,
        obj_in: UserCreate,
        commit: bool = True
    ) -> User:
        """Create user with hashed password"""
        # Validate password strength
        if obj_in.password:
            is_valid, error_msg = validate_password_strength(obj_in.password)
            if not is_valid:
                raise ValidationException(error_msg)
        
        db_obj = User(
            phone=obj_in.phone,
            email=obj_in.email,
            full_name=obj_in.full_name,
            role=obj_in.role,
            hashed_password=get_password_hash(obj_in.password) if obj_in.password else None,
            profile_completion=ProfileCompletionLevel.COMPLETE if obj_in.email else ProfileCompletionLevel.BASIC,
            account_created_via="password"
        )

        db.add(db_obj)
        if commit:
            await db.commit()
            await db.refresh(db_obj)

        return db_obj

    async def create_officer(
        self,
        db: AsyncSession,
        obj_in: OfficerCreate,
        commit: bool = True
    ) -> User:
        """Create officer/admin with credentials"""
        # Validate password strength
        is_valid, error_msg = validate_password_strength(obj_in.password)
        if not is_valid:
            raise ValidationException(error_msg)
        
        # Create user without employee_id first
        db_obj = User(
            phone=obj_in.phone,
            email=obj_in.email,
            full_name=obj_in.full_name,
            role=obj_in.role,
            hashed_password=get_password_hash(obj_in.password),
            employee_id=None,  # Will be set after getting ID
            department_id=obj_in.department_id,
            profile_completion=ProfileCompletionLevel.COMPLETE,
            phone_verified=True,
            email_verified=True,
            account_created_via="password"
        )

        db.add(db_obj)
        if commit:
            await db.commit()
            await db.refresh(db_obj)
            
            # Auto-generate employee_id if not provided
            # Format: EMP-YYYY-XXXXXX (e.g., EMP-2025-000015)
            if not obj_in.employee_id:
                from datetime import datetime
                year = datetime.now().year
                employee_id = f"EMP-{year}-{db_obj.id:06d}"
                db_obj.employee_id = employee_id
                await db.commit()
                await db.refresh(db_obj)
            else:
                db_obj.employee_id = obj_in.employee_id
                await db.commit()
                await db.refresh(db_obj)

        return db_obj

    async def authenticate(
        self,
        db: AsyncSession,
        phone: str,
        password: str
    ) -> Optional[User]:
        """Authenticate user with phone and password"""
        user = await self.get_by_phone(db, phone)

        if not user:
            return None

        if not user.hashed_password:
            return None

        if not verify_password(password, user.hashed_password):
            return None

        return user

    async def update_profile(
        self,
        db: AsyncSession,
        user_id: int,
        profile_data: UserProfileUpdate,
        commit: bool = True
    ) -> Optional[User]:
        """Update user profile progressively"""
        user = await self.get(db, user_id)
        if not user:
            return None

        # Update profile fields
        update_data = profile_data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if hasattr(user, field):
                setattr(user, field, value)

        # Update profile completion level
        user.update_profile_completion()

        if commit:
            await db.commit()
            await db.refresh(user)

        return user

    async def update_reputation(
        self,
        db: AsyncSession,
        user_id: int,
        points: int,
        commit: bool = True
    ) -> Optional[User]:
        """Update user reputation score"""
        user = await self.get(db, user_id)
        if user:
            user.reputation_score += points
            user.total_validations += 1

            if commit:
                await db.commit()
                await db.refresh(user)

            # Check for auto-promotion
            if user.should_promote_to_contributor():
                await self.promote_to_contributor(db, user_id, automatic=True, commit=commit)

        return user

    async def change_role(
        self,
        db: AsyncSession,
        user_id: int,
        new_role: UserRole,
        changed_by: int,
        reason: Optional[str] = None,
        automatic: bool = False,
        commit: bool = True
    ) -> Optional[User]:
        """Change user role with audit trail"""
        user = await self.get(db, user_id)
        if not user:
            return None

        old_role = user.role

        # Create role history record
        role_history = RoleHistory(
            user_id=user_id,
            old_role=old_role,
            new_role=new_role,
            changed_by=changed_by,
            reason=reason,
            automatic=automatic
        )
        db.add(role_history)

        # Update user role
        user.role = new_role

        if commit:
            await db.commit()
            await db.refresh(user)

        return user

    async def promote_to_contributor(
        self,
        db: AsyncSession,
        user_id: int,
        automatic: bool = False,
        admin_id: Optional[int] = None,
        commit: bool = True
    ) -> Optional[User]:
        """Promote user to contributor"""
        return await self.change_role(
            db=db,
            user_id=user_id,
            new_role=UserRole.CONTRIBUTOR,
            changed_by=admin_id or 1,  # System admin if no specific admin
            reason="Auto-promotion based on reputation and activity" if automatic else "Manual promotion",
            automatic=automatic,
            commit=commit
        )

    async def get_users_by_role(
        self,
        db: AsyncSession,
        role: UserRole,
        skip: int = 0,
        limit: int = 100
    ) -> List[User]:
        """Get users by role"""
        result = await db.execute(
            select(User)
            .where(User.role == role)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_users_by_reputation(
        self,
        db: AsyncSession,
        min_reputation: int = 0,
        skip: int = 0,
        limit: int = 100
    ) -> List[User]:
        """Get users by minimum reputation score"""
        result = await db.execute(
            select(User)
            .where(User.reputation_score >= min_reputation)
            .order_by(User.reputation_score.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_promotion_candidates(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100
    ) -> List[User]:
        """Get users eligible for promotion to contributor"""
        result = await db.execute(
            select(User)
            .where(
                and_(
                    User.role == UserRole.CITIZEN,
                    User.reputation_score >= 100,
                    User.total_reports >= 5,
                    User.total_validations >= 10,
                    User.profile_completion == ProfileCompletionLevel.COMPLETE
                )
            )
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def update_login_stats(
        self,
        db: AsyncSession,
        user_id: int,
        commit: bool = True
    ) -> Optional[User]:
        """Update login statistics"""
        user = await self.get(db, user_id)
        if user:
            user.last_login = datetime.utcnow()
            user.login_count += 1

            if commit:
                await db.commit()
                await db.refresh(user)

        return user

    async def get_user_stats(
        self,
        db: AsyncSession,
        user_id: int
    ) -> Optional[dict]:
        """Get comprehensive user statistics"""
        user = await self.get(db, user_id)
        if not user:
            return None

        # Get counts from related models
        from app.models.report import Report
        from app.models.task import Task, TaskStatus

        # Reports by user
        reports_result = await db.execute(
            select(func.count(Report.id)).where(Report.user_id == user_id)
        )
        total_reports = reports_result.scalar() or 0

        # Count reports by status for citizens
        from app.models.report import ReportStatus
        
        # In progress reports (all active statuses)
        in_progress_result = await db.execute(
            select(func.count(Report.id)).where(
                and_(
                    Report.user_id == user_id,
                    Report.status.in_([
                        ReportStatus.RECEIVED,
                        ReportStatus.PENDING_CLASSIFICATION,
                        ReportStatus.CLASSIFIED,
                        ReportStatus.ASSIGNED_TO_DEPARTMENT,
                        ReportStatus.ASSIGNED_TO_OFFICER,
                        ReportStatus.ACKNOWLEDGED,
                        ReportStatus.IN_PROGRESS,
                        ReportStatus.PENDING_VERIFICATION,
                        ReportStatus.ON_HOLD
                        # Note: REOPENED status exists in enum but not in database yet
                    ])
                )
            )
        )
        in_progress_reports = in_progress_result.scalar() or 0

        # Resolved reports (resolved + closed)
        resolved_result = await db.execute(
            select(func.count(Report.id)).where(
                and_(
                    Report.user_id == user_id,
                    Report.status.in_([ReportStatus.RESOLVED, ReportStatus.CLOSED])
                )
            )
        )
        resolved_reports = resolved_result.scalar() or 0

        # Resolved tasks by user (if officer)
        resolved_tasks_result = await db.execute(
            select(func.count(Task.id)).where(
                and_(Task.assigned_to == user_id, Task.status == TaskStatus.RESOLVED)
            )
        )
        tasks_resolved = resolved_tasks_result.scalar() or 0

        return {
            "reputation_score": user.reputation_score,
            "total_reports": total_reports,
            "in_progress_reports": in_progress_reports,
            "resolved_reports": resolved_reports,
            "active_reports": in_progress_reports,  # Alias for compatibility
            "total_validations": user.total_validations,
            "helpful_validations": user.helpful_validations,
            "tasks_resolved": tasks_resolved,  # For officers
            "can_promote_to_contributor": user.should_promote_to_contributor(),
            "next_milestone": self.get_next_milestone(user)
        }

    def get_next_milestone(self, user: User) -> Optional[str]:
        """Get next milestone for user"""
        if user.role == UserRole.CITIZEN:
            if user.reputation_score < 100:
                return f"Earn {100 - user.reputation_score} more reputation points"
            elif user.total_reports < 5:
                return f"Submit {5 - user.total_reports} more reports"
            elif user.total_validations < 10:
                return f"Make {10 - user.total_validations} more validations"
            else:
                return "Complete your profile to unlock contributor status"
        return None


# Singleton instance
user_crud = CRUDUser(User)
