# CivicLens AI Pipeline Setup Guide

## Overview

The AI pipeline automates report processing through 6 stages:
1. **Duplicate Detection** - Semantic similarity + geospatial proximity
2. **Category Classification** - Zero-shot BART classification (8 categories)
3. **Severity Scoring** - Urgency detection (low/medium/high/critical)
4. **Department Routing** - Automatic assignment to 6 departments
5. **Confidence Validation** - Overall confidence calculation
6. **Auto-Assignment** - Department assignment (officer assignment optional)

## Architecture

```
Report Created → Redis Queue → AI Worker → AI Pipeline → Database Update
                                    ↓
                    ┌───────────────┴────────────────┐
                    │   AI Processing Pipeline       │
                    ├────────────────────────────────┤
                    │ 1. Duplicate Detection         │
                    │ 2. Category Classification     │
                    │ 3. Severity Scoring            │
                    │ 4. Department Routing          │
                    │ 5. Confidence Validation       │
                    │ 6. Auto-Assignment Decision    │
                    └────────────────────────────────┘
```

## Installation

### Step 1: Install AI Dependencies

```bash
# Install AI/ML packages
pip install -r requirements-ai.txt
```

**Note:** This will install ~2GB of dependencies including PyTorch and Transformers.

### Step 2: Download AI Models

```bash
# Download models (one-time, ~1.6GB download)
python -m app.ml.download_models
```

This downloads:
- **BART Zero-Shot Classifier** (~1.5GB) - For category and severity classification
- **Sentence Transformer** (~80MB) - For duplicate detection

Models are cached in `models/cache/` directory.

### Step 3: Verify Redis is Running

```bash
# Check Redis connection
redis-cli ping
# Should return: PONG
```

If Redis is not installed:
```bash
# Windows (using Chocolatey)
choco install redis-64

# Or download from: https://github.com/microsoftarchive/redis/releases
```

## Running the AI Worker

### Option 1: Development Mode

```bash
# Terminal 1: Start FastAPI backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Start AI Worker
python -m app.workers.ai_worker
```

### Option 2: Production Mode (with PM2)

```bash
# Install PM2
npm install -g pm2

# Start AI worker with PM2
pm2 start app/workers/ai_worker.py --name civiclens-ai-worker --interpreter python

# Monitor
pm2 logs civiclens-ai-worker
pm2 status
```

## Configuration

Edit `app/services/ai/config.py` to customize:

### Confidence Thresholds

```python
MIN_CLASSIFICATION_CONFIDENCE = 0.60  # Minimum confidence to auto-classify
AUTO_ASSIGN_CONFIDENCE = 0.80         # Minimum confidence to auto-assign
HIGH_CONFIDENCE_THRESHOLD = 0.85      # High confidence threshold
```

### Duplicate Detection

```python
DUPLICATE_SIMILARITY_THRESHOLD = 0.75  # Semantic similarity threshold
DUPLICATE_GEO_RADIUS_METERS = 200      # Spatial radius in meters
DUPLICATE_TIME_WINDOW_DAYS = 30        # Temporal window in days
```

### Enable/Disable Features

```python
ENABLE_DUPLICATE_DETECTION = True   # Enable duplicate detection
ENABLE_AUTO_ASSIGNMENT = False      # Enable auto-assignment to department
```

## Testing the Pipeline

### Test 1: Create a Road Report

```bash
curl -X POST http://localhost:8000/api/v1/reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Large pothole on Main Road causing accidents",
    "description": "There is a huge pothole near Albert Ekka Chowk that damaged my bike tire. Very dangerous for vehicles.",
    "latitude": 23.3441,
    "longitude": 85.3096,
    "severity": "high"
  }'
```

**Expected AI Results:**
- Category: `roads` (confidence ~0.85)
- Severity: `high` (confidence ~0.89)
- Department: `Public Works Department`
- Status: `CLASSIFIED` or `ASSIGNED_TO_DEPARTMENT`

### Test 2: Create a Water Report

```bash
curl -X POST http://localhost:8000/api/v1/reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Water pipe burst flooding the street",
    "description": "Major water pipeline burst near Circular Road. Water is flooding the entire street and causing traffic issues.",
    "latitude": 23.3520,
    "longitude": 85.3240,
    "severity": "critical"
  }'
```

**Expected AI Results:**
- Category: `water` (confidence ~0.92)
- Severity: `critical` (confidence ~0.95)
- Department: `Water Supply Department`

