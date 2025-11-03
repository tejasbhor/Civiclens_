"""
AI Processing Pipeline - Integrated with CivicLens Schema
Orchestrates the complete AI workflow from report receipt to classification
"""

from typing import Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import logging

from app.services.ai.duplicate_detector import DuplicateDetector
from app.services.ai.category_classifier import CategoryClassifier
from app.services.ai.urgency_scorer import UrgencyScorer
from app.services.ai.department_router import DepartmentRouter
from app.services.ai.config import AIConfig
from app.crud.report import report_crud
from app.models.report import ReportStatus, ReportSeverity, ReportCategory
from app.models.report_status_history import ReportStatusHistory
from app.models.user import User, UserRole
from app.schemas.report import ReportUpdate

logger = logging.getLogger(__name__)


class AIProcessingPipeline:
    """
    Production AI Pipeline for CivicLens
    Integrates with your existing Report schema and workflow
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.duplicate_detector = DuplicateDetector()
        self.category_classifier = CategoryClassifier()
        self.urgency_scorer = UrgencyScorer()
        self.department_router = DepartmentRouter()
        self._system_user_id = None
    
    async def _get_system_user_id(self) -> int:
        """Get AI Engine system user for AI operations"""
        if self._system_user_id:
            return self._system_user_id
        
        # Try to find AI Engine system user first
        result = await self.db.execute(
            select(User.id).where(
                User.email == "ai-engine@civiclens.system",
                User.is_active == True
            )
        )
        ai_user_id = result.scalar()
        
        if ai_user_id:
            self._system_user_id = ai_user_id
            logger.info(f"✅ Using AI Engine user (ID: {ai_user_id}) for automated actions")
            return ai_user_id
        
        # Fallback: Try to find any active admin user
        logger.warning("AI Engine user not found, falling back to first admin user")
        result = await self.db.execute(
            select(User.id).where(
                User.role == UserRole.ADMIN,
                User.is_active == True
            ).limit(1)
        )
        user_id = result.scalar()
        
        if user_id:
            self._system_user_id = user_id
            logger.warning(f"Using fallback admin user (ID: {user_id}). Please create AI Engine user!")
            return user_id
        
        # If no admin found, log error and return None
        logger.error("No active admin user found for AI system operations. Please run: python -m app.db.seeds.create_ai_system_user")
        return None
    
    async def process_report(self, report_id: int, force: bool = False) -> Dict:
        """
        Complete AI pipeline matching your workflow
        
        Production-ready integration:
        - Checks if report was manually processed (prevents re-processing)
        - Records audit trail for all AI actions
        - Handles graceful degradation
        - Respects existing workflow statuses
        
        Updates Report fields:
        - ai_category, ai_confidence, ai_processed_at, ai_model_version
        - category (from ReportCategory enum)
        - severity (from ReportSeverity enum)
        - department_id (from your 6 departments)
        - status (RECEIVED → CLASSIFIED → ASSIGNED_TO_DEPARTMENT)
        - is_duplicate, duplicate_of_report_id
        - needs_review (if confidence < threshold)
        
        Args:
            report_id: Report ID to process
            force: Force reprocessing even if already processed (admin override)
        """
        
        start_time = datetime.utcnow()
        result = {
            "report_id": report_id,
            "status": "processing",
            "stages": {},
            "errors": [],
            "skipped": False,
            "skip_reason": None
        }
        
        try:
            logger.info(f"🤖 AI Pipeline: Processing report {report_id}")
            
            # Load report
            report = await report_crud.get(self.db, report_id)
            if not report:
                raise ValueError(f"Report {report_id} not found")
            
            # ========== GUARD: PREVENT RE-PROCESSING ==========
            # Skip if report was manually processed or already AI-processed
            if not force:
                skip_reason = await self._should_skip_processing(report)
                if skip_reason:
                    logger.info(f"⏭️  Skipping report {report_id}: {skip_reason}")
                    result["status"] = "skipped"
                    result["skipped"] = True
                    result["skip_reason"] = skip_reason
                    return result
            
            # Ensure report is in correct initial state
            if report.status not in [ReportStatus.RECEIVED, ReportStatus.PENDING_CLASSIFICATION]:
                logger.warning(
                    f"Report {report_id} not in processable state (current: {report.status})"
                )
                if not force:
                    result["status"] = "skipped"
                    result["skipped"] = True
                    result["skip_reason"] = f"Status is {report.status.value}, expected RECEIVED or PENDING_CLASSIFICATION"
                    return result
            
            # ========== STAGE 1: DUPLICATE DETECTION ==========
            if AIConfig.ENABLE_DUPLICATE_DETECTION:
                logger.info("Stage 1: Duplicate detection...")
                try:
                    duplicate_result = await self.duplicate_detector.check_duplicate(
                        report.title,
                        report.description,
                        float(report.latitude),
                        float(report.longitude),
                        self.db,
                        category=report.category,
                        report_id=report.id
                    )
                    result["stages"]["duplicate_detection"] = duplicate_result
                    
                    if duplicate_result["is_duplicate"]:
                        # Determine if needs urgent review based on similarity confidence
                        similarity = duplicate_result.get("similarity", 1.0)
                        needs_review = similarity < AIConfig.DUPLICATE_HIGH_CONFIDENCE_THRESHOLD  # Low confidence duplicates need review
                        
                        # Update report: mark as duplicate
                        await report_crud.update(self.db, report_id, ReportUpdate(
                            is_duplicate=True,
                            duplicate_of_report_id=duplicate_result["duplicate_of"],
                            ai_processed_at=datetime.utcnow(),
                            ai_model_version=AIConfig.AI_MODEL_VERSION,
                            ai_confidence=similarity,  # Set confidence from similarity score
                            needs_review=needs_review,  # Only low confidence duplicates need review
                            status=ReportStatus.DUPLICATE,
                            status_updated_at=datetime.utcnow()
                        ), commit=False)
                        
                        # Record status change in audit trail with AI Engine user
                        ai_user_id = await self._get_system_user_id()
                        review_note = " (needs review)" if needs_review else " (high confidence)"
                        await self._record_status_change(
                            report_id,
                            report.status,
                            ReportStatus.DUPLICATE,
                            user_id=ai_user_id,  # AI Engine user
                            notes=f"AI detected duplicate: {duplicate_result['explanation']}{review_note}"
                        )
                        
                        await self.db.commit()
                        
                        result["status"] = "duplicate"
                        result["explanation"] = duplicate_result.get("explanation")
                        
                        logger.info(
                            f"✅ Report {report_id} marked as duplicate of "
                            f"report {duplicate_result['duplicate_of']}"
                        )
                        
                        return result
                        
                except Exception as e:
                    logger.error(f"Duplicate detection error: {str(e)}", exc_info=True)
                    result["errors"].append({"stage": "duplicate", "error": str(e)})
                    # Continue processing
            
            # ========== STAGE 2: CATEGORY CLASSIFICATION ==========
            logger.info("Stage 2: Category classification...")
            try:
                category_result = self.category_classifier.classify(
                    report.title,
                    report.description
                )
                result["stages"]["classification"] = category_result
                
                # Validate category is in your enum
                try:
                    ReportCategory(category_result["category"])
                except ValueError:
                    logger.error(f"Invalid category: {category_result['category']}")
                    category_result["category"] = "other"
                    category_result["confidence"] = 0.3
                
            except Exception as e:
                logger.error(f"Classification error: {str(e)}", exc_info=True)
                result["errors"].append({"stage": "classification", "error": str(e)})
                # Mark for manual review
                await self._mark_for_review(report, "classification_failed")
                result["status"] = "needs_admin_review"
                return result
            
            # ========== STAGE 3: SEVERITY SCORING ==========
            logger.info("Stage 3: Severity scoring...")
            try:
                severity_result = self.urgency_scorer.score_urgency(
                    report.title,
                    report.description,
                    category_result["category"]
                )
                result["stages"]["severity"] = severity_result
                
                # Validate severity is in your enum
                try:
                    ReportSeverity(severity_result["severity"])
                except ValueError:
                    logger.error(f"Invalid severity: {severity_result['severity']}")
                    severity_result["severity"] = "medium"
                
            except Exception as e:
                logger.error(f"Severity scoring error: {str(e)}", exc_info=True)
                result["errors"].append({"stage": "severity", "error": str(e)})
                # Use default
                severity_result = {
                    "severity": "medium",
                    "confidence": 0.5,
                    "priority": 5
                }
            
            # ========== STAGE 4: DEPARTMENT ROUTING ==========
            logger.info("Stage 4: Department routing...")
            try:
                dept_result = await self.department_router.route_to_department(
                    category_result["category"],
                    report.title,
                    report.description,
                    self.db
                )
                result["stages"]["department"] = dept_result
                
                if not dept_result.get("department_id"):
                    logger.warning("No department assigned - requires manual review")
                    await self._mark_for_review(report, "no_department_match")
                    result["status"] = "needs_admin_review"
                    # Don't return early - continue to commit changes
                    # return result
                    
            except Exception as e:
                logger.error(f"Department routing error: {str(e)}", exc_info=True)
                result["errors"].append({"stage": "department", "error": str(e)})
                await self._mark_for_review(report, "department_routing_failed")
                result["status"] = "needs_admin_review"
                # Don't return early - continue to commit changes
                # return result
            
            # ========== STAGE 5: UPDATE REPORT WITH AI RESULTS ==========
            logger.info("Stage 5: Updating report with AI predictions...")
            
            overall_confidence = self._calculate_overall_confidence(
                category_result,
                severity_result,
                dept_result
            )
            result["overall_confidence"] = overall_confidence
            
            # Log detailed confidence breakdown
            logger.info(
                f"📊 Confidence Analysis: "
                f"Category={category_result.get('confidence', 0):.2f} ({category_result['category']}), "
                f"Severity={severity_result.get('confidence', 0):.2f} ({severity_result['severity']}), "
                f"Department={dept_result.get('confidence', 0):.2f} → "
                f"Overall={overall_confidence:.2f}"
            )
            
            # Prepare update data
            update_data = ReportUpdate(
                # AI predictions
                ai_category=category_result["category"],
                ai_confidence=overall_confidence,
                ai_processed_at=datetime.utcnow(),
                ai_model_version=AIConfig.AI_MODEL_VERSION,
                
                # Apply to main fields
                category=category_result["category"],
                severity=ReportSeverity(severity_result["severity"]),
                department_id=dept_result["department_id"],
                
                # Status transition
                status=ReportStatus.CLASSIFIED,
                status_updated_at=datetime.utcnow()
            )
            
            # Check if needs manual review
            if overall_confidence < AIConfig.MIN_CLASSIFICATION_CONFIDENCE:
                update_data.needs_review = True
                update_data.status = ReportStatus.PENDING_CLASSIFICATION
                logger.info(
                    f"Low confidence ({overall_confidence:.2f}) - marking for review"
                )
            
            # Apply updates (don't commit yet, we'll commit at the end)
            await report_crud.update(self.db, report_id, update_data, commit=False)
            
            # Record status change in audit trail if status changed
            if "status" in update_data.model_dump(exclude_unset=True):
                # Get AI Engine user for audit trail
                ai_user_id = await self._get_system_user_id()
                await self._record_status_change(
                    report_id,
                    report.status,
                    update_data.status,
                    user_id=ai_user_id,  # AI Engine user
                    notes=f"AI classification: {category_result['category']} (confidence: {overall_confidence:.0%})"
                )
            
            # ========== STAGE 6: AUTO-ASSIGNMENT TO DEPARTMENT ==========
            if overall_confidence >= AIConfig.AUTO_ASSIGN_CONFIDENCE and AIConfig.ENABLE_AUTO_ASSIGNMENT:
                logger.info("Stage 6: Attempting auto-assignment to department...")
                
                try:
                    # Get system user for assignment
                    system_user_id = await self._get_system_user_id()
                    
                    if not system_user_id:
                        logger.warning("No system user available, skipping auto-assignment")
                        result["status"] = "classified"
                        result["errors"].append({
                            "stage": "auto_assignment",
                            "error": "No system user found"
                        })
                    elif not dept_result.get("department_id"):
                        logger.warning("No department_id available, skipping auto-assignment")
                        result["status"] = "classified"
                    else:
                        # CRITICAL FIX: Update BOTH status AND department_id
                        # This ensures Stage 7 (officer assignment) can proceed
                        await report_crud.update(self.db, report_id, ReportUpdate(
                            department_id=dept_result["department_id"],  # ✅ Set department_id!
                            status=ReportStatus.ASSIGNED_TO_DEPARTMENT,
                            status_updated_at=datetime.utcnow()
                        ), commit=False)
                        
                        # Record department assignment in audit trail
                        await self._record_status_change(
                            report_id,
                            ReportStatus.CLASSIFIED,
                            ReportStatus.ASSIGNED_TO_DEPARTMENT,
                            user_id=system_user_id,
                            notes=f"Auto-assigned by AI to {dept_result.get('department_name', 'department')}: {category_result['category']} (confidence: {overall_confidence:.0%})"
                        )
                        
                        result["status"] = "assigned_to_department"
                        logger.info(
                            f"✅ Assigned to department {dept_result['department_id']} ({dept_result.get('department_name', 'N/A')}), "
                            f"status: ASSIGNED_TO_DEPARTMENT"
                        )
                        
                except Exception as e:
                    logger.error(f"Auto-assignment error: {str(e)}", exc_info=True)
                    result["errors"].append({"stage": "auto_assignment", "error": str(e)})
                    result["status"] = "classified"
            else:
                if overall_confidence < AIConfig.AUTO_ASSIGN_CONFIDENCE:
                    result["status"] = "needs_admin_review"
                    logger.info(
                        f"⚠️  Confidence {overall_confidence:.2f} < {AIConfig.AUTO_ASSIGN_CONFIDENCE:.2f} threshold → "
                        f"Flagged for manual review"
                    )
                else:
                    result["status"] = "classified"
                    logger.info(
                        f"✅ Classified successfully (confidence: {overall_confidence:.2f}), "
                        f"awaiting department assignment"
                    )
            
            # ========== STAGE 7: AUTO-ASSIGNMENT TO OFFICER ==========
            if (overall_confidence >= AIConfig.AUTO_ASSIGN_OFFICER_CONFIDENCE and 
                AIConfig.ENABLE_AUTO_OFFICER_ASSIGNMENT and 
                result["status"] == "assigned_to_department"):
                logger.info("Stage 7: Attempting auto-assignment to officer...")
                
                try:
                    from app.services.report_service import ReportService
                    report_service = ReportService(self.db)
                    
                    # Get AI Engine user for assignment
                    ai_user_id = await self._get_system_user_id()
                    
                    if not ai_user_id:
                        logger.warning("No AI user available, skipping officer auto-assignment")
                    else:
                        # Use your existing auto-assignment algorithm
                        updated_report, assignment_info = await report_service.auto_assign_officer(
                            report_id=report_id,
                            assigned_by_id=ai_user_id,
                            strategy=AIConfig.OFFICER_ASSIGNMENT_STRATEGY,
                            notes=f"Auto-assigned by AI using {AIConfig.OFFICER_ASSIGNMENT_STRATEGY} strategy (confidence: {overall_confidence:.0%})"
                        )
                        
                        result["status"] = "assigned_to_officer"
                        result["stages"]["officer_assignment"] = {
                            "officer_id": assignment_info["selected_officer"]["user_id"],
                            "officer_name": assignment_info["selected_officer"]["full_name"],
                            "strategy": assignment_info["strategy_used"],
                            "workload_score": assignment_info["workload_score"],
                            "active_reports": assignment_info["active_reports"]
                        }
                        
                        logger.info(
                            f"✅ Assigned to officer {assignment_info['selected_officer']['user_id']} "
                            f"({assignment_info['selected_officer']['full_name']}), "
                            f"status: ASSIGNED_TO_OFFICER"
                        )
                        
                except Exception as e:
                    logger.error(f"Officer auto-assignment error: {str(e)}", exc_info=True)
                    result["errors"].append({"stage": "officer_assignment", "error": str(e)})
                    # Don't fail the pipeline, department assignment is still valid
                    logger.info("Officer assignment failed, but department assignment succeeded")
            
            # Commit all changes
            await self.db.commit()
            
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            result["processing_time_seconds"] = round(processing_time, 2)
            
            logger.info(
                f"✅ Pipeline completed for report {report_id} "
                f"({processing_time:.2f}s, status: {result['status']})"
            )
            
            return result
            
        except Exception as e:
            logger.error(
                f"❌ Pipeline failed for report {report_id}: {str(e)}",
                exc_info=True
            )
            await self.db.rollback()
            
            result["status"] = "failed"
            result["errors"].append({"stage": "pipeline", "error": str(e)})
            
            # Always mark for manual review on failure
            try:
                await self._mark_for_review(report, "pipeline_failure")
                await self.db.commit()
            except:
                logger.critical(f"Failed to mark report {report_id} for review")
            
            return result
    
    async def _should_skip_processing(self, report) -> Optional[str]:
        """
        Check if report should skip AI processing
        Returns skip reason if should skip, None otherwise
        
        PRODUCTION-READY: Smart duplicate prevention using multiple checks
        """
        # Skip if already AI processed (unless force=True)
        if report.ai_processed_at:
            return "Already processed by AI"
        
        # Skip if manually classified by admin
        if report.classified_by_user_id:
            return "Manually classified by admin"
        
        # Skip if already marked as duplicate
        if report.is_duplicate:
            return f"Already marked as duplicate of report #{report.duplicate_of_report_id}"
        
        # Skip if department was manually assigned
        if report.department_id and report.status in [
            ReportStatus.ASSIGNED_TO_DEPARTMENT,
            ReportStatus.ASSIGNED_TO_OFFICER,
            ReportStatus.ACKNOWLEDGED,
            ReportStatus.IN_PROGRESS
        ]:
            return "Already manually assigned to department/officer"
        
        # Skip if report is in terminal states
        if report.status in [
            ReportStatus.RESOLVED,
            ReportStatus.CLOSED,
            ReportStatus.REJECTED,
            ReportStatus.DUPLICATE
        ]:
            return f"Report in terminal state: {report.status.value}"
        
        return None
    
    async def _record_status_change(
        self,
        report_id: int,
        old_status: ReportStatus,
        new_status: ReportStatus,
        user_id: Optional[int],
        notes: Optional[str] = None
    ):
        """Record status change in audit trail"""
        try:
            history_entry = ReportStatusHistory(
                report_id=report_id,
                old_status=old_status,
                new_status=new_status,
                changed_by_user_id=user_id,
                notes=notes or f"AI Pipeline: {old_status.value} → {new_status.value}",
                changed_at=datetime.utcnow()
            )
            self.db.add(history_entry)
            await self.db.flush()
            logger.info(f"📝 Recorded status change: {old_status.value} → {new_status.value}")
        except Exception as e:
            logger.error(f"Failed to record status history: {str(e)}")
            # Don't fail the pipeline if audit logging fails
    
    async def _mark_for_review(self, report, reason: str):
        """Mark report for manual admin review"""
        old_status = report.status
        
        await report_crud.update(self.db, report.id, ReportUpdate(
            needs_review=True,
            status=ReportStatus.PENDING_CLASSIFICATION,
            classification_notes=f"AI processing issue: {reason}",
            ai_processed_at=datetime.utcnow(),
            ai_model_version=AIConfig.AI_MODEL_VERSION
        ), commit=False)
        
        # Record in audit trail with AI Engine user
        ai_user_id = await self._get_system_user_id()
        await self._record_status_change(
            report.id,
            old_status,
            ReportStatus.PENDING_CLASSIFICATION,
            user_id=ai_user_id,
            notes=f"AI flagged for manual review: {reason}"
        )
    
    def _calculate_overall_confidence(
        self,
        category_result: Dict,
        severity_result: Dict,
        dept_result: Dict
    ) -> float:
        """
        Calculate overall confidence using weighted average
        Category is most important (50%), severity (30%), department (20%)
        
        This is more forgiving than harmonic mean and better suited for zero-shot models
        which typically produce 0.30-0.70 confidence scores.
        """
        category_conf = category_result.get("confidence", 0.5)
        severity_conf = severity_result.get("confidence", 0.5)
        dept_conf = dept_result.get("confidence", 0.5)
        
        # Weighted average using configured weights
        weights = AIConfig.CONFIDENCE_WEIGHTS
        weighted_confidence = (
            category_conf * weights["category"] +
            severity_conf * weights["severity"] +
            dept_conf * weights["department"]
        )
        
        return round(weighted_confidence, 2)
