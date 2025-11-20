"""
AI Worker Startup Script
Ensures logs directory exists and starts the AI worker
"""

import os
import asyncio
import sys

# Create logs directory if it doesn't exist
os.makedirs('logs', exist_ok=True)

# Import and run the worker
from app.workers.ai_worker import process_ai_queue

if __name__ == "__main__":
    print("Starting AI Worker...")
    print("Logs will be written to: logs/ai_worker.log")
    print("Press Ctrl+C to stop gracefully")
    print()
    
    try:
        asyncio.run(process_ai_queue())
    except KeyboardInterrupt:
        print("\nAI Worker stopped by user")
        sys.exit(0)
    except Exception as e:
        print(f"\nAI Worker crashed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
