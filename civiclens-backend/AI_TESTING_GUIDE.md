# 🧪 AI Engine Testing Guide

Complete guide for testing the AI classification engine with realistic civic complaints.

---

## 📋 **Test Dataset**

### **File:** `test_ai_complaints.json`

**35 realistic civic complaints** covering:
- ✅ All 8 categories (roads, water, sanitation, electricity, streetlight, drainage, public_property, other)
- ✅ All 4 severity levels (low, medium, high, critical)
- ✅ Edge cases (ambiguous, multiple keywords, life-threatening)
- ✅ Expected results for validation

### **Category Distribution:**
- **Roads:** 6 complaints (potholes, cracks, footpaths, bridges)
- **Water:** 5 complaints (leakage, burst pipes, shortage, contamination)
- **Sanitation:** 5 complaints (garbage collection, waste disposal, cleaning)
- **Streetlight:** 5 complaints (not working, dim, damaged poles)
- **Drainage:** 4 complaints (blockage, waterlogging, sewage overflow)
- **Public Property:** 5 complaints (parks, benches, trees, playgrounds)
- **Electricity:** 3 complaints (power outage, transformer, wire issues)
- **Other:** 2 complaints (ambiguous, multiple categories)

### **Severity Distribution:**
- **Critical:** 9 complaints (life-threatening, immediate danger)
- **High:** 10 complaints (serious disruption, prompt action needed)
- **Medium:** 13 complaints (noticeable issues, routine maintenance)
- **Low:** 3 complaints (minor cosmetic issues)

---

## 🚀 **Testing Methods**

### **Method 1: Direct Model Testing** (Recommended for development)

Tests the AI models directly without API or database.

**Command:**
```bash
cd civiclens-backend
python test_ai_engine.py
```

**What it does:**
1. Loads AI models (BART for classification)
2. Tests all 35 complaints
3. Compares predictions with expected results
4. Generates detailed accuracy report
5. Saves results to JSON file

**Output:**
```
🤖 AI ENGINE TEST SUITE
================================================================================

📥 Loading AI models...
✅ Models loaded successfully!

📋 Loaded 35 test complaints

🧪 RUNNING TESTS
================================================================================

[1/35] Testing: Big pothole on Main Road near Railway Station...
   ✅ Category: roads (confidence: 0.78, method: keyword_boost)
   ✅ Severity: high (confidence: 0.72, priority: 7)

[2/35] Testing: Water pipeline burst on Station Road...
   ✅ Category: water (confidence: 0.85, method: keyword_boost)
   ✅ Severity: critical (confidence: 0.88, priority: 10)

...

📊 TEST REPORT
================================================================================

Total Tests: 35
Category Accuracy: 30/35 (85.7%)
Severity Accuracy: 28/35 (80.0%)

📈 CONFIDENCE DISTRIBUTION
--------------------------------------------------------------------------------
High (≥0.80):      12 (34.3%)
Good (0.70-0.79):  15 (42.9%)
Medium (0.60-0.69):  6 (17.1%)
Low (0.50-0.59):    2 ( 5.7%)
Very Low (<0.50):   0 ( 0.0%)

🔧 CLASSIFICATION METHOD
--------------------------------------------------------------------------------
Keyword Boost: 28 (80.0%)
Zero-Shot Only:  7 (20.0%)

📂 CATEGORY-WISE ACCURACY
--------------------------------------------------------------------------------
roads               :  5/ 6 (83.3%)
water               :  5/ 5 (100.0%)
sanitation          :  4/ 5 (80.0%)
streetlight         :  5/ 5 (100.0%)
drainage            :  3/ 4 (75.0%)
public_property     :  4/ 5 (80.0%)
electricity         :  3/ 3 (100.0%)
other               :  1/ 2 (50.0%)

💾 Detailed results saved to: test_results_20251104_230500.json

================================================================================
🎉 EXCELLENT! AI engine is performing very well!
================================================================================
```

**Advantages:**
- ✅ Fast (no API calls, no database)
- ✅ Detailed analysis
- ✅ Saves results to JSON
- ✅ Good for development and tuning

**Requirements:**
```bash
pip install transformers torch sentence-transformers
```

---

### **Method 2: API Testing** (Recommended for integration testing)

Tests the complete flow: API → Database → AI Worker → Results

**Command:**
```bash
cd civiclens-backend
python test_api_complaints.py
```

**Prerequisites:**
1. Backend server running (`python -m uvicorn app.main:app`)
2. AI worker running (`python -m app.workers.ai_worker`)
3. Database and Redis running
4. Valid admin credentials

**Configuration:**
Edit `test_api_complaints.py`:
```python
API_BASE_URL = "http://localhost:8000/api/v1"
ADMIN_PHONE = "+919876543210"  # Your admin phone
ADMIN_PASSWORD = "Admin@123"    # Your admin password
```

**What it does:**
1. Logs in to get access token
2. Creates 10 test reports via API
3. Waits for AI worker to process
4. Fetches results and validates
5. Generates accuracy summary

