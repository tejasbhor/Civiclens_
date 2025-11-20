# 🤖 How to Start the AI Worker

## Quick Start Command

**Open a NEW terminal/PowerShell window** and run:

```powershell
cd D:\Civiclens\civiclens-backend
D:\Civiclens\.venv\Scripts\python.exe -m app.workers.ai_worker
```

## What You Should See

If successful, you'll see:

```
================================================================================
  AI ENGINE - NAVI MUMBAI MUNICIPAL CORPORATION
  Automated Report Classification & Assignment System
  Version: 1.0.0 | Environment: Production
================================================================================
[SYSTEM] Redis message queue connected successfully
[SYSTEM] AI Engine initialized and ready
[SYSTEM] Monitoring queue: ai_processing
[SYSTEM] Awaiting reports for processing...
--------------------------------------------------------------------------------
```

## Check Status

After 10 seconds, refresh your admin dashboard and check the header.
The AI Engine status indicator should turn **GREEN** 🟢 with a pulse animation.

Or run the diagnostic:
```powershell
D:\Civiclens\.venv\Scripts\python.exe check_ai_status.py
```

## Troubleshooting

### If you see "Redis connection failed":
1. Check if Redis container is running:
   ```powershell
   docker ps | findstr redis
   ```

2. If not running, start it:
   ```powershell
   docker start redis
   ```

### If worker crashes immediately:
1. Check the error message carefully
2. Ensure database is accessible
3. Verify .env file has correct settings

### To keep it running in background:
- **Option 1:** Keep the terminal window open (simplest)
- **Option 2:** Use Windows Task Scheduler
- **Option 3:** Run as a service (advanced)

## To Stop the Worker

Press `Ctrl+C` in the terminal window where it's running.

You'll see:
```
[SYSTEM] Shutdown signal received
[SYSTEM] Gracefully stopping AI Engine...
[SYSTEM] AI Engine stopped
================================================================================
```

---

**Note:** The AI worker needs to stay running to process reports!
Don't close the terminal window.
