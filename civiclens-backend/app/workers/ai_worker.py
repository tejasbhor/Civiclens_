"""
AI Background Worker
Processes queue:ai_processing Redis queue
Runs AI pipeline on newly created reports
"""

import asyncio
import logging
from datetime import datetime
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, get_redis
from app.services.ai_pipeline_service import AIProcessingPipeline

# Professional logging configuration for government application
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | AI-ENGINE | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


async def process_ai_queue():
    """
    Main worker loop - processes AI queue continuously
    """
    # Professional startup banner
    logger.info("=" * 80)
    logger.info("  AI ENGINE - RANCHI MUNICIPAL CORPORATION")
    logger.info("  Automated Report Classification & Assignment System")
    logger.info("  Version: 1.0.0 | Environment: Production")
    logger.info("=" * 80)
    
    try:
        redis = await get_redis()
        await redis.ping()
        logger.info("[SYSTEM] Redis message queue connected successfully")
    except Exception as e:
        logger.error(f"[SYSTEM] Redis connection failed: {str(e)}")
        logger.error("[SYSTEM] Please verify:")
        logger.error("[SYSTEM]   1. Redis service is running")
        logger.error("[SYSTEM]   2. REDIS_URL configuration is correct")
        logger.error("[SYSTEM]   3. Network connectivity is available")
        return
    
    logger.info("[SYSTEM] AI Engine initialized and ready")
    logger.info("[SYSTEM] Monitoring queue: ai_processing")
    logger.info("[SYSTEM] Awaiting reports for processing...")
    logger.info("-" * 80)
    
    # Heartbeat for health checks
    async def update_heartbeat():
        while True:
            try:
                await redis.set(
                    "ai_worker:heartbeat",
                    datetime.utcnow().isoformat(),
                    ex=60  # Expire after 60 seconds
                )
                await asyncio.sleep(10)
            except Exception as e:
                logger.error(f"Heartbeat error: {e}")
                await asyncio.sleep(10)
    
    # Start heartbeat task
    heartbeat_task = asyncio.create_task(update_heartbeat())
    
    try:
        while True:
            try:
                # Blocking pop from queue (5 second timeout)
                result = await redis.brpop("queue:ai_processing", timeout=5)
                
                if result:
                    _, report_id_data = result
                    
                    # Handle both bytes and string (Redis can return either)
                    if isinstance(report_id_data, bytes):
                        report_id = int(report_id_data.decode())
                    else:
                        report_id = int(report_id_data)
                    
                    # Process in new database session
                    async with AsyncSessionLocal() as db:
                        pipeline = AIProcessingPipeline(db)
                        
                        try:
                            # Get report number for professional logging
                            from app.models.report import Report
                            report_result = await db.execute(
                                select(Report.report_number).where(Report.id == report_id)
                            )
                            report_number = report_result.scalar() or f"ID-{report_id}"
                            
                            logger.info("")
                            logger.info(f"[PROCESSING] Report: {report_number} (ID: {report_id})")
                            logger.info(f"[PROCESSING] Timestamp: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
                            
                            result = await pipeline.process_report(report_id)
                            
                            # Professional completion log
                            status_indicator = {
                                'classified': 'SUCCESS',
                                'assigned_to_department': 'SUCCESS',
                                'assigned_to_officer': 'SUCCESS',
                                'duplicate': 'WARNING',
                                'needs_review': 'REVIEW'
                            }.get(result['status'], 'SUCCESS')
                            
                            logger.info(f"[COMPLETE] [{status_indicator}] Report: {report_number} | Status: {result['status'].upper()}")
                            if result.get('overall_confidence'):
                                logger.info(f"[COMPLETE] Confidence: {result['overall_confidence']:.2%} | Processing Time: {result.get('processing_time_seconds', 0):.2f}s")
                            logger.info("-" * 80)
                            
                            # Log metrics
                            await redis.hincrby("ai_metrics:daily", result['status'], 1)
                            
                        except Exception as e:
                            logger.error("")
                            logger.error(f"[ERROR] Report: {report_number} (ID: {report_id})")
                            logger.error(f"[ERROR] Failed to process: {str(e)}")
                            logger.error(f"[ERROR] Moving to failed queue for manual review")
                            logger.error("-" * 80)
                            
                            # Move to dead letter queue for manual investigation
                            await redis.lpush("queue:ai_failed", str(report_id))
                            await redis.hincrby("ai_metrics:daily", "failed", 1)
                
                # Small sleep to prevent CPU spinning
                await asyncio.sleep(0.1)
                
            except KeyboardInterrupt:
                logger.info("")
                logger.info("[SYSTEM] Shutdown signal received")
                logger.info("[SYSTEM] Gracefully stopping AI Engine...")
                break
                
            except Exception as e:
                logger.error(f"[SYSTEM] Worker error: {str(e)}")
                logger.error(f"[SYSTEM] Retrying in 1 second...")
                await asyncio.sleep(1)  # Back off on error
    
    finally:
        heartbeat_task.cancel()
        logger.info("[SYSTEM] AI Engine stopped")
        logger.info("=" * 80)


if __name__ == "__main__":
    asyncio.run(process_ai_queue())