**Output:**
```
🧪 API TEST SUITE
================================================================================

🔐 Logging in...
✅ Login successful!

📝 Creating 10 test reports...

[1/10] Creating: Big pothole on Main Road...
   ✅ Created report #123
   📍 Location: Main Road, Ranchi

[2/10] Creating: Water pipeline burst...
   ✅ Created report #124
   📍 Location: Station Road, Ranchi

...

⏳ Waiting 10 seconds for AI worker to process reports...

🤖 AI CLASSIFICATION RESULTS
================================================================================

[1/10] Report #123: Big pothole on Main Road...
   ✅ Category: roads (expected: roads)
   ✅ Severity: high (expected: high)
   📊 Confidence: 0.78
   📌 Status: ASSIGNED_TO_DEPARTMENT
   🏢 Department ID: 1

...

📊 TEST SUMMARY
================================================================================

Total Reports: 10
Category Accuracy: 9/10 (90.0%)
Severity Accuracy: 8/10 (80.0%)
Average Confidence: 0.74

📌 Status Distribution:
   ASSIGNED_TO_DEPARTMENT: 6
   ASSIGNED_TO_OFFICER: 3
   CLASSIFIED: 1

================================================================================
```

**Advantages:**
- ✅ Tests complete integration
- ✅ Tests API, database, and AI worker
- ✅ Validates real-world workflow
- ✅ Tests auto-assignment logic

---

### **Method 3: Manual Testing via API Docs**

Use FastAPI's interactive docs for manual testing.

**Steps:**

1. **Open API Docs:**
   ```
   http://localhost:8000/docs
   ```

2. **Login:**
   - Go to `/api/v1/auth/login`
   - Use admin credentials
   - Copy the `access_token`

3. **Authorize:**
   - Click "Authorize" button (top right)
   - Paste token: `Bearer <your_token>`

4. **Create Report:**
   - Go to `/api/v1/reports` POST endpoint
   - Use test complaint from `test_ai_complaints.json`
   - Submit

5. **Check AI Results:**
   - Wait 5-10 seconds
   - Go to `/api/v1/reports/{id}` GET endpoint
   - Check `ai_category`, `ai_severity`, `ai_confidence`

6. **View AI Insights:**
   - Go to `/api/v1/ai-insights/stats`
   - See overall AI performance

---

## 📊 **Expected Results**

### **Target Accuracy:**
- **Category Accuracy:** ≥85% (30+/35 correct)
- **Severity Accuracy:** ≥80% (28+/35 correct)
- **High Confidence Rate:** ≥30% (confidence ≥0.80)
- **Keyword Boost Usage:** ≥70% (better accuracy)

### **Confidence Thresholds:**
```python
MIN_CLASSIFICATION_CONFIDENCE = 0.50  # Accept AI classification
AUTO_ASSIGN_CONFIDENCE = 0.60         # Auto-assign to department
AUTO_ASSIGN_OFFICER_CONFIDENCE = 0.70 # Auto-assign to officer
HIGH_CONFIDENCE_THRESHOLD = 0.80      # High confidence
```

### **Expected Outcomes:**
- **Confidence ≥0.80:** Full automation (dept + officer)
- **Confidence 0.70-0.79:** Auto-assign to officer
- **Confidence 0.60-0.69:** Auto-assign to department only
- **Confidence 0.50-0.59:** Classify but flag for review
- **Confidence <0.50:** Manual classification required

---

## 🔍 **Analyzing Results**

### **Good Signs:**
✅ Category accuracy ≥85%
✅ Severity accuracy ≥80%
✅ High confidence rate ≥30%
✅ Keyword boost usage ≥70%
✅ Low ambiguous classifications (<5%)

### **Warning Signs:**
⚠️ Category accuracy <75%
⚠️ Severity accuracy <70%
⚠️ High confidence rate <20%
⚠️ Many "other" classifications (>10%)
⚠️ Low confidence on clear cases

### **Common Issues:**

**1. Low Category Accuracy (<75%)**
- **Cause:** Keywords don't match local language/terminology
- **Fix:** Update keywords in `app/services/ai/config.py`
- **Example:** Add Hindi/local terms like "गड्ढा" for pothole

**2. Low Severity Accuracy (<70%)**
- **Cause:** Severity labels too generic
- **Fix:** Make severity labels more contextual
- **Example:** Add response time expectations

**3. Too Many Manual Reviews (>30%)**
- **Cause:** Thresholds too strict
- **Fix:** Lower `MIN_CLASSIFICATION_CONFIDENCE` to 0.45
- **Trade-off:** More automation but slightly lower accuracy

**4. Too Many Misclassifications (>15%)**
- **Cause:** Thresholds too loose
- **Fix:** Raise `MIN_CLASSIFICATION_CONFIDENCE` to 0.55
- **Trade-off:** More manual reviews but higher accuracy

---

