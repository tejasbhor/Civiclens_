# 🤖 AI Engine Setup - Quick Steps

## What's Installing Now
Installing AI/ML dependencies (this may take 5-10 minutes):
- PyTorch 2.1.0 (Deep learning framework)
- Transformers 4.35.2 (NLP models)
- Sentence-Transformers 2.7.0 (Text embeddings)
- scikit-learn, numpy, scipy (ML utilities)

## After Installation Complete

### Step 1: Download AI Models (One-time, ~500MB)
```powershell
uv run python -m app.ml.download_models
```
This downloads pre-trained models for:
- Complaint classification
- Priority prediction  
- Department routing
- Spam detection

### Step 2: Check AI Engine Health
```powershell
uv run python check_ai_engine_health.py
```
Shows:
- ✅ Redis connection
- ✅ AI models loaded
- ⏸️ AI Worker status (not started yet)

### Step 3: Start AI Worker
```powershell
uv run python start_ai_worker.py
```
This starts the background worker that processes reports with AI.

### Step 4: Verify Everything Works
```powershell
# Check health again
uv run python check_ai_engine_health.py

# Should show:
# ✅ Redis: Connected
# ✅ Models: Loaded
# ✅ Worker: Running
```

## What the AI Engine Does

1. **Automatic Classification**: Categorizes citizen complaints
2. **Priority Detection**: Assigns urgency levels
3. **Department Routing**: Routes to correct department
4. **Spam Detection**: Filters out spam/duplicate reports
5. **Sentiment Analysis**: Understands citizen sentiment

## Monitoring

### Via Dashboard
- Admin Dashboard → AI Engine indicator (top right)
- Green 🟢 = Running
- Red 🔴 = Stopped

### Via Command Line
```powershell
# Check worker status
redis-cli GET ai_worker:heartbeat

# Check queue length
redis-cli LLEN queue:ai_processing

# View worker logs
Get-Content logs\ai_worker.log -Tail 50
```

## Common Issues

### Issue: "Models not found"
**Solution**: Run `uv run python -m app.ml.download_models`

### Issue: "Redis connection failed"
**Solution**: Make sure Redis is running (Docker or local)

### Issue: "Worker keeps stopping"
**Solution**: Check logs at `logs\ai_worker.log` for errors

## Production Tips

- Run worker as background service (systemd/supervisor/PM2)
- Monitor queue lengths (should stay < 50)
- Check failed queue regularly
- Restart worker daily for stability

---

**Status**: Installing dependencies... ⏳
**Next**: Download models → Start worker → Test
