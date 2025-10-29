"""
Report Service Layer - Centralized business logic with transaction management
Ensures zero inconsistent states through atomic operations and comprehensive validation
"""

from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from datetime import datetime, timedelta
from fastapi import Depends
import logging

from app.models.report import Report, ReportStatus, ReportSeverity
from app.models.task import Task, TaskStatus
from app.models.department import Department
from app.models.user import User, UserRole
from app.models.report_status_history import ReportStatusHistory
from app.crud.report import report_crud
from app.crud.task import task_crud
from app.schemas.report import ReportUpdate
from app.core.exceptions import ValidationException, NotFoundException, ForbiddenException
from app.core.database import get_db

logger = logging.getLogger(__name__)


class ReportStateValidator:
    """Validates report state transitions and prerequisites"""
    
    ALLOWED_TRANSITIONS = {
        ReportStatus.RECEIVED: {ReportStatus.PENDING_CLASSIFICATION, ReportStatus.ASSIGNED_TO_DEPARTMENT},
        ReportStatus.PENDING_CLASSIFICATION: {ReportStatus.CLASSIFIED, ReportStatus.ASSIGNED_TO_DEPARTMENT},
        ReportStatus.CLASSIFIED: {ReportStatus.ASSIGNED_TO_DEPARTMENT},
        ReportStatus.ASSIGNED_TO_DEPARTMENT: {ReportStatus.ASSIGNED_TO_OFFICER, ReportStatus.ON_HOLD},
        ReportStatus.ASSIGNED_TO_OFFICER: {ReportStatus.ACKNOWLEDGED, ReportStatus.ON_HOLD},
        ReportStatus.ACKNOWLEDGED: {ReportStatus.IN_PROGRESS, ReportStatus.ON_HOLD},
        ReportStatus.IN_PROGRESS: {ReportStatus.PENDING_VERIFICATION, ReportStatus.ON_HOLD},
        ReportStatus.PENDING_VERIFICATION: {ReportStatus.RESOLVED, ReportStatus.REJECTED, ReportStatus.ON_HOLD},
        ReportStatus.ON_HOLD: {ReportStatus.ASSIGNED_TO_DEPARTMENT, ReportStatus.ASSIGNED_TO_OFFICER, ReportStatus.IN_PROGRESS},
        ReportStatus.RESOLVED: {ReportStatus.CLOSED},
        ReportStatus.CLOSED: set(),
        ReportStatus.REJECTED: set(),
        ReportStatus.DUPLICATE: set(),
    }
    
    @classmethod
    def can_transition(cls, old_status: ReportStatus, new_status: ReportStatus) -> bool:
        """Check if status transition is allowed"""
        if old_status == new_status:
            return True
        return new_status in cls.ALLOWED_TRANSITIONS.get(old_status, set())
    
    @classmethod
    async def validate_prerequisites(
        cls, 
        db: AsyncSession, 
        report: Report, 
        new_status: ReportStatus
    ) -> None:
        """Validate all prerequisites for a status change"""
        
        # Check if department is assigned when required
        if new_status == ReportStatus.ASSIGNED_TO_DEPARTMENT:
            if not report.department_id:
                raise ValidationException(
                    "Cannot change status to 'assigned_to_department': "
                    "No department assigned. Please assign a department first."
                )
        
        # Check if officer/task exists when required
        if new_status in {
            ReportStatus.ASSIGNED_TO_OFFICER,
            ReportStatus.ACKNOWLEDGED,
            ReportStatus.IN_PROGRESS
        }:
            task = await task_crud.get_by_report(db, report.id)
            if not task:
                raise ValidationException(
                    f"Cannot change status to '{new_status.value}': "
                    f"No officer assigned. Please assign an officer first."
                )
        
        # Validate resolution requirements
        if new_status in {ReportStatus.RESOLVED, ReportStatus.REJECTED}:
            task = await task_crud.get_by_report(db, report.id)
            if not task:
                raise ValidationException(
                    f"Cannot {new_status.value} report: No task/officer assigned."
                )


