# 🤖 AI Engine Quick Start Guide

## Prerequisites

✅ **Backend server running**: `uvicorn app.main:app --reload`  
✅ **PostgreSQL running**: Database should be accessible  
✅ **Redis running**: Redis server should be running  
✅ **AI Models downloaded**: Run `python -m app.ml.download_models` (one-time)

---

## Step 1: Health Check

**Check current AI engine status:**

```bash
python check_ai_engine_health.py
```

This will show:
- Redis connection status
- AI Worker heartbeat (running/stopped)
- Queue lengths
- Processing statistics
- AI models status

---

## Step 2: Start AI Worker

### Method 1: Using wrapper script (Recommended)

```bash
python start_ai_worker.py
```

### Method 2: Direct module execution

```bash
python -m app.workers.ai_worker
```

### Method 3: Background process (Production)

**Windows (PowerShell):**
```powershell
Start-Process python -ArgumentList "start_ai_worker.py" -NoNewWindow -RedirectStandardOutput "logs\ai_worker_stdout.log" -RedirectStandardError "logs\ai_worker_stderr.log"
```

**Linux/Mac:**
```bash
nohup python start_ai_worker.py > logs/ai_worker_stdout.log 2>&1 &
```

---

## Step 3: Verify Status

### Check in Dashboard

1. Open admin dashboard: `http://localhost:3000/dashboard`
2. Look for **AI Engine** indicator in top navigation
3. Should show:
   - 🟢 Green dot = Running
   - 🔴 Red dot = Stopped
   - ⚫ Gray dot = Unknown

### Check via API

```bash
# Get pipeline status
curl http://localhost:8000/api/v1/ai-insights/pipeline-status

# Get AI metrics
curl http://localhost:8000/api/v1/ai-insights/metrics
```

### Check Redis directly

```bash
# Check heartbeat
redis-cli GET ai_worker:heartbeat

# Check queue length
redis-cli LLEN queue:ai_processing

# Check worker metrics
redis-cli HGETALL ai_metrics:worker
```

---

## Step 4: Queue Reports for Processing

### Via Dashboard

1. Go to **Dashboard > Predictions**
2. Click "Actions" tab
3. View pending reports
4. Select reports and click "Process Selected"

### Via API

```bash
# Get pending reports
curl http://localhost:8000/api/v1/ai-insights/pending-reports

# Queue specific reports
curl -X POST http://localhost:8000/api/v1/ai-insights/process-reports \
  -H "Content-Type: application/json" \
  -d '{"report_ids": [1, 2, 3], "force": false}'
```

### Via Script

```bash
python requeue_reports_for_ai.py --needs-review
```

---

## Logs & Monitoring

### Log Files

- **Worker logs**: `logs/ai_worker.log`
- **Stdout**: `logs/ai_worker_stdout.log` (if running as background process)
- **Stderr**: `logs/ai_worker_stderr.log` (if running as background process)

### Real-time Monitoring

```bash
# Watch worker logs
tail -f logs/ai_worker.log

# Watch Redis queue
watch -n 1 'redis-cli LLEN queue:ai_processing'
```

---

## Troubleshooting

### Problem: Worker status shows "stopped" in dashboard

**Solution:**
1. Run health check: `python check_ai_engine_health.py`
2. Start worker: `python start_ai_worker.py`
3. Verify heartbeat: `redis-cli GET ai_worker:heartbeat`

### Problem: Reports not being processed

**Check:**
1. Is worker running? Check dashboard or health check
2. Are reports in queue? `redis-cli LLEN queue:ai_processing`
3. Check worker logs: `tail -f logs/ai_worker.log`
4. Check failed queue: `redis-cli LLEN queue:ai_failed`

### Problem: Dashboard shows "unknown" status

**Possible causes:**
1. API server not running
2. Frontend can't reach backend (CORS issue)
3. Redis connection failed

**Solution:**
```bash
# Restart backend
uvicorn app.main:app --reload

# Check backend health
curl http://localhost:8000/health

# Check AI endpoint
curl http://localhost:8000/api/v1/ai-insights/pipeline-status
```

### Problem: High number of failed reports

**Check failed queue:**
```bash
redis-cli LRANGE queue:ai_failed 0 -1
```