## 🛠️ **Tuning the AI Engine**

### **1. Adjust Confidence Thresholds**

Edit `app/services/ai/config.py`:

```python
# More aggressive (fewer manual reviews, more risk)
MIN_CLASSIFICATION_CONFIDENCE = 0.45
AUTO_ASSIGN_CONFIDENCE = 0.55
AUTO_ASSIGN_OFFICER_CONFIDENCE = 0.65

# More conservative (more manual reviews, less risk)
MIN_CLASSIFICATION_CONFIDENCE = 0.55
AUTO_ASSIGN_CONFIDENCE = 0.65
AUTO_ASSIGN_OFFICER_CONFIDENCE = 0.75
```

### **2. Add Local Keywords**

Add Hindi/local language keywords:

```python
"roads": {
    "keywords": [
        "pothole", "road", "street", "highway",
        "गड्ढा", "सड़क", "रास्ता",  # Hindi
        # Add more local terms
    ]
}
```

### **3. Improve Category Labels**

Make labels more specific:

```python
"roads": {
    "label": "damaged roads with potholes cracks broken pavement requiring urgent repair work"
}
```

### **4. Test After Changes**

```bash
# Restart AI worker
docker-compose restart ai-worker

# Run tests
python test_ai_engine.py

# Compare results
```

---

## 📈 **Monitoring in Production**

### **1. Track Accuracy Over Time**

```sql
-- Weekly accuracy report
SELECT 
    DATE_TRUNC('week', created_at) as week,
    COUNT(*) as total_reports,
    SUM(CASE WHEN ai_category = category THEN 1 ELSE 0 END) as correct_category,
    ROUND(100.0 * SUM(CASE WHEN ai_category = category THEN 1 ELSE 0 END) / COUNT(*), 2) as accuracy_pct
FROM reports
WHERE ai_processed_at IS NOT NULL
  AND classified_by_user_id IS NOT NULL
GROUP BY week
ORDER BY week DESC;
```

### **2. Monitor Confidence Distribution**

```sql
-- Confidence distribution
SELECT 
    CASE 
        WHEN ai_confidence >= 0.80 THEN 'High (≥0.80)'
        WHEN ai_confidence >= 0.70 THEN 'Good (0.70-0.79)'
        WHEN ai_confidence >= 0.60 THEN 'Medium (0.60-0.69)'
        WHEN ai_confidence >= 0.50 THEN 'Low (0.50-0.59)'
        ELSE 'Very Low (<0.50)'
    END as confidence_range,
    COUNT(*) as count
FROM reports
WHERE ai_processed_at > NOW() - INTERVAL '7 days'
GROUP BY confidence_range
ORDER BY MIN(ai_confidence) DESC;
```

### **3. Check AI Insights API**

```bash
curl http://localhost:8000/api/v1/ai-insights/stats
```

---

## 🐛 **Troubleshooting**

### **Issue: Models not loading**
```
❌ Failed to load classification model: ...
```

**Solution:**
```bash
# Download models manually
cd civiclens-backend
python -m app.ml.download_models

# Check models directory
ls -lh models/cache/
```

### **Issue: Low accuracy on specific category**
```
roads: 3/6 (50.0%)
```

**Solution:**
1. Check keywords for that category
2. Add more specific keywords
3. Improve category label
4. Test with more examples

### **Issue: AI worker not processing**
```
⏳ Not yet processed by AI
```

**Solution:**
```bash
# Check AI worker logs
docker-compose logs -f ai-worker

# Restart AI worker
docker-compose restart ai-worker

# Check Redis connection
docker-compose exec redis redis-cli ping
```

### **Issue: All reports going to manual review**
```
Very Low (<0.50): 35 (100.0%)
```

**Solution:**
1. Check if models loaded correctly
2. Lower `MIN_CLASSIFICATION_CONFIDENCE` to 0.40
3. Verify category labels are descriptive
4. Check if keywords match report text

---

## 📚 **Additional Resources**

- **AI Configuration:** `app/services/ai/config.py`
- **Category Classifier:** `app/services/ai/category_classifier.py`
- **Urgency Scorer:** `app/services/ai/urgency_scorer.py`
- **Department Router:** `app/services/ai/department_router.py`
- **AI Pipeline:** `app/services/ai_pipeline_service.py`
- **AI Worker:** `app/workers/ai_worker.py`

---

## 🎯 **Success Criteria**

### **Development:**
- ✅ Category accuracy ≥85%
- ✅ Severity accuracy ≥80%
- ✅ High confidence rate ≥30%
- ✅ All tests passing

### **Production:**
- ✅ Category accuracy ≥80% (with manual reviews)
- ✅ Severity accuracy ≥75%
- ✅ Auto-assignment rate 60-70%
- ✅ Manual review rate 20-30%
- ✅ User satisfaction with AI suggestions

---

**Happy Testing! 🚀**

*For questions or issues, check the logs or refer to AI_ACCURACY_IMPROVEMENTS.md*
