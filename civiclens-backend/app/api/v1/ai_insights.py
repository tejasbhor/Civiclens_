"""
AI Insights & Predictions API
Provides duplicate clusters, AI metrics, and pipeline monitoring
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.core.database import get_db, get_redis
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.report import Report, ReportStatus, ReportSeverity, ReportCategory
from app.models.report_status_history import ReportStatusHistory
from app.core.exceptions import ForbiddenException

router = APIRouter(prefix="/ai-insights", tags=["AI Insights"])


# ============================================================================
# RESPONSE MODELS
# ============================================================================

class DuplicateCluster(BaseModel):
    """A cluster of duplicate reports"""
    primary_report_id: int
    primary_report_number: str | None
    primary_title: str
    primary_status: str
    primary_created_at: datetime
    duplicate_count: int
    duplicates: List[Dict[str, Any]]
    location: Dict[str, float]
    category: str | None
    severity: str
    total_reports: int  # Primary + duplicates


class AIMetrics(BaseModel):
    """AI Pipeline Performance Metrics"""
    total_processed: int
    processed_today: int
    processed_this_week: int
    avg_confidence: float
    high_confidence_count: int  # >= 0.70 (calibrated)
    medium_confidence_count: int  # 0.50-0.70 (calibrated)
    low_confidence_count: int  # < 0.50 (calibrated)
    needs_review_count: int
    duplicate_detection_count: int
    classification_accuracy: float | None
    avg_processing_time: float | None


class PipelineStatus(BaseModel):
    """Real-time AI Pipeline Status"""
    worker_status: str  # "running", "stopped", "unknown"
    queue_length: int
    failed_queue_length: int
    last_heartbeat: str | None
    reports_in_queue: List[Dict[str, Any]]


class CategoryInsights(BaseModel):
    """Category-wise AI insights"""
    category: str
    total_reports: int
    ai_classified: int
    manual_classified: int
    avg_confidence: float
    accuracy_rate: float | None


# ============================================================================
# DUPLICATE CLUSTERS
# ============================================================================

@router.get("/duplicate-clusters", response_model=List[DuplicateCluster])
async def get_duplicate_clusters(
    status: Optional[str] = Query(None, description="Filter by status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    min_duplicates: int = Query(1, ge=1, description="Minimum number of duplicates"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get clusters of duplicate reports
    Groups reports by their duplicate_of_report_id
    """
    
    # Simplified approach: Get all non-duplicate reports, then count their duplicates
    # First, get all potential primary reports
    from sqlalchemy.orm import aliased
    
    primary_query = select(Report).where(
        Report.is_duplicate == False
    )
    
    # Apply filters
    if status:
        primary_query = primary_query.where(Report.status == status)
    if category:
        primary_query = primary_query.where(Report.category == category)
    
    result = await db.execute(primary_query)
    potential_primaries = result.scalars().all()
    
    # Now count duplicates for each and filter by min_duplicates
    primary_reports = []
    for report in potential_primaries:
        # Count duplicates
        count_query = select(func.count(Report.id)).where(
            Report.duplicate_of_report_id == report.id
        )
        count_result = await db.execute(count_query)
        dup_count = count_result.scalar() or 0
        
        if dup_count >= min_duplicates:
            primary_reports.append((report, dup_count))
    
    # Sort by duplicate count descending
    primary_reports.sort(key=lambda x: x[1], reverse=True)
    primary_reports = primary_reports[:limit]
    
    clusters = []
    for primary_report, dup_count in primary_reports:
        # Get all duplicates for this primary report
        duplicates_query = select(Report).where(
            Report.duplicate_of_report_id == primary_report.id
        ).order_by(Report.created_at.desc())
        
        duplicates_result = await db.execute(duplicates_query)
        duplicates = duplicates_result.scalars().all()
        
        cluster = DuplicateCluster(
            primary_report_id=primary_report.id,
            primary_report_number=primary_report.report_number,
            primary_title=primary_report.title,
            primary_status=primary_report.status.value,
            primary_created_at=primary_report.created_at,
            duplicate_count=len(duplicates),
            duplicates=[
                {
                    "id": dup.id,
                    "report_number": dup.report_number,
                    "title": dup.title,
                    "status": dup.status.value,
                    "created_at": dup.created_at.isoformat(),
                    "user_id": dup.user_id,
                    "ai_confidence": dup.ai_confidence,
                }
                for dup in duplicates
            ],
            location={
                "latitude": float(primary_report.latitude),
                "longitude": float(primary_report.longitude)
            },
            category=primary_report.category,
            severity=primary_report.severity.value,
            total_reports=len(duplicates) + 1
        )
        clusters.append(cluster)
    
    return clusters


