# Navi Mumbai Municipal Corporation - Seed Data Guide

## 🏛️ Overview

This guide explains how to populate your CivicLens database with **Navi Mumbai Municipal Corporation (NMMC)** departments and officers.

**Data Included:**
- ✅ 5 Core Departments (PWD, Water, Sanitation, Electrical, Horticulture)
- ✅ 20 Officers (distributed across departments)
- ✅ Realistic NMMC structure and contact information

---

## 📊 Departments

### 1. Public Works Department (PWD)
- **Officers:** 5
- **Handles:** Roads, Bridges, Footpaths, Drainage, Civil Infrastructure
- **Email:** pwd@nmmc.gov.in
- **Phone:** +91-22-27650451

### 2. Water Supply Department (WSD)
- **Officers:** 4
- **Handles:** Water Supply, Leakage, Pipeline, Quality Management
- **Email:** water@nmmc.gov.in
- **Phone:** +91-22-27650452
- **Service:** 24x7 Emergency

### 3. Sanitation Department (SD)
- **Officers:** 5
- **Handles:** Garbage Collection, Waste Management, Public Toilets
- **Email:** sanitation@nmmc.gov.in
- **Phone:** +91-22-27650453

### 4. Electrical Department (ED)
- **Officers:** 3
- **Handles:** Streetlights, Electrical Infrastructure, Public Lighting
- **Email:** electrical@nmmc.gov.in
- **Phone:** +91-22-27650454

### 5. Horticulture Department (HD)
- **Officers:** 3
- **Handles:** Parks, Gardens, Trees, Green Spaces
- **Email:** horticulture@nmmc.gov.in
- **Phone:** +91-22-27650455

---

## 👮 Sample Officers

### Public Works Department
1. **Rajesh Kumar Singh** (PWD-001) - rajesh.kumar@nmmc.gov.in
2. **Amit Sharma** (PWD-002) - amit.sharma@nmmc.gov.in
3. **Suresh Prasad** (PWD-003) - suresh.prasad@nmmc.gov.in
4. **Deepak Kumar** (PWD-004) - deepak.kumar@nmmc.gov.in
5. **Vikash Singh** (PWD-005) - vikash.singh@nmmc.gov.in

### Water Supply Department
1. **Priya Singh** (WSD-001) - priya.singh@nmmc.gov.in
2. **Anil Kumar Verma** (WSD-002) - anil.verma@nmmc.gov.in
3. **Santosh Kumar** (WSD-003) - santosh.kumar@nmmc.gov.in
4. **Ravi Shankar** (WSD-004) - ravi.shankar@nmmc.gov.in

### Sanitation Department
1. **Ram Kumar Yadav** (SD-001) - ram.kumar@nmmc.gov.in
2. **Sunita Devi** (SD-002) - sunita.devi@nmmc.gov.in
3. **Manoj Kumar** (SD-003) - manoj.kumar@nmmc.gov.in
4. **Pankaj Singh** (SD-004) - pankaj.singh@nmmc.gov.in
5. **Anita Kumari** (SD-005) - anita.kumari@nmmc.gov.in

### Electrical Department
1. **Rakesh Kumar** (ED-001) - rakesh.kumar@nmmc.gov.in
2. **Sanjay Prasad** (ED-002) - sanjay.prasad@nmmc.gov.in
3. **Dinesh Kumar** (ED-003) - dinesh.kumar@nmmc.gov.in

### Horticulture Department
1. **Ramesh Chandra** (HD-001) - ramesh.chandra@nmmc.gov.in
2. **Kavita Sharma** (HD-002) - kavita.sharma@nmmc.gov.in
3. **Ashok Kumar** (HD-003) - ashok.kumar@nmmc.gov.in

**Default Password for All Officers:** `Officer@123`

---

## 🚀 How to Seed Data

### Step 1: Ensure Backend is Running

Make sure PostgreSQL is running and your backend can connect:

```bash
cd civiclens-backend
```

### Step 2: Run the Seed Script

```bash
# Seed all departments and officers
python -m app.db.seeds.seed_navimumbai_data
```

**Expected Output:**
```
============================================================
🏛️  NAVI MUMBAI MUNICIPAL CORPORATION - DATA SEEDING
============================================================
Area: 146 sq km
Population: 1,200,000+ (approx)
Wards: 118
Zones: 2 (Vashi and CBD Belapur)
============================================================

📊 Seeding Departments...
============================================================
✅ Created: Public Works Department
✅ Created: Water Supply Department
✅ Created: Sanitation Department
✅ Created: Electrical Department
✅ Created: Horticulture Department

============================================================
✅ Departments seeded: 5 created, 0 skipped
============================================================

👮 Seeding Officers...
============================================================
✅ Created: Rajesh Kumar Singh (PWD-001) - Public Works Department
✅ Created: Amit Sharma (PWD-002) - Public Works Department
...
✅ Created: Ashok Kumar (HD-003) - Horticulture Department

============================================================
✅ Officers seeded: 20 created, 0 skipped
============================================================

============================================================
🎉 SEEDING COMPLETE!
============================================================
📊 Total Departments: 5
👮 Total Officers: 20

✅ Database is ready for CivicLens!
============================================================
```

### Step 3: Verify Data

**Check Departments:**
```bash
# Using psql
psql -U postgres -d civiclens
SELECT id, name FROM departments;
```

**Check Officers:**
```bash
SELECT id, full_name, employee_id, email, role FROM users WHERE role = 'nodal_officer';
```

---

## 🔄 Re-running the Script

The script is **idempotent** - it will skip existing records:

```bash
python -m app.db.seeds.seed_Navi Mumbai_data
```

