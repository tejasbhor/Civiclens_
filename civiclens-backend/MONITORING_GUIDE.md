# AI Pipeline Monitoring Guide

## Quick Health Check

### 1. Check AI Worker Status
```bash
# Should show: "🤖 AI Worker started, listening on queue:ai_processing..."
# Look for: ✅ Redis connection successful
```

### 2. Monitor Processing Logs
```bash
# Good signs:
✅ 📊 Confidence Analysis: Category=0.65 (roads), Severity=0.45 (medium), Department=0.90 → Overall=0.62
✅ Classified successfully (confidence: 0.62), awaiting department assignment
✅ Assigned to department 3, status: ASSIGNED_TO_DEPARTMENT
✅ Assigned to officer 15 (John Doe), status: ASSIGNED_TO_OFFICER

# Warning signs:
⚠️  Confidence 0.38 < 0.50 threshold → Flagged for manual review (OK if <20% of reports)
❌ Pipeline failed for report X (investigate immediately)
```

### 3. Expected Distribution
- **60-80%** → Auto-assigned (✅ `assigned_to_department` or `assigned_to_officer`)
- **10-20%** → Classified, awaiting manual assignment (✅ `classified`)
- **5-15%** → Flagged for review (⚠️ `needs_admin_review`)
- **<5%** → Failed (❌ investigate)

---

## Log Interpretation

### Confidence Breakdown
```
📊 Confidence Analysis: Category=0.65 (roads), Severity=0.33 (low), Department=0.95 → Overall=0.58
```
- **Category confidence** (50% weight): How sure AI is about category
- **Severity confidence** (30% weight): How sure AI is about urgency
- **Department confidence** (20% weight): How well category maps to department
- **Overall confidence**: Weighted average (0.50×Cat + 0.30×Sev + 0.20×Dept)

### Decision Outcomes

#### ✅ Auto-Assigned (Best Case)
```
✅ Assigned to officer 15 (John Doe), status: ASSIGNED_TO_OFFICER
```
- Confidence ≥ 0.60
- Full automation achieved
- No human intervention needed

#### ✅ Classified (Good)
```
✅ Classified successfully (confidence: 0.55), awaiting department assignment
```
- Confidence 0.50-0.59
- AI classified, admin assigns officer
- Partial automation

#### ⚠️ Needs Review (Expected for Low Confidence)
```
⚠️  Confidence 0.42 < 0.50 threshold → Flagged for manual review
```
- Confidence < 0.50
- Admin reviews and classifies
- Expected for ambiguous reports

#### ❌ Failed (Investigate)
```
❌ Pipeline failed for report 123: [error message]
```
- System error
- Report moved to dead letter queue
- Requires investigation

---

## Confidence Thresholds

| Threshold | Value | Purpose |
|-----------|-------|---------|
| **Minimum** | 0.40 | Reject AI classification if below |
| **Auto-Assign Dept** | 0.50 | Auto-assign to department |
| **Auto-Assign Officer** | 0.60 | Auto-assign to officer |
| **High Confidence** | 0.70 | Consider high quality |

---

## Common Scenarios

### Scenario 1: Too Many Reports Going to Review (>30%)
**Symptom:** Most reports show `needs_admin_review`

**Diagnosis:**
```bash
# Check average confidence
SELECT AVG(ai_confidence) FROM reports WHERE ai_processed_at > NOW() - INTERVAL '1 day';
```

**Solution:**
- If avg confidence is 0.45-0.55 → Lower `AUTO_ASSIGN_CONFIDENCE` to 0.45
- If avg confidence is <0.40 → Model may need retraining or better prompts

### Scenario 2: Wrong Auto-Assignments (False Positives)
**Symptom:** Reports assigned to wrong department/officer

**Diagnosis:**
```sql
-- Find high-confidence wrong assignments
SELECT id, category, ai_category, ai_confidence, department_id
FROM reports
WHERE ai_processed_at > NOW() - INTERVAL '1 day'
  AND ai_confidence > 0.60
  AND category != ai_category;
```

**Solution:**
- Raise `AUTO_ASSIGN_CONFIDENCE` to 0.55 or 0.60
- Review category keywords in `app/services/ai/config.py`

### Scenario 3: Worker Not Processing
**Symptom:** Reports stuck in queue

**Diagnosis:**
```bash
# Check Redis queue length
redis-cli LLEN queue:ai_processing
# Should be 0 or low number
```

**Solution:**
```bash
# Restart worker
python -m app.workers.ai_worker
```

### Scenario 4: Low Confidence for Specific Category
**Symptom:** All "electricity" reports going to review

**Diagnosis:**
```sql
SELECT category, AVG(ai_confidence), COUNT(*)
FROM reports
WHERE ai_processed_at > NOW() - INTERVAL '7 days'
GROUP BY category
ORDER BY AVG(ai_confidence) ASC;
```