# ============================================================================
# AI METRICS
# ============================================================================

@router.get("/metrics", response_model=AIMetrics)
async def get_ai_metrics(
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get AI pipeline performance metrics
    """
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    today = datetime.utcnow().date()
    week_ago = datetime.utcnow() - timedelta(days=7)
    
    # Total processed
    total_query = select(func.count(Report.id)).where(
        Report.ai_processed_at.isnot(None)
    )
    total_result = await db.execute(total_query)
    total_processed = total_result.scalar() or 0
    
    # Processed today
    today_query = select(func.count(Report.id)).where(
        and_(
            Report.ai_processed_at.isnot(None),
            func.date(Report.ai_processed_at) == today
        )
    )
    today_result = await db.execute(today_query)
    processed_today = today_result.scalar() or 0
    
    # Processed this week
    week_query = select(func.count(Report.id)).where(
        and_(
            Report.ai_processed_at.isnot(None),
            Report.ai_processed_at >= week_ago
        )
    )
    week_result = await db.execute(week_query)
    processed_this_week = week_result.scalar() or 0
    
    # Average confidence
    avg_conf_query = select(func.avg(Report.ai_confidence)).where(
        and_(
            Report.ai_processed_at.isnot(None),
            Report.ai_processed_at >= cutoff_date
        )
    )
    avg_conf_result = await db.execute(avg_conf_query)
    avg_confidence = avg_conf_result.scalar() or 0.0
    
    # Confidence distribution (calibrated thresholds)
    high_conf_query = select(func.count(Report.id)).where(
        and_(
            Report.ai_confidence >= 0.70,  # Calibrated: was 0.85
            Report.ai_processed_at >= cutoff_date
        )
    )
    high_conf_result = await db.execute(high_conf_query)
    high_confidence_count = high_conf_result.scalar() or 0
    
    medium_conf_query = select(func.count(Report.id)).where(
        and_(
            Report.ai_confidence >= 0.50,  # Calibrated: was 0.60
            Report.ai_confidence < 0.70,   # Calibrated: was 0.85
            Report.ai_processed_at >= cutoff_date
        )
    )
    medium_conf_result = await db.execute(medium_conf_query)
    medium_confidence_count = medium_conf_result.scalar() or 0
    
    low_conf_query = select(func.count(Report.id)).where(
        and_(
            Report.ai_confidence < 0.50,  # Calibrated: was 0.60
            Report.ai_processed_at >= cutoff_date
        )
    )
    low_conf_result = await db.execute(low_conf_query)
    low_confidence_count = low_conf_result.scalar() or 0
    
    # Needs review
    needs_review_query = select(func.count(Report.id)).where(
        and_(
            Report.needs_review == True,
            Report.ai_processed_at >= cutoff_date
        )
    )
    needs_review_result = await db.execute(needs_review_query)
    needs_review_count = needs_review_result.scalar() or 0
    
    # Duplicate detection
    duplicate_query = select(func.count(Report.id)).where(
        and_(
            Report.is_duplicate == True,
            Report.ai_processed_at >= cutoff_date
        )
    )
    duplicate_result = await db.execute(duplicate_query)
    duplicate_detection_count = duplicate_result.scalar() or 0
    
    return AIMetrics(
        total_processed=total_processed,
        processed_today=processed_today,
        processed_this_week=processed_this_week,
        avg_confidence=round(avg_confidence, 3),
        high_confidence_count=high_confidence_count,
        medium_confidence_count=medium_confidence_count,
        low_confidence_count=low_confidence_count,
        needs_review_count=needs_review_count,
        duplicate_detection_count=duplicate_detection_count,
        classification_accuracy=None,  # TODO: Calculate based on manual corrections
        avg_processing_time=None  # TODO: Track in pipeline
    )


# ============================================================================
# PIPELINE STATUS
# ============================================================================

@router.get("/pipeline-status", response_model=PipelineStatus)
async def get_pipeline_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get real-time AI pipeline status
    """
    
    try:
        redis = await get_redis()
        
        # Check worker heartbeat
        heartbeat = await redis.get("ai_worker:heartbeat")
        worker_status = "running" if heartbeat else "stopped"
        last_heartbeat = heartbeat.decode() if heartbeat else None
        
        # Queue lengths
        queue_length = await redis.llen("queue:ai_processing")
        failed_queue_length = await redis.llen("queue:ai_failed")
        
        # Get reports in queue (first 10)
        queue_items = await redis.lrange("queue:ai_processing", 0, 9)
        reports_in_queue = []
        
        for item in queue_items:
            report_id = int(item.decode())
            report = await db.get(Report, report_id)
            if report:
                reports_in_queue.append({
                    "id": report.id,
                    "report_number": report.report_number,
                    "title": report.title,
                    "status": report.status.value,
                    "created_at": report.created_at.isoformat()
                })
        
        return PipelineStatus(
            worker_status=worker_status,
            queue_length=queue_length,
            failed_queue_length=failed_queue_length,
            last_heartbeat=last_heartbeat,
            reports_in_queue=reports_in_queue
        )
        
    except Exception as e:
        return PipelineStatus(
            worker_status="unknown",
            queue_length=0,
            failed_queue_length=0,
            last_heartbeat=None,
            reports_in_queue=[]
        )


# ============================================================================
# CATEGORY INSIGHTS
# ============================================================================

@router.get("/category-insights", response_model=List[CategoryInsights])
async def get_category_insights(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get AI performance insights by category
    """
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    insights = []
    
    for category in ReportCategory:
        # Total reports in category
        total_query = select(func.count(Report.id)).where(
            and_(
                Report.category == category.value,
                Report.created_at >= cutoff_date
            )
        )
        total_result = await db.execute(total_query)
        total_reports = total_result.scalar() or 0
        
        if total_reports == 0:
            continue
        
        # AI classified
        ai_query = select(func.count(Report.id)).where(
            and_(
                Report.category == category.value,
                Report.ai_processed_at.isnot(None),
                Report.created_at >= cutoff_date
            )
        )
        ai_result = await db.execute(ai_query)
        ai_classified = ai_result.scalar() or 0
        
        # Manual classified
        manual_query = select(func.count(Report.id)).where(
            and_(
                Report.category == category.value,
                Report.classified_by_user_id.isnot(None),
                Report.created_at >= cutoff_date
            )
        )
        manual_result = await db.execute(manual_query)
        manual_classified = manual_result.scalar() or 0
        
        # Average confidence
        avg_conf_query = select(func.avg(Report.ai_confidence)).where(
            and_(
                Report.category == category.value,
                Report.ai_processed_at.isnot(None),
                Report.created_at >= cutoff_date
            )
        )
        avg_conf_result = await db.execute(avg_conf_query)
        avg_confidence = avg_conf_result.scalar() or 0.0
        
        insights.append(CategoryInsights(
            category=category.value,
            total_reports=total_reports,
            ai_classified=ai_classified,
            manual_classified=manual_classified,
            avg_confidence=round(avg_confidence, 3),
            accuracy_rate=None  # TODO: Calculate based on corrections
        ))
    
    return insights


# ============================================================================
# DUPLICATE ACTIONS
# ============================================================================

class MergeDuplicatesRequest(BaseModel):
    primary_report_id: int
    duplicate_report_ids: List[int]
    notes: Optional[str] = None


@router.post("/merge-duplicates")
async def merge_duplicates(
    request: MergeDuplicatesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Merge duplicate reports into a primary report
    """
    
    # Verify primary report exists
    primary = await db.get(Report, request.primary_report_id)
    if not primary:
        raise ForbiddenException("Primary report not found")
    
    merged_count = 0
    
    for dup_id in request.duplicate_report_ids:
        duplicate = await db.get(Report, dup_id)
        if duplicate and duplicate.id != primary.id:
            # Mark as duplicate
            duplicate.is_duplicate = True
            duplicate.duplicate_of_report_id = primary.id
            duplicate.status = ReportStatus.DUPLICATE
            
            # Record in history
            history = ReportStatusHistory(
                report_id=duplicate.id,
                old_status=duplicate.status,
                new_status=ReportStatus.DUPLICATE,
                changed_by_user_id=current_user.id,
                notes=f"Merged into report #{primary.report_number}: {request.notes or 'Admin merged duplicates'}"
            )
            db.add(history)
            merged_count += 1
    
    await db.commit()
    
    return {
        "success": True,
        "merged_count": merged_count,
        "primary_report_id": primary.id,
        "message": f"Successfully merged {merged_count} duplicate reports"
    }


class UnmarkDuplicateRequest(BaseModel):
    report_id: int
    notes: Optional[str] = None


@router.post("/unmark-duplicate")
async def unmark_duplicate(
    request: UnmarkDuplicateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Unmark a report as duplicate (false positive)
    """
    
    report = await db.get(Report, request.report_id)
    if not report:
        raise ForbiddenException("Report not found")
    
    old_status = report.status
    
    # Unmark duplicate
    report.is_duplicate = False
    report.duplicate_of_report_id = None
    report.status = ReportStatus.RECEIVED
    report.needs_review = True  # Flag for re-classification
    
    # Record in history
    history = ReportStatusHistory(
        report_id=report.id,
        old_status=old_status,
        new_status=ReportStatus.RECEIVED,
        changed_by_user_id=current_user.id,
        notes=f"Unmarked as duplicate (false positive): {request.notes or 'Admin correction'}"
    )
    db.add(history)
    
    await db.commit()
    
    return {
        "success": True,
        "report_id": report.id,
        "message": "Report unmarked as duplicate and flagged for re-classification"
    }


# ============================================================================
# MANUAL AI PROCESSING ACTIONS
# ============================================================================

class ProcessReportsRequest(BaseModel):
    report_ids: List[int]
    force: bool = False  # Force reprocessing even if already processed


@router.get("/pending-reports")
async def get_pending_reports(
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get reports pending AI processing
    Returns ONLY reports in RECEIVED status that haven't been AI processed
    
    Smart filtering:
    - Status must be RECEIVED (initial state)
    - Not yet processed by AI (ai_processed_at is NULL)
    - Not manually classified (classified_by_user_id is NULL)
    - Not marked as duplicate (is_duplicate is False)
    """
    
    query = select(Report).where(
        Report.status == ReportStatus.RECEIVED,  # ONLY RECEIVED status
        Report.ai_processed_at.is_(None),  # Not yet AI processed
        Report.classified_by_user_id.is_(None),  # Not manually classified
        Report.is_duplicate == False  # Not a duplicate
    ).order_by(Report.created_at.desc()).limit(limit)
    
    result = await db.execute(query)
    reports = result.scalars().all()
    
    return [
        {
            "id": r.id,
            "report_number": r.report_number,
            "title": r.title,
            "status": r.status.value,
            "severity": r.severity.value,
            "category": r.category,
            "created_at": r.created_at.isoformat(),
            "needs_review": r.needs_review,
            "classified_by_user_id": r.classified_by_user_id,
            "department_id": r.department_id,
        }
        for r in reports
    ]


@router.post("/process-reports")
async def process_reports_manually(
    request: ProcessReportsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually trigger AI processing for selected reports
    
    Smart Processing Rules:
    1. ONLY processes reports in RECEIVED status
    2. Skips already AI processed reports
    3. Skips manually classified reports
    4. Skips duplicates
    5. Skips terminal states (RESOLVED, CLOSED, REJECTED)
    6. Records admin action in audit trail
    
    Returns detailed results with skip reasons
    """
    
    from app.core.database import get_redis
    
    try:
        redis = await get_redis()
        
        queued_count = 0
        skipped_count = 0
        errors = []
        skip_reasons = {}
        
        for report_id in request.report_ids:
            try:
                # Verify report exists
                report = await db.get(Report, report_id)
                if not report:
                    errors.append({"report_id": report_id, "error": "Report not found"})
                    continue
                
                # Smart validation checks
                skip_reason = None
                
                if not request.force:
                    # Check 1: Must be in RECEIVED status
                    if report.status != ReportStatus.RECEIVED:
                        skip_reason = f"Status is {report.status.value}, not RECEIVED"
                    
                    # Check 2: Not already AI processed
                    elif report.ai_processed_at:
                        skip_reason = "Already AI processed"
                    
                    # Check 3: Not manually classified
                    elif report.classified_by_user_id:
                        skip_reason = "Manually classified by admin"
                    
                    # Check 4: Not a duplicate
                    elif report.is_duplicate:
                        skip_reason = f"Marked as duplicate of report #{report.duplicate_of_report_id}"
                    
                    # Check 5: Not in terminal states
                    elif report.status in [
                        ReportStatus.RESOLVED,
                        ReportStatus.CLOSED,
                        ReportStatus.REJECTED
                    ]:
                        skip_reason = f"In terminal state: {report.status.value}"
                
                if skip_reason:
                    skipped_count += 1
                    skip_reasons[report_id] = skip_reason
                    continue
                
                # Queue for AI processing
                await redis.lpush("queue:ai_processing", str(report_id))
                queued_count += 1
                
                # Record admin action in audit trail
                history = ReportStatusHistory(
                    report_id=report.id,
                    old_status=report.status,
                    new_status=report.status,  # Status doesn't change yet
                    changed_by_user_id=current_user.id,
                    notes=f"Admin queued report for AI processing via Actions tab"
                )
                db.add(history)
                
            except Exception as e:
                errors.append({"report_id": report_id, "error": str(e)})
        
        # Commit audit trail entries
        await db.commit()
        
        return {
            "success": True,
            "queued_count": queued_count,
            "skipped_count": skipped_count,
            "total_requested": len(request.report_ids),
            "skip_reasons": skip_reasons,
            "errors": errors,
            "message": f"Queued {queued_count} reports for AI processing. Skipped {skipped_count}."
        }
        
    except Exception as e:
        return {
            "success": False,
            "queued_count": 0,
            "skipped_count": 0,
            "total_requested": len(request.report_ids),
            "skip_reasons": {},
            "errors": [{"error": str(e)}],
            "message": f"Failed to queue reports: {str(e)}"
        }


@router.post("/reprocess-report/{report_id}")
async def reprocess_single_report(
    report_id: int,
    force: bool = Query(False, description="Force reprocessing"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reprocess a single report through AI pipeline
    
    Smart Validation:
    - Checks if report is in RECEIVED status
    - Validates report hasn't been manually processed
    - Can force reprocess with force=true
    - Records admin action in audit trail
    """
    
    from app.services.ai_pipeline_service import AIProcessingPipeline
    
    try:
        # Verify report exists
        report = await db.get(Report, report_id)
        if not report:
            raise ForbiddenException("Report not found")
        
        # Validate report status
        if not force and report.status != ReportStatus.RECEIVED:
            return {
                "success": False,
                "report_id": report_id,
                "error": f"Report status is {report.status.value}, not RECEIVED. Use force=true to override.",
                "message": "Report not in processable state"
            }
        
        # Record admin action
        history = ReportStatusHistory(
            report_id=report.id,
            old_status=report.status,
            new_status=report.status,
            changed_by_user_id=current_user.id,
            notes=f"Admin triggered AI reprocessing (force={force})"
        )
        db.add(history)
        await db.commit()
        
        # Process with AI pipeline
        pipeline = AIProcessingPipeline(db)
        result = await pipeline.process_report(report_id, force=force)
        
        return {
            "success": True,
            "report_id": report_id,
            "result": result,
            "message": "Report processed successfully"
        }
        
    except Exception as e:
        return {
            "success": False,
            "report_id": report_id,
            "error": str(e),
            "message": f"Failed to process report: {str(e)}"
        }