**Reprocess failed reports:**
```python
# Create script: reprocess_failed.py
import asyncio
from app.core.database import get_redis

async def reprocess():
    redis = await get_redis()
    while True:
        report_id = await redis.rpop("queue:ai_failed")
        if not report_id:
            break
        await redis.lpush("queue:ai_processing", report_id)
        print(f"Requeued report {report_id}")

asyncio.run(reprocess())
```

---

## Production Deployment

### Using Supervisor (Linux)

Create `/etc/supervisor/conf.d/ai_worker.conf`:

```ini
[program:civiclens_ai_worker]
command=/path/to/venv/bin/python start_ai_worker.py
directory=/path/to/civiclens-backend
user=civiclens
autostart=true
autorestart=true
startsecs=10
stopwaitsecs=30
redirect_stderr=true
stdout_logfile=/var/log/civiclens/ai_worker.log
environment=PYTHONPATH="/path/to/civiclens-backend"
```

Start:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start civiclens_ai_worker
```

### Using systemd (Linux)

Create `/etc/systemd/system/civiclens-ai-worker.service`:

```ini
[Unit]
Description=CivicLens AI Worker
After=network.target redis.service postgresql.service

[Service]
Type=simple
User=civiclens
WorkingDirectory=/path/to/civiclens-backend
ExecStart=/path/to/venv/bin/python start_ai_worker.py
Restart=always
RestartSec=10
StandardOutput=append:/var/log/civiclens/ai_worker.log
StandardError=append:/var/log/civiclens/ai_worker_error.log

[Install]
WantedBy=multi-user.target
```

Start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable civiclens-ai-worker
sudo systemctl start civiclens-ai-worker
sudo systemctl status civiclens-ai-worker
```

### Using PM2 (Node.js process manager)

```bash
pm2 start start_ai_worker.py --name civiclens-ai --interpreter python
pm2 save
pm2 startup
```

---

## Performance Tuning

### Adjust Heartbeat Interval

Edit `app/workers/ai_worker.py`:

```python
# Change heartbeat interval (default: 10 seconds)
await asyncio.sleep(10)  # Increase for less overhead
```

### Adjust Queue Timeout

```python
# Change queue timeout (default: 5 seconds)
result = await redis.brpop("queue:ai_processing", timeout=5)
```

### Multiple Workers (Advanced)

You can run multiple worker instances for higher throughput:

```bash
# Worker 1
python start_ai_worker.py

# Worker 2 (different terminal)
python start_ai_worker.py
```

**Note:** Reports are processed in order from Redis queue, automatically distributed across workers.

---

## Monitoring Metrics

### Key Metrics to Watch

1. **Processing Rate**: Reports per minute
2. **Success Rate**: Successful vs failed percentage
3. **Queue Length**: Should stay low (< 50)
4. **Failed Queue**: Should be minimal (< 5)
5. **Heartbeat Age**: Should update every 10 seconds

### Sample Monitoring Script

```python
import asyncio
from app.core.database import get_redis

async def monitor():
    redis = await get_redis()
    
    # Get metrics
    heartbeat = await redis.get("ai_worker:heartbeat")
    queue_len = await redis.llen("queue:ai_processing")
    failed_len = await redis.llen("queue:ai_failed")
    metrics = await redis.hgetall("ai_metrics:worker")
    
    print(f"Status: {'Running' if heartbeat else 'Stopped'}")
    print(f"Queue: {queue_len} | Failed: {failed_len}")
    print(f"Processed: {metrics.get(b'total_processed', 0)}")
    print(f"Success: {metrics.get(b'successful', 0)}")
    print(f"Failed: {metrics.get(b'failed', 0)}")

asyncio.run(monitor())
```

---

## Quick Commands Reference

```bash
# Health check
python check_ai_engine_health.py

# Start worker
python start_ai_worker.py

# Check status
redis-cli GET ai_worker:heartbeat

# View queue
redis-cli LLEN queue:ai_processing

# View logs
tail -f logs/ai_worker.log

# Requeue reports
python requeue_reports_for_ai.py
```

---

## Support

For issues or questions:
1. Check logs: `logs/ai_worker.log`
2. Run health check: `python check_ai_engine_health.py`
3. Review documentation: `AI_INTEGRATION_GUIDE.md`
4. Contact system administrator

---

**Last Updated:** November 2025  
**Version:** 2.0.0 (Production-Ready)
