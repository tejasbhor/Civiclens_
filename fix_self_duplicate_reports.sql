-- Fix Self-Duplicate Reports
-- This script identifies and fixes reports that were incorrectly marked as duplicates of themselves

-- Step 1: Identify self-duplicate reports
SELECT 
    id,
    report_number,
    title,
    status,
    is_duplicate,
    duplicate_of_report_id,
    ai_confidence,
    ai_processed_at,
    created_at
FROM reports
WHERE is_duplicate = true 
  AND duplicate_of_report_id = id
ORDER BY created_at DESC;

-- Step 2: Reset self-duplicate reports to RECEIVED status
-- This allows them to be reprocessed by the AI worker
UPDATE reports
SET 
    is_duplicate = false,
    duplicate_of_report_id = NULL,
    status = 'RECEIVED',
    ai_processed_at = NULL,
    ai_confidence = NULL,
    ai_model_version = NULL,
    needs_review = false,
    status_updated_at = NOW()
WHERE is_duplicate = true 
  AND duplicate_of_report_id = id;

-- Step 3: Add audit trail entry for the fix
INSERT INTO report_status_history (
    report_id,
    old_status,
    new_status,
    changed_by_user_id,
    notes,
    changed_at
)
SELECT 
    id,
    'DUPLICATE',
    'RECEIVED',
    NULL,  -- System action
    'Fixed self-duplicate bug - reset for reprocessing',
    NOW()
FROM reports
WHERE is_duplicate = true 
  AND duplicate_of_report_id = id;

-- Step 4: Verify the fix
SELECT 
    COUNT(*) as fixed_reports
FROM reports
WHERE is_duplicate = false 
  AND status = 'RECEIVED'
  AND ai_processed_at IS NULL;

-- Step 5: Re-queue fixed reports for AI processing (optional)
-- This requires Redis access, run from Python:
/*
from app.core.database import get_redis
import asyncio

async def requeue_fixed_reports():
    redis = await get_redis()
    
    # Get all reports that need reprocessing
    query = "SELECT id FROM reports WHERE status = 'RECEIVED' AND ai_processed_at IS NULL"
    # Execute query and get report IDs
    
    for report_id in report_ids:
        await redis.lpush("queue:ai_processing", str(report_id))
        print(f"Re-queued report {report_id}")

asyncio.run(requeue_fixed_reports())
*/

-- Alternative: Manual re-queue from backend
-- Run this in your Python backend:
/*
from app.api.v1.ai_insights import aiInsightsApi
from app.core.database import AsyncSessionLocal

async def requeue_all_received():
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        from app.models.report import Report, ReportStatus
        
        query = select(Report.id).where(
            Report.status == ReportStatus.RECEIVED,
            Report.ai_processed_at.is_(None)
        )
        result = await db.execute(query)
        report_ids = [r[0] for r in result.all()]
        
        # Use the existing API to queue them
        result = await aiInsightsApi.processReports(report_ids, force=False)
        print(f"Queued {result['queued_count']} reports")
        print(f"Skipped {result['skipped_count']} reports")

import asyncio
asyncio.run(requeue_all_received())
*/