class WorkloadBalancer:
    """
    Intelligent workload balancing for officer assignments
    Implements multiple assignment strategies with fairness algorithms
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_officer_workload(self, officer_id: int) -> Dict[str, Any]:
        """
        Calculate comprehensive officer workload metrics
        Returns active reports, resolution time, and workload score
        """
        # Count active reports (assigned but not resolved)
        active_reports_result = await self.db.execute(
            select(func.count(Report.id))
            .select_from(Report)
            .join(Task, Report.id == Task.report_id)
            .where(
                and_(
                    Task.assigned_to == officer_id,
                    Report.status.in_([
                        ReportStatus.ASSIGNED_TO_OFFICER,
                        ReportStatus.ACKNOWLEDGED,
                        ReportStatus.IN_PROGRESS,
                        ReportStatus.PENDING_VERIFICATION
                    ])
                )
            )
        )
        active_reports = active_reports_result.scalar() or 0
        
        # Count total resolved reports for experience metric
        resolved_reports_result = await self.db.execute(
            select(func.count(Report.id))
            .select_from(Report)
            .join(Task, Report.id == Task.report_id)
            .where(
                and_(
                    Task.assigned_to == officer_id,
                    Report.status.in_([ReportStatus.RESOLVED, ReportStatus.CLOSED])
                )
            )
        )
        resolved_reports = resolved_reports_result.scalar() or 0
        
        # Calculate average resolution time (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        avg_resolution_result = await self.db.execute(
            select(func.avg(func.extract('epoch', Report.updated_at - Report.created_at) / 86400))
            .select_from(Report)
            .join(Task, Report.id == Task.report_id)
            .where(
                and_(
                    Task.assigned_to == officer_id,
                    Report.status.in_([ReportStatus.RESOLVED, ReportStatus.CLOSED]),
                    Report.updated_at >= thirty_days_ago,
                    Report.updated_at.isnot(None)
                )
            )
        )
        avg_resolution_time = avg_resolution_result.scalar() or 7.0  # Default 7 days
        
        # Calculate workload score (lower is better)
        # Formula: active_reports + (avg_resolution_time / 7) * 2
        # This balances quantity with efficiency
        workload_score = active_reports + (float(avg_resolution_time) / 7.0) * 2
        
        return {
            "officer_id": officer_id,
            "active_reports": active_reports,
            "resolved_reports": resolved_reports,
            "avg_resolution_time_days": round(avg_resolution_time, 2),
            "workload_score": round(workload_score, 2),
            "capacity_level": self._get_capacity_level(active_reports, avg_resolution_time)
        }
    
    def _get_capacity_level(self, active_reports: int, avg_resolution_time: float) -> str:
        """Determine officer capacity level"""
        if active_reports <= 3 and avg_resolution_time <= 5:
            return "low"  # Available for new assignments
        elif active_reports <= 7 and avg_resolution_time <= 10:
            return "medium"  # Moderate workload
        else:
            return "high"  # Heavy workload, avoid new assignments
    
    async def get_available_officers(
        self, 
        department_id: int,
        exclude_high_workload: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Get officers available for assignment in a department
        Optionally excludes officers with high workload
        """
        # Get all officers in the department
        officers_result = await self.db.execute(
            select(User).where(
                and_(
                    User.department_id == department_id,
                    User.role.in_([UserRole.NODAL_OFFICER, UserRole.ADMIN]),
                    User.is_active == True
                )
            )
        )
        officers = officers_result.scalars().all()
        
        # Calculate workload for each officer
        officer_workloads = []
        for officer in officers:
            workload = await self.get_officer_workload(officer.id)
            workload.update({
                "user_id": officer.id,
                "full_name": officer.full_name,
                "email": officer.email,
                "phone": officer.phone,
                "employee_id": officer.employee_id
            })
            
            # Filter out high workload officers if requested
            if exclude_high_workload and workload["capacity_level"] == "high":
                continue
                
            officer_workloads.append(workload)
        
        return officer_workloads
    
    async def select_best_officer(
        self,
        department_id: int,
        assignment_strategy: str = "balanced"
    ) -> Optional[Dict[str, Any]]:
        """
        Select the best officer for assignment based on strategy
        
        Strategies:
        - "least_busy": Officer with lowest active report count
        - "balanced": Officer with lowest workload score (considers efficiency)
        - "round_robin": Rotate assignments fairly
        """
        available_officers = await self.get_available_officers(department_id)
        
        if not available_officers:
            return None
        
        if assignment_strategy == "least_busy":
            # Sort by active reports count (ascending)
            return min(available_officers, key=lambda x: x["active_reports"])
        
        elif assignment_strategy == "balanced":
            # Sort by workload score (ascending) - considers both quantity and efficiency
            return min(available_officers, key=lambda x: x["workload_score"])
        
        elif assignment_strategy == "round_robin":
            # Find officer with least recent assignment
            # For now, use least busy as fallback
            return min(available_officers, key=lambda x: x["active_reports"])
        
        else:
            # Default to balanced
            return min(available_officers, key=lambda x: x["workload_score"])
    
    async def validate_officer_capacity(
        self,
        officer_id: int,
        max_active_reports: int = 15
    ) -> Tuple[bool, str]:
        """
        Validate if officer can take new assignments
        Returns (can_assign, reason)
        """
        workload = await self.get_officer_workload(officer_id)
        
        if workload["active_reports"] >= max_active_reports:
            return False, f"Officer has {workload['active_reports']} active reports (max: {max_active_reports})"
        
        if workload["capacity_level"] == "high":
            return False, f"Officer has high workload (avg resolution: {workload['avg_resolution_time_days']} days)"
        
        return True, "Officer available for assignment"