### Test 3: Duplicate Detection

Create the same report twice within 200m radius to test duplicate detection.

## Monitoring

### Check AI Worker Status

```bash
# Check heartbeat (should update every 10 seconds)
redis-cli GET ai_worker:heartbeat
```

### View AI Metrics

```bash
# Daily processing metrics
redis-cli HGETALL ai_metrics:daily
```

### Check Queues

```bash
# Check pending reports
redis-cli LLEN queue:ai_processing

# Check failed reports
redis-cli LLEN queue:ai_failed

# View failed report IDs
redis-cli LRANGE queue:ai_failed 0 -1
```

### Worker Logs

The AI worker logs detailed information:
- ✅ Success: Report processed successfully
- ⚠️ Warning: Low confidence, needs review
- ❌ Error: Processing failed

## Performance

### Processing Time
- **Average**: 2-5 seconds per report
- **Duplicate Detection**: ~0.5s
- **Classification**: ~1-2s
- **Severity Scoring**: ~1-2s
- **Department Routing**: ~0.1s

### Resource Usage
- **CPU**: 1-2 cores (CPU-only inference)
- **RAM**: ~2GB (models loaded in memory)
- **Disk**: ~1.6GB (cached models)

### Optimization Tips

1. **Use GPU** (if available):
   ```python
   # In config.py, change device=-1 to device=0
   pipeline(..., device=0)  # Use GPU
   ```

2. **Batch Processing**: Process multiple reports in batches
3. **Model Quantization**: Use smaller model variants for faster inference

## Troubleshooting

### Issue: Models not downloading

**Solution:**
```bash
# Set HuggingFace cache directory
export TRANSFORMERS_CACHE=/path/to/cache
export HF_HOME=/path/to/cache

# Retry download
python -m app.ml.download_models
```

### Issue: Out of memory

**Solution:**
```python
# Use smaller models in config.py
ZERO_SHOT_MODEL = "facebook/bart-base"  # Instead of bart-large
```

### Issue: Worker not processing reports

**Check:**
1. Redis is running: `redis-cli ping`
2. Worker is running: `ps aux | grep ai_worker`
3. Queue has reports: `redis-cli LLEN queue:ai_processing`
4. Check worker logs for errors

### Issue: Low classification accuracy

**Solution:**
1. Review and update category keywords in `config.py`
2. Adjust confidence thresholds
3. Enable manual review for low-confidence reports

## Category Mapping

The system maps to 8 categories:

| Category | Department | Keywords |
|----------|-----------|----------|
| `roads` | Public Works | pothole, road, street, crack, bridge |
| `water` | Water Supply | water, pipe, leak, burst, supply |
| `sanitation` | Sanitation | garbage, waste, trash, collection |
| `electricity` | Electrical | electricity, power, outage, transformer |
| `streetlight` | Electrical | streetlight, lamp, bulb, dark |
| `drainage` | Public Works | drainage, drain, sewer, flood |
| `public_property` | Horticulture | park, garden, bench, tree |
| `other` | Manual Review | miscellaneous issues |

## Severity Levels

| Level | Priority | Description |
|-------|----------|-------------|
| `critical` | 9-10 | Emergency requiring immediate attention |
| `high` | 7-8 | Urgent problem requiring prompt action |
| `medium` | 5-6 | Routine maintenance issue |
| `low` | 3-4 | Minor issue for scheduled maintenance |

## Integration with Existing System

The AI pipeline integrates seamlessly with your existing workflow:

1. **Report Creation**: Automatically queued for AI processing
2. **Status Updates**: AI updates report status based on confidence
3. **Manual Override**: Admins can override AI classifications
4. **History Tracking**: All AI decisions are logged

## Next Steps

1. **Enable Auto-Assignment**: Set `ENABLE_AUTO_ASSIGNMENT = True` when officer assignment is ready
2. **Fine-tune Models**: Train custom models on your data for better accuracy
3. **Add Notifications**: Notify citizens when duplicates are detected
4. **Dashboard Integration**: Display AI confidence scores in admin dashboard
5. **Analytics**: Track AI performance metrics over time

## Support

For issues or questions:
- Check logs: `tail -f logs/ai_worker.log`
- Review failed reports: `redis-cli LRANGE queue:ai_failed 0 -1`
- Contact: [Your support contact]
