"""
Start all CivicLens background workers in separate processes
Run this script to start all monitoring and automation workers
"""

import asyncio
import logging
import multiprocessing
import sys
import time
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def run_ai_worker():
    """Run AI processing worker"""
    from app.workers.ai_worker import run_worker
    logger.info("🤖 Starting AI Worker...")
    asyncio.run(run_worker())


def run_stale_task_monitor():
    """Run stale task detection worker (daily)"""
    from app.workers.stale_task_monitor import run_stale_task_monitor
    logger.info("🔍 Starting Stale Task Monitor (runs daily)...")
    asyncio.run(run_stale_task_monitor())


def run_sla_monitor():
    """Run SLA monitoring worker (hourly)"""
    from app.workers.sla_monitor import run_sla_monitor
    logger.info("🕐 Starting SLA Monitor (runs hourly)...")
    asyncio.run(run_sla_monitor())


def run_metrics_calculator():
    """Run officer metrics calculator (weekly)"""
    from app.workers.metrics_calculator import run_metrics_calculator
    logger.info("📊 Starting Metrics Calculator (runs weekly)...")
    asyncio.run(run_metrics_calculator())


def main():
    """Start all workers as separate processes"""
    logger.info("=" * 70)
    logger.info("CIVICLENS BACKGROUND WORKERS")
    logger.info(f"Starting at: {datetime.now().isoformat()}")
    logger.info("=" * 70)
    
    # Define workers
    workers = [
        ("AI Worker", run_ai_worker),
        ("Stale Task Monitor", run_stale_task_monitor),
        ("SLA Monitor", run_sla_monitor),
        ("Metrics Calculator", run_metrics_calculator),
    ]
    
    processes = []
    
    try:
        # Start each worker in a separate process
        for name, worker_func in workers:
            process = multiprocessing.Process(
                target=worker_func,
                name=name,
                daemon=True
            )
            process.start()
            processes.append((name, process))
            logger.info(f"✅ Started {name} (PID: {process.pid})")
            time.sleep(1)  # Stagger starts
        
        logger.info("=" * 70)
        logger.info(f"All {len(processes)} workers started successfully!")
        logger.info("Press Ctrl+C to stop all workers")
        logger.info("=" * 70)
        
        # Monitor processes
        while True:
            time.sleep(10)
            
            # Check if any process died
            for name, process in processes:
                if not process.is_alive():
                    logger.error(f"❌ Worker '{name}' died! Restarting...")
                    # Restart the process
                    for worker_name, worker_func in workers:
                        if worker_name == name:
                            new_process = multiprocessing.Process(
                                target=worker_func,
                                name=name,
                                daemon=True
                            )
                            new_process.start()
                            # Update processes list
                            processes = [(n, p if n != name else new_process) 
                                        for n, p in processes]
                            logger.info(f"✅ Restarted {name} (PID: {new_process.pid})")
                            break
    
    except KeyboardInterrupt:
        logger.info("\n" + "=" * 70)
        logger.info("Shutting down all workers...")
        logger.info("=" * 70)
        
        # Terminate all processes
        for name, process in processes:
            if process.is_alive():
                logger.info(f"Stopping {name}...")
                process.terminate()
                process.join(timeout=5)
                
                if process.is_alive():
                    logger.warning(f"Force killing {name}...")
                    process.kill()
                    process.join()
        
        logger.info("All workers stopped successfully")
        sys.exit(0)
    
    except Exception as e:
        logger.error(f"Fatal error in worker manager: {str(e)}", exc_info=True)
        
        # Cleanup on error
        for name, process in processes:
            if process.is_alive():
                process.terminate()
                process.join(timeout=5)
        
        sys.exit(1)


if __name__ == "__main__":
    # Ensure multiprocessing works correctly
    multiprocessing.set_start_method('spawn', force=True)
    main()
