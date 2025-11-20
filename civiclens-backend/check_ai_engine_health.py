"""
AI Engine Health Check Script
Diagnoses AI worker status and provides actionable insights
"""

import asyncio
import sys
from datetime import datetime, timedelta
from sqlalchemy import select, func
from app.core.database import AsyncSessionLocal, get_redis
from app.models.report import Report

async def check_ai_health():
    """Comprehensive AI Engine health check"""
    
    print("=" * 80)
    print("  AI ENGINE HEALTH CHECK - CIVICLENS")
    print("  " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("=" * 80)
    
    all_checks_passed = True
    
    # ========================================================================
    # 1. REDIS CONNECTION & HEARTBEAT
    # ========================================================================
    print("\n[1/5] Checking Redis Connection & AI Worker Heartbeat...")
    print("-" * 80)
    
    try:
        redis = await get_redis()
        await redis.ping()
        print("✅ Redis connection: OK")
        
        # Check heartbeat
        heartbeat = await redis.get("ai_worker:heartbeat")
        if heartbeat:
            # Handle both bytes and string
            heartbeat_str = heartbeat.decode() if isinstance(heartbeat, bytes) else heartbeat
            heartbeat_time = datetime.fromisoformat(heartbeat_str)
            time_diff = (datetime.utcnow() - heartbeat_time).total_seconds()
            
            if time_diff < 30:
                print(f"✅ AI Worker heartbeat: ACTIVE (last seen {int(time_diff)}s ago)")
                print(f"   Heartbeat timestamp: {heartbeat_time.isoformat()}")
            else:
                print(f"⚠️  AI Worker heartbeat: STALE (last seen {int(time_diff)}s ago)")
                print(f"   Last heartbeat: {heartbeat_time.isoformat()}")
                print("   Action: Worker may have crashed, restart required")
                all_checks_passed = False
        else:
            print("❌ AI Worker heartbeat: NOT FOUND")
            print("   Action: AI worker is not running")
            print("   Start with: python -m app.workers.ai_worker")
            all_checks_passed = False
        
        # Check queue lengths
        queue_len = await redis.llen("queue:ai_processing")
        failed_len = await redis.llen("queue:ai_failed")
        
        print(f"\n📊 Queue Status:")
        print(f"   Processing queue: {queue_len} reports")
        print(f"   Failed queue: {failed_len} reports")
        
        if failed_len > 0:
            print(f"   ⚠️  {failed_len} reports failed processing - review required")
        
    except Exception as e:
        print(f"❌ Redis connection failed: {str(e)}")
        print("   Action: Start Redis service")
        all_checks_passed = False
        return False
    
    # ========================================================================
    # 2. DATABASE CONNECTION
    # ========================================================================
    print("\n[2/5] Checking Database Connection...")
    print("-" * 80)
    
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(func.count(Report.id)))
            total_reports = result.scalar()
            print(f"✅ Database connection: OK ({total_reports} total reports)")
    except Exception as e:
        print(f"❌ Database connection failed: {str(e)}")
        all_checks_passed = False
        return False
    
    # ========================================================================
    # 3. AI PROCESSING STATISTICS
    # ========================================================================
    print("\n[3/5] Checking AI Processing Statistics...")
    print("-" * 80)
    
    try:
        async with AsyncSessionLocal() as db:
            # Total AI processed
            ai_processed_query = select(func.count(Report.id)).where(
                Report.ai_processed_at.isnot(None)
            )
            result = await db.execute(ai_processed_query)
            ai_processed = result.scalar() or 0
            
            # Processed today
            today_query = select(func.count(Report.id)).where(
                Report.ai_processed_at.isnot(None),
                func.date(Report.ai_processed_at) == datetime.utcnow().date()
            )
            result = await db.execute(today_query)
            processed_today = result.scalar() or 0
            
            # Pending processing
            pending_query = select(func.count(Report.id)).where(
                Report.ai_processed_at.is_(None),
                Report.status == 'received',
                Report.classified_by_user_id.is_(None),
                Report.is_duplicate == False
            )
            result = await db.execute(pending_query)
            pending = result.scalar() or 0
            
            # Needs review
            review_query = select(func.count(Report.id)).where(
                Report.needs_review == True
            )
            result = await db.execute(review_query)
            needs_review = result.scalar() or 0
            
            print(f"📊 AI Processing Statistics:")
            print(f"   Total processed: {ai_processed} reports")
            print(f"   Processed today: {processed_today} reports")
            print(f"   Pending processing: {pending} reports")
            print(f"   Needs manual review: {needs_review} reports")
            
            if pending > 0 and not heartbeat:
                print(f"   ⚠️  {pending} reports waiting but worker not running!")
                all_checks_passed = False
            
    except Exception as e:
        print(f"❌ Failed to fetch statistics: {str(e)}")
        all_checks_passed = False
    
    # ========================================================================
    # 4. AI MODELS STATUS
    # ========================================================================
    print("\n[4/5] Checking AI Models...")
    print("-" * 80)
    
    try:
        from app.services.ai.category_classifier import CategoryClassifier
        from app.services.ai.duplicate_detector import DuplicateDetector
        
        # Try to load models
        print("⏳ Loading models (this may take a moment)...")
        classifier = CategoryClassifier()
        detector = DuplicateDetector()
        
        print("✅ AI Models: LOADED")
        print("   - Category Classifier: facebook/bart-large-mnli")
        print("   - Duplicate Detector: sentence-transformers/all-MiniLM-L6-v2")
        
    except Exception as e:
        print(f"❌ AI Models failed to load: {str(e)}")
        print("   Action: Download models with: python -m app.ml.download_models")
        all_checks_passed = False
    
    # ========================================================================
    # 5. SYSTEM HEALTH SUMMARY
    # ========================================================================
    print("\n[5/5] System Health Summary...")
    print("=" * 80)
    
    if all_checks_passed and heartbeat:
        print("✅ ALL SYSTEMS OPERATIONAL")
        print("\n🎉 AI Engine is healthy and ready for processing!")
        return True
    else:
        print("⚠️  ISSUES DETECTED")
        print("\n🔧 Actions Required:")
        
        if not heartbeat:
            print("   1. Start AI Worker: python -m app.workers.ai_worker")
        
        if failed_len > 0:
            print(f"   2. Review {failed_len} failed reports in Redis queue")
        
        if pending > 0 and heartbeat:
            print(f"   3. Queue {pending} pending reports for processing")
        
        print("\n📝 For detailed logs, check: logs/ai_worker.log")
        return False


async def main():
    """Run health check"""
    try:
        success = await check_ai_health()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⏸️  Health check interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Health check failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