**Output if data already exists:**
```
⏭️  Skipped: Public Works Department (already exists)
⏭️  Skipped: Rajesh Kumar Singh (already exists)
...
✅ Departments seeded: 0 created, 5 skipped
✅ Officers seeded: 0 created, 20 skipped
```

---

## 🗑️ Clearing Seed Data

**⚠️ WARNING: This will delete all departments and officers!**

```bash
python -m app.db.seeds.seed_Navi Mumbai_data --clear
```

You'll be prompted to confirm:
```
⚠️  WARNING: This will delete all departments and officers!
Type 'YES' to confirm: YES
✅ All data cleared
```

---

## 🧪 Testing the Seeded Data

### Test 1: Login as Officer

1. Go to admin login: `http://localhost:3000/login`
2. Use any officer credentials:
   - **Phone:** `+91-9876543210`
   - **Password:** `Officer@123`
3. Should login successfully as `nodal_officer`

### Test 2: View Departments

1. Go to: `http://localhost:3000/dashboard/departments`
2. Should see all 5 departments listed

### Test 3: View Officers

1. Go to: `http://localhost:3000/dashboard/officers`
2. Should see all 20 officers listed
3. Filter by department to see officers per department

### Test 4: Assign Report to Department

1. Create a test report (as citizen)
2. Login as admin
3. Go to Reports page
4. Click "Manage" on a report
5. Should see all 5 departments in dropdown
6. Assign to "Public Works Department"
7. Should see 5 PWD officers available for assignment

---

## 📁 File Structure

```
civiclens-backend/
└── app/
    └── db/
        └── seeds/
            ├── Navi Mumbai_departments.py      # Department & Officer data
            └── seed_Navi Mumbai_data.py        # Seeding script
```

---

## 🔧 Customization

### Adding More Officers

Edit `app/db/seeds/Navi Mumbai_departments.py`:

```python
OFFICERS = [
    # ... existing officers ...
    {
        "employee_id": "PWD-006",
        "full_name": "New Officer Name",
        "phone": "+91-9876543230",
        "email": "new.officer@Navi Mumbai.gov.in",
        "department_name": "Public Works Department",
        "role": "nodal_officer",
        "password": "Officer@123"
    }
]
```

Then re-run the seed script.

### Adding More Departments

Edit `app/db/seeds/Navi Mumbai_departments.py`:

```python
DEPARTMENTS = [
    # ... existing departments ...
    {
        "name": "Traffic Management Department",
        "description": "Traffic control and management",
        "keywords": "traffic,signals,congestion,parking",
        "contact_email": "traffic@Navi Mumbai.gov.in",
        "contact_phone": "+91-651-2345683"
    }
]
```

---

## 🐛 Troubleshooting

### Issue 1: "Module not found"

**Solution:** Make sure you're in the backend directory:
```bash
cd civiclens-backend
python -m app.db.seeds.seed_Navi Mumbai_data
```

### Issue 2: "Database connection failed"

**Solution:** Check PostgreSQL is running:
```bash
# Windows
pg_ctl status

# Linux/Mac
sudo systemctl status postgresql
```

### Issue 3: "Department not found for officer"

**Solution:** Departments must be seeded before officers. The script handles this automatically.

### Issue 4: "Duplicate key error"

**Solution:** Data already exists. The script will skip duplicates automatically.

---

## 📊 Database Schema

### Departments Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer | Primary key |
| `name` | String(255) | Department name (unique) |
| `description` | Text | Department description |
| `keywords` | Text | Keywords for AI classification |
| `contact_email` | String(255) | Contact email |
| `contact_phone` | String(20) | Contact phone |
| `created_at` | DateTime | Creation timestamp |
| `updated_at` | DateTime | Last update timestamp |

### Users Table (Officers)

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer | Primary key |
| `employee_id` | String(50) | Employee ID (unique) |
| `full_name` | String(255) | Officer name |
| `phone` | String(20) | Phone (unique) |
| `email` | String(255) | Email (unique) |
| `hashed_password` | String(255) | Bcrypt hashed password |
| `role` | Enum | User role (nodal_officer) |
| `department_id` | Integer | FK to departments |
| `phone_verified` | Boolean | Phone verification status |
| `email_verified` | Boolean | Email verification status |
| `profile_completion` | Enum | Profile completion level |
| `created_at` | DateTime | Creation timestamp |

---

## ✅ Success Checklist

After seeding, verify:

- [ ] 5 departments created in database
- [ ] 20 officers created in database
- [ ] All officers have `nodal_officer` role
- [ ] All officers are linked to correct departments
- [ ] Can login with any officer credentials
- [ ] Departments visible in admin dashboard
- [ ] Officers visible in officers page
- [ ] Can assign reports to departments
- [ ] Can assign reports to officers

---

## 🎯 Next Steps

After seeding data:

1. **Test Report Assignment Flow:**
   - Create test reports
   - Assign to departments
   - Assign to officers
   - Track status changes

2. **Test Officer Login:**
   - Login as different officers
   - View assigned tasks
   - Update task status
   - Upload before/after photos

3. **Test Department Management:**
   - View department details
   - See reports per department
   - Check officer workload

4. **Create More Test Data:**
   - Add more officers if needed
   - Create test reports for each category
   - Test the complete workflow

---

## 📞 Support

If you encounter issues:

1. Check the console output for error messages
2. Verify database connection
3. Check PostgreSQL logs
4. Ensure all migrations are run
5. Review the seed script output

---

**Status:** ✅ Ready to use  
**Last Updated:** October 2024  
**Version:** 1.0.0

🎉 Your CivicLens system is now populated with Navi MumbaiMunicipal Corporation data!