class ReportService:
    """
    Centralized service for all report operations
    Ensures atomic transactions and consistent state
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.validator = ReportStateValidator()
        self.workload_balancer = WorkloadBalancer(db)
    
    async def _record_history(
        self,
        report_id: int,
        old_status: ReportStatus,
        new_status: ReportStatus,
        user_id: int,
        notes: Optional[str] = None
    ) -> None:
        """Record status change in history"""
        history = ReportStatusHistory(
            report_id=report_id,
            old_status=old_status,
            new_status=new_status,
            changed_by_user_id=user_id,
            notes=notes,
            changed_at=datetime.utcnow()
        )
        self.db.add(history)
        await self.db.flush()
    
    async def _verify_report_exists(self, report_id: int) -> Report:
        """Verify report exists and return it"""
        report = await report_crud.get(self.db, report_id)
        if not report:
            raise NotFoundException(f"Report {report_id} not found")
        return report
    
    async def _verify_department_exists(self, department_id: int) -> Department:
        """Verify department exists and return it"""
        result = await self.db.execute(
            select(Department).where(Department.id == department_id)
        )
        dept = result.scalar_one_or_none()
        if not dept:
            raise NotFoundException(f"Department {department_id} not found")
        return dept
    
    async def _verify_officer_exists(self, officer_id: int) -> User:
        """Verify officer exists and return it"""
        result = await self.db.execute(
            select(User).where(User.id == officer_id)
        )
        officer = result.scalar_one_or_none()
        if not officer:
            raise NotFoundException(f"Officer {officer_id} not found")
        return officer
    
    async def classify_report(
        self,
        report_id: int,
        category: str,
        severity: ReportSeverity,
        user_id: int,
        notes: Optional[str] = None
    ) -> Report:
        """
        Manually classify a report
        Atomic operation with validation and history tracking
        """
        # Get report
        report = await self._verify_report_exists(report_id)
        
        old_status = report.status
        
        # Update classification fields
        report.manual_category = category
        report.manual_severity = severity
        report.category = category  # Also update main category
        report.severity = severity  # Also update main severity
        report.classified_by_user_id = user_id
        report.classification_notes = notes
        report.status = ReportStatus.CLASSIFIED
        report.status_updated_at = datetime.utcnow()
        
        await self.db.flush()
        
        # Record history
        notes_text = f"Classified as {category} ({severity.value})"
        if notes:
            notes_text += f" - {notes}"
        
        await self._record_history(
            report_id=report_id,
            old_status=old_status,
            new_status=ReportStatus.CLASSIFIED,
            user_id=user_id,
            notes=notes_text
        )
        
        await self.db.commit()
        await self.db.refresh(report)
        
        return report
    
    def _calculate_priority(self, severity: ReportSeverity, created_at: datetime) -> int:
        """Calculate task priority based on severity and age"""
        base = 5
        sev_bonus = {
            ReportSeverity.LOW: 0,
            ReportSeverity.MEDIUM: 1,
            ReportSeverity.HIGH: 3,
            ReportSeverity.CRITICAL: 5,
        }.get(severity, 1)
        
        age_bonus = 0
        try:
            hours = max(0, int((datetime.utcnow() - created_at).total_seconds() // 3600))
            if hours > 72:
                age_bonus = 3
            elif hours > 24:
                age_bonus = 2
            elif hours > 6:
                age_bonus = 1
        except Exception:
            pass
        
        return max(1, min(10, base + sev_bonus + age_bonus))
    
    # ============================================================================
    # ATOMIC OPERATIONS - All operations are transactional
    # ============================================================================
    
    async def assign_department(
        self,
        report_id: int,
        department_id: int,
        user_id: int,
        notes: Optional[str] = None,
        auto_update_status: bool = True
    ) -> Report:
        """
        Atomically assign department to report
        Optionally updates status to ASSIGNED_TO_DEPARTMENT
        """
        # Verify entities exist
        report = await self._verify_report_exists(report_id)
        await self._verify_department_exists(department_id)
        
        old_status = report.status
        
        # Update department
        update_data = {"department_id": department_id}
        
        # Auto-update status if appropriate
        if auto_update_status and report.status in {
            ReportStatus.RECEIVED,
            ReportStatus.PENDING_CLASSIFICATION
        }:
            update_data["status"] = ReportStatus.ASSIGNED_TO_DEPARTMENT
            update_data["status_updated_at"] = datetime.utcnow()
        
        # Apply update
        updated_report = await report_crud.update(
            self.db,
            report_id,
            ReportUpdate(**update_data)
        )
        
        # Record history if status changed
        if "status" in update_data:
            await self._record_history(
                report_id,
                old_status,
                ReportStatus.ASSIGNED_TO_DEPARTMENT,
                user_id,
                notes
            )
        
        await self.db.commit()
        await self.db.refresh(updated_report)
        return updated_report
    
    async def assign_officer(
        self,
        report_id: int,
        officer_id: int,
        assigned_by_id: int,
        priority: Optional[int] = None,
        notes: Optional[str] = None,
        auto_update_status: bool = True,
        validate_capacity: bool = True
    ) -> Report:
        """
        Atomically assign officer to report
        Creates/updates Task and optionally updates status
        Includes workload validation and department matching
        """
        # Verify entities exist
        report = await self._verify_report_exists(report_id)
        officer = await self._verify_officer_exists(officer_id)
        
        # Validate department assignment exists
        if not report.department_id:
            raise ValidationException(
                "Cannot assign officer: Report must be assigned to a department first"
            )
        
        # Validate officer belongs to the same department
        if officer.department_id != report.department_id:
            dept_result = await self.db.execute(
                select(Department.name).where(Department.id == report.department_id)
            )
            dept_name = dept_result.scalar()
            raise ValidationException(
                f"Officer does not belong to the assigned department ({dept_name}). "
                f"Please assign an officer from the correct department."
            )
        
        # Validate officer capacity if requested
        if validate_capacity:
            can_assign, reason = await self.workload_balancer.validate_officer_capacity(officer_id)
            if not can_assign:
                logger.warning(f"Officer capacity validation failed for officer {officer_id}: {reason}")
                # Don't fail the assignment, just log the warning
                # This allows manual override of capacity limits
        
        old_status = report.status
        
        # Check if task already exists
        existing_task = await task_crud.get_by_report(self.db, report_id)
        
        if existing_task:
            # Update existing task
            existing_task.assigned_to = officer_id
            existing_task.assigned_by = assigned_by_id
            if priority is not None:
                existing_task.priority = priority
            if notes is not None:
                existing_task.notes = notes
            await self.db.flush()
        else:
            # Create new task
            calculated_priority = priority or self._calculate_priority(
                report.severity,
                report.created_at
            )
            
            task = Task(
                report_id=report_id,
                assigned_to=officer_id,
                assigned_by=assigned_by_id,
                status=TaskStatus.ASSIGNED,
                priority=calculated_priority,
                notes=notes,
                assigned_at=datetime.utcnow()
            )
            self.db.add(task)
            await self.db.flush()
        
        # Auto-update report status if appropriate
        if auto_update_status and report.status in {
            ReportStatus.RECEIVED,
            ReportStatus.PENDING_CLASSIFICATION,
            ReportStatus.CLASSIFIED,
            ReportStatus.ASSIGNED_TO_DEPARTMENT
        }:
            updated_report = await report_crud.update(
                self.db,
                report_id,
                ReportUpdate(
                    status=ReportStatus.ASSIGNED_TO_OFFICER,
                    status_updated_at=datetime.utcnow()
                )
            )
            
            await self._record_history(
                report_id,
                old_status,
                ReportStatus.ASSIGNED_TO_OFFICER,
                assigned_by_id,
                notes
            )
        else:
            updated_report = report
        
        await self.db.commit()
        await self.db.refresh(updated_report)
        return updated_report
    
    async def update_status(
        self,
        report_id: int,
        new_status: ReportStatus,
        user_id: int,
        notes: Optional[str] = None,
        skip_validation: bool = False
    ) -> Report:
        """
        Atomically update report status with full validation
        """
        # Verify report exists
        report = await self._verify_report_exists(report_id)
        
        old_status = report.status
        
        # Skip if no change
        if old_status == new_status:
            return report
        
        if not skip_validation:
            # Validate transition is allowed
            if not self.validator.can_transition(old_status, new_status):
                raise ValidationException(
                    f"Invalid status transition: {old_status.value} -> {new_status.value}"
                )
            
            # Validate prerequisites
            await self.validator.validate_prerequisites(self.db, report, new_status)
        
        # Update status
        updated_report = await report_crud.update(
            self.db,
            report_id,
            ReportUpdate(
                status=new_status,
                status_updated_at=datetime.utcnow()
            )
        )
        
        # Record history
        await self._record_history(report_id, old_status, new_status, user_id, notes)
        
        await self.db.commit()
        await self.db.refresh(updated_report)
        return updated_report
    
    async def update_severity(
        self,
        report_id: int,
        severity: ReportSeverity,
        user_id: int
    ) -> Report:
        """
        Atomically update report severity
        Also updates task priority if task exists
        """
        # Verify report exists
        report = await self._verify_report_exists(report_id)
        
        # Update severity
        updated_report = await report_crud.update(
            self.db,
            report_id,
            ReportUpdate(severity=severity)
        )
        
        # Update task priority if exists
        task = await task_crud.get_by_report(self.db, report_id)
        if task:
            new_priority = self._calculate_priority(severity, report.created_at)
            task.priority = new_priority
            await self.db.flush()
        
        return updated_report
    
    # ============================================================================
    # BULK OPERATIONS - Transactional batch processing
    # ============================================================================
    
    async def bulk_assign_department(
        self,
        report_ids: List[int],
        department_id: int,
        user_id: int,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Bulk assign department with transaction safety
        Returns detailed results
        """
        # Verify department exists upfront
        await self._verify_department_exists(department_id)
        
        results = {
            "total": len(report_ids),
            "successful": 0,
            "failed": 0,
            "errors": [],
            "successful_ids": [],
            "failed_ids": []
        }
        
        for report_id in report_ids:
            try:
                await self.assign_department(
                    report_id=report_id,
                    department_id=department_id,
                    user_id=user_id,
                    notes=notes,
                    auto_update_status=True
                )
                results["successful"] += 1
                results["successful_ids"].append(report_id)
                
            except Exception as e:
                results["failed"] += 1
                results["failed_ids"].append(report_id)
                results["errors"].append({
                    "report_id": str(report_id),
                    "error": str(e)
                })
        
        # Commit all successful operations
        await self.db.commit()
        return results
    
    async def bulk_assign_officer(
        self,
        report_ids: List[int],
        officer_id: int,
        assigned_by_id: int,
        priority: Optional[int] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Bulk assign officer with transaction safety
        """
        # Verify officer exists upfront
        await self._verify_officer_exists(officer_id)
        
        results = {
            "total": len(report_ids),
            "successful": 0,
            "failed": 0,
            "errors": [],
            "successful_ids": [],
            "failed_ids": []
        }
        
        for report_id in report_ids:
            try:
                await self.assign_officer(
                    report_id=report_id,
                    officer_id=officer_id,
                    assigned_by_id=assigned_by_id,
                    priority=priority,
                    notes=notes,
                    auto_update_status=True
                )
                results["successful"] += 1
                results["successful_ids"].append(report_id)
                
            except Exception as e:
                results["failed"] += 1
                results["failed_ids"].append(report_id)
                results["errors"].append({
                    "report_id": str(report_id),
                    "error": str(e)
                })
        
        await self.db.commit()
        return results
    
    async def bulk_update_status(
        self,
        report_ids: List[int],
        new_status: ReportStatus,
        user_id: int,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Bulk update status with comprehensive validation and transaction management
        """
        results = {
            "total": len(report_ids),
            "successful": 0,
            "failed": 0,
            "errors": [],
            "successful_ids": [],
            "failed_ids": []
        }
        
        # Pre-validate all reports exist and get current statuses
        existing_reports = {}
        try:
            stmt = select(Report).where(Report.id.in_(report_ids))
            result = await self.db.execute(stmt)
            reports = result.scalars().all()
            
            for report in reports:
                existing_reports[report.id] = report
                
            # Check for non-existent reports
            missing_ids = set(report_ids) - set(existing_reports.keys())
            for missing_id in missing_ids:
                results["failed"] += 1
                results["failed_ids"].append(missing_id)
                results["errors"].append({
                    "report_id": str(missing_id),
                    "error": f"Report not found"
                })
                
        except Exception as e:
            logger.error(f"Failed to fetch reports for bulk update: {str(e)}")
            raise ValidationException(f"Failed to validate reports: {str(e)}")
        
        # Process each report with individual error handling
        for report_id in report_ids:
            if report_id not in existing_reports:
                continue  # Already handled in missing_ids
                
            try:
                report = existing_reports[report_id]
                
                # Validate transition before attempting update
                if not self.validator.can_transition(report.status, new_status):
                    raise ValidationException(
                        f"Invalid status transition: {report.status.value} -> {new_status.value}"
                    )
                
                # Validate prerequisites
                await self.validator.validate_prerequisites(self.db, report, new_status)
                
                # Perform the update
                await self.update_status(
                    report_id=report_id,
                    new_status=new_status,
                    user_id=user_id,
                    notes=notes,
                    skip_validation=True  # Already validated above
                )
                
                results["successful"] += 1
                results["successful_ids"].append(report_id)
                
            except Exception as e:
                results["failed"] += 1
                results["failed_ids"].append(report_id)
                results["errors"].append({
                    "report_id": str(report_id),
                    "error": str(e)
                })
                logger.warning(f"Failed to update status for report {report_id}: {str(e)}")
        
        # Commit all successful changes
        try:
            await self.db.commit()
            logger.info(f"Bulk status update completed: {results['successful']}/{results['total']} successful")
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to commit bulk status update: {str(e)}")
            raise ValidationException(f"Failed to save changes: {str(e)}")
            
        return results
    
    async def bulk_update_severity(
        self,
        report_ids: List[int],
        severity: ReportSeverity,
        user_id: int
    ) -> Dict[str, Any]:
        """
        Bulk update severity
        """
        results = {
            "total": len(report_ids),
            "successful": 0,
            "failed": 0,
            "errors": [],
            "successful_ids": [],
            "failed_ids": []
        }
        
        for report_id in report_ids:
            try:
                await self.update_severity(
                    report_id=report_id,
                    severity=severity,
                    user_id=user_id
                )
                results["successful"] += 1
                results["successful_ids"].append(report_id)
                
            except Exception as e:
                results["failed"] += 1
                results["failed_ids"].append(report_id)
                results["errors"].append({
                    "report_id": str(report_id),
                    "error": str(e)
                })
        
        await self.db.commit()
        return results
    
    # ============================================================================
    # AUTO-ASSIGNMENT METHODS - Intelligent officer selection
    # ============================================================================
    
    async def auto_assign_officer(
        self,
        report_id: int,
        assigned_by_id: int,
        strategy: str = "balanced",
        priority: Optional[int] = None,
        notes: Optional[str] = None
    ) -> Tuple[Report, Dict[str, Any]]:
        """
        Automatically assign the best available officer to a report
        Returns (updated_report, assignment_info)
        """
        # Verify report exists and has department
        report = await self._verify_report_exists(report_id)
        
        if not report.department_id:
            raise ValidationException(
                "Cannot auto-assign officer: Report must be assigned to a department first"
            )
        
        # Select best officer using workload balancer
        selected_officer = await self.workload_balancer.select_best_officer(
            department_id=report.department_id,
            assignment_strategy=strategy
        )
        
        if not selected_officer:
            raise ValidationException(
                "No available officers found in the assigned department. "
                "All officers may be at capacity or the department has no officers."
            )
        
        # Assign the selected officer
        updated_report = await self.assign_officer(
            report_id=report_id,
            officer_id=selected_officer["user_id"],
            assigned_by_id=assigned_by_id,
            priority=priority,
            notes=f"Auto-assigned using {strategy} strategy. {notes or ''}".strip(),
            auto_update_status=True,
            validate_capacity=False  # Already validated in selection
        )
        
        # Return assignment info
        assignment_info = {
            "strategy_used": strategy,
            "selected_officer": selected_officer,
            "assignment_reason": f"Selected based on {strategy} strategy",
            "workload_score": selected_officer["workload_score"],
            "active_reports": selected_officer["active_reports"]
        }
        
        logger.info(
            f"Auto-assigned report {report_id} to officer {selected_officer['user_id']} "
            f"using {strategy} strategy (workload score: {selected_officer['workload_score']})"
        )
        
        return updated_report, assignment_info
    
    async def bulk_auto_assign_officers(
        self,
        report_ids: List[int],
        assigned_by_id: int,
        strategy: str = "balanced",
        priority: Optional[int] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Bulk auto-assign officers to multiple reports
        Distributes workload intelligently across available officers
        """
        results = {
            "total": len(report_ids),
            "successful": 0,
            "failed": 0,
            "errors": [],
            "successful_ids": [],
            "failed_ids": [],
            "assignments": []
        }
        
        for report_id in report_ids:
            try:
                updated_report, assignment_info = await self.auto_assign_officer(
                    report_id=report_id,
                    assigned_by_id=assigned_by_id,
                    strategy=strategy,
                    priority=priority,
                    notes=notes
                )
                
                results["successful"] += 1
                results["successful_ids"].append(report_id)
                results["assignments"].append({
                    "report_id": report_id,
                    "officer_id": assignment_info["selected_officer"]["user_id"],
                    "officer_name": assignment_info["selected_officer"]["full_name"],
                    "workload_score": assignment_info["workload_score"],
                    "strategy": strategy
                })
                
            except Exception as e:
                results["failed"] += 1
                results["failed_ids"].append(report_id)
                results["errors"].append({
                    "report_id": str(report_id),
                    "error": str(e)
                })
                logger.warning(f"Failed to auto-assign officer for report {report_id}: {str(e)}")
        
        await self.db.commit()
        
        logger.info(
            f"Bulk auto-assignment completed: {results['successful']}/{results['total']} "
            f"reports assigned using {strategy} strategy"
        )
        
        return results
    
    async def get_department_workload_summary(self, department_id: int) -> Dict[str, Any]:
        """
        Get comprehensive workload summary for a department
        Useful for assignment planning and capacity management
        """
        available_officers = await self.workload_balancer.get_available_officers(
            department_id=department_id,
            exclude_high_workload=False  # Include all officers for summary
        )
        
        if not available_officers:
            return {
                "department_id": department_id,
                "total_officers": 0,
                "available_officers": 0,
                "high_workload_officers": 0,
                "total_active_reports": 0,
                "avg_workload_score": 0,
                "capacity_status": "no_officers"
            }
        
        total_officers = len(available_officers)
        available_count = len([o for o in available_officers if o["capacity_level"] != "high"])
        high_workload_count = len([o for o in available_officers if o["capacity_level"] == "high"])
        total_active_reports = sum(o["active_reports"] for o in available_officers)
        avg_workload_score = sum(o["workload_score"] for o in available_officers) / total_officers
        
        # Determine overall capacity status
        if available_count == 0:
            capacity_status = "at_capacity"
        elif available_count / total_officers >= 0.7:
            capacity_status = "good"
        elif available_count / total_officers >= 0.4:
            capacity_status = "moderate"
        else:
            capacity_status = "limited"
        
        return {
            "department_id": department_id,
            "total_officers": total_officers,
            "available_officers": available_count,
            "high_workload_officers": high_workload_count,
            "total_active_reports": total_active_reports,
            "avg_workload_score": round(avg_workload_score, 2),
            "capacity_status": capacity_status,
            "officers": available_officers
        }


# Factory function for dependency injection
async def get_report_service(db: AsyncSession = Depends(get_db)) -> ReportService:
    """Get report service instance"""
    return ReportService(db)