**Solution:**
- Improve category keywords in `app/services/ai/config.py`
- Add more descriptive labels for that category

---

## SQL Monitoring Queries

### Daily Stats
```sql
SELECT 
    DATE(ai_processed_at) as date,
    COUNT(*) as total_processed,
    COUNT(CASE WHEN status IN ('ASSIGNED_TO_DEPARTMENT', 'ASSIGNED_TO_OFFICER') THEN 1 END) as auto_assigned,
    COUNT(CASE WHEN needs_review = true THEN 1 END) as needs_review,
    ROUND(AVG(ai_confidence)::numeric, 2) as avg_confidence
FROM reports
WHERE ai_processed_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(ai_processed_at)
ORDER BY date DESC;
```

### Category Performance
```sql
SELECT 
    category,
    COUNT(*) as count,
    ROUND(AVG(ai_confidence)::numeric, 2) as avg_confidence,
    COUNT(CASE WHEN status IN ('ASSIGNED_TO_DEPARTMENT', 'ASSIGNED_TO_OFFICER') THEN 1 END) * 100 / COUNT(*) as auto_assign_rate
FROM reports
WHERE ai_processed_at > NOW() - INTERVAL '7 days'
GROUP BY category
ORDER BY avg_confidence DESC;
```

### Low Confidence Reports (Investigate)
```sql
SELECT 
    id,
    title,
    category,
    severity,
    ai_confidence,
    needs_review,
    status
FROM reports
WHERE ai_processed_at > NOW() - INTERVAL '1 day'
  AND ai_confidence < 0.45
ORDER BY ai_confidence ASC
LIMIT 10;
```

### Failed Reports (Dead Letter Queue)
```bash
# Check Redis dead letter queue
redis-cli LRANGE queue:ai_failed 0 -1
```

---

## Performance Benchmarks

### Processing Time
- **Target:** 5-10 seconds per report
- **Acceptable:** <15 seconds
- **Investigate if:** >20 seconds

### Confidence Distribution
```
0.70-1.00: ~15% (high confidence)
0.60-0.69: ~25% (auto-assign officer)
0.50-0.59: ~35% (auto-assign dept)
0.40-0.49: ~15% (classified only)
0.00-0.39: ~10% (needs review)
```

### Auto-Assignment Rate
- **Target:** 60-80%
- **Acceptable:** 50-85%
- **Investigate if:** <50% or >90%

---

## Alert Thresholds

### 🟢 Healthy
- Auto-assignment rate: 60-80%
- Average confidence: 0.50-0.65
- Processing time: <10s
- Failed reports: <2%

### 🟡 Warning
- Auto-assignment rate: 45-60% or 80-90%
- Average confidence: 0.40-0.50 or 0.65-0.75
- Processing time: 10-15s
- Failed reports: 2-5%

### 🔴 Critical
- Auto-assignment rate: <45% or >90%
- Average confidence: <0.40 or >0.75
- Processing time: >15s
- Failed reports: >5%

---

## Tuning Recommendations

### If Auto-Assignment Rate Too Low (<50%)
1. Lower `AUTO_ASSIGN_CONFIDENCE` by 0.05
2. Review category keywords
3. Check if severity scoring is too conservative

### If Auto-Assignment Rate Too High (>85%)
1. Raise `AUTO_ASSIGN_CONFIDENCE` by 0.05
2. Check for false positives
3. Review recent auto-assigned reports for accuracy

### If Average Confidence Too Low (<0.45)
1. Review category labels in config
2. Check if reports are well-written
3. Consider fine-tuning models

### If Average Confidence Too High (>0.70)
1. Models may be overconfident
2. Review for false positives
3. Consider raising thresholds

---

## Troubleshooting Commands

### Check Worker Health
```bash
# Should show heartbeat every 30s
redis-cli GET ai_worker:heartbeat
```

### View Recent Metrics
```bash
# Daily stats
redis-cli HGETALL ai_metrics:daily
```

### Clear Failed Queue (After Investigation)
```bash
# Move failed reports back to processing queue
redis-cli RPOPLPUSH queue:ai_failed queue:ai_processing
```

### Restart Worker
```bash
# Stop (Ctrl+C)
# Start
python -m app.workers.ai_worker
```

---

## Contact & Escalation

### Normal Issues
- Check this guide first
- Review logs for error messages
- Try restarting worker

### Critical Issues
- Worker down >5 minutes
- Failed rate >10%
- Database connection errors
- Model loading failures

**Escalation:** Contact system administrator

---

**Last Updated:** 2025-11-03  
**Version:** 1.1 (Confidence Calibration Update)
