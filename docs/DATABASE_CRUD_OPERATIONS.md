# CiviLens Database Schema - CRUD Operations

## Overview

CiviLens uses a **Base CRUD** pattern with specialized CRUD classes for each model.

**Pattern:** Generic CRUD + Model-Specific Extensions  
**ORM:** SQLAlchemy 2.0 (Async)  
**Session Management:** AsyncSession with dependency injection

---

## Base CRUD Operations

**File:** `app/crud/base.py`

### Generic CRUD Class

```python
class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model
```

### Core Methods

#### 1. Get Single Record

```python
async def get(
    db: AsyncSession,
    id: int,
    relationships: Optional[List[str]] = None
) -> Optional[ModelType]
```

**Features:**
- Get by primary key
- Optional eager loading of relationships
- Returns None if not found

**Example:**
```python
user = await user_crud.get(db, user_id, relationships=['reports', 'department'])
```

---

#### 2. Get Multiple Records

```python
async def get_multi(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    filters: Optional[Dict[str, Any]] = None,
    order_by: Optional[str] = None,
    relationships: Optional[List[str]] = None
) -> List[ModelType]
```

**Features:**
- Pagination (skip/limit)
- Dynamic filtering
- Custom ordering
- Eager loading

**Example:**
```python
reports = await report_crud.get_multi(
    db,
    skip=0,
    limit=20,
    filters={'status': 'in_progress', 'severity': 'critical'},
    order_by='-created_at',
    relationships=['user', 'department']
)
```

---

#### 3. Count Records

```python
async def count(
    db: AsyncSession,
    filters: Optional[Dict[str, Any]] = None
) -> int
```

**Features:**
- Count with optional filters
- Used for pagination

**Example:**
```python
total = await report_crud.count(db, filters={'status': 'resolved'})
```

---

#### 4. Create Record

```python
async def create(
    db: AsyncSession,
    obj_in: CreateSchemaType,
    commit: bool = True
) -> ModelType
```

**Features:**
- Pydantic schema validation
- Optional commit (for transactions)
- Auto-refresh after commit

**Example:**
```python
new_report = await report_crud.create(
    db,
    ReportCreate(
        user_id=1,
        title="Pothole on Main St",
        description="Large pothole",
        latitude=23.34,
        longitude=85.31
    )
)
```

---

#### 5. Update Record

```python
async def update(
    db: AsyncSession,
    id: int,
    obj_in: UpdateSchemaType,
    commit: bool = True
) -> Optional[ModelType]
```

**Features:**
- Partial updates (exclude_unset=True)
- Optional commit
- Returns updated object

**Example:**
```python
updated_report = await report_crud.update(
    db,
    report_id,
    ReportUpdate(status='resolved', severity='high')
)
```

---

#### 6. Delete Record

```python
async def delete(
    db: AsyncSession,
    id: int,
    commit: bool = True
) -> bool
```

**Features:**
- Soft delete support (if implemented)
- Returns success boolean

**Example:**
```python
success = await report_crud.delete(db, report_id)
```

---

## Model-Specific CRUD Operations

### 1. User CRUD

**File:** `app/crud/user.py`  
**Class:** `CRUDUser`

#### Specialized Methods

**Get by Phone:**
```python
async def get_by_phone(db: AsyncSession, phone: str) -> Optional[User]
```

**Get by Email:**
```python
async def get_by_email(db: AsyncSession, email: str) -> Optional[User]
```

**Create Minimal User (OTP signup):**
```python
async def create_minimal_user(
    db: AsyncSession,
    phone: str,
    commit: bool = True
) -> User
```

**Create with Password:**
```python
async def create_with_password(
    db: AsyncSession,
    obj_in: UserCreate,
    commit: bool = True
) -> User
```

**Create Officer:**
```python
async def create_officer(
    db: AsyncSession,
    obj_in: OfficerCreate,
    commit: bool = True
) -> User
```

**Authenticate:**
```python
async def authenticate(
    db: AsyncSession,
    phone: str,
    password: str
) -> Optional[User]
```

**Update Profile:**
```python
async def update_profile(
    db: AsyncSession,
    user_id: int,
    profile_data: UserProfileUpdate,
    commit: bool = True
) -> Optional[User]
```

**Update Reputation:**
```python
async def update_reputation(
    db: AsyncSession,
    user_id: int,
    points: int,
    commit: bool = True
) -> Optional[User]
```

**Change Role:**
```python
async def change_role(
    db: AsyncSession,
    user_id: int,
    new_role: UserRole,
    changed_by: int,
    reason: Optional[str] = None,
    automatic: bool = False,
    commit: bool = True
) -> Optional[User]
```

**Promote to Contributor:**
```python
async def promote_to_contributor(
    db: AsyncSession,
    user_id: int,
    automatic: bool = False,
    admin_id: Optional[int] = None,
    commit: bool = True
) -> Optional[User]
```

**Get Users by Role:**
```python
async def get_users_by_role(
    db: AsyncSession,
    role: UserRole,
    skip: int = 0,
    limit: int = 100
) -> List[User]
```

**Get Users by Reputation:**
```python
async def get_users_by_reputation(
    db: AsyncSession,
    min_reputation: int = 0,
    skip: int = 0,
    limit: int = 100
) -> List[User]
```

**Get Promotion Candidates:**
```python
async def get_promotion_candidates(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100
) -> List[User]
```

**Update Login Stats:**
```python
async def update_login_stats(
    db: AsyncSession,
    user_id: int,
    commit: bool = True
) -> Optional[User]
```

**Get User Stats:**
```python
async def get_user_stats(
    db: AsyncSession,
    user_id: int
) -> Optional[dict]
```

---

### 2. Report CRUD

**File:** `app/crud/report.py`  
**Class:** `CRUDReport`

#### Specialized Methods

**Get with Relations:**
```python
async def get_with_relations(
    db: AsyncSession,
    report_id: int
) -> Optional[Report]
```

**Get by Status:**
```python
async def get_by_status(
    db: AsyncSession,
    status: ReportStatus,
    skip: int = 0,
    limit: int = 100
) -> List[Report]
```

**Get by User:**
```python
async def get_by_user(
    db: AsyncSession,
    user_id: int,
    skip: int = 0,
    limit: int = 100
) -> List[Report]
```

**Get by Department:**
```python
async def get_by_department(
    db: AsyncSession,
    department_id: int,
    status: Optional[ReportStatus] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Report]
```

**Get Nearby (Geospatial):**
```python
async def get_nearby(
    db: AsyncSession,
    latitude: float,
    longitude: float,
    radius_meters: float = 1000,
    limit: int = 50
) -> List[Report]
```

**Search:**
```python
async def search(
    db: AsyncSession,
    query: str,
    filters: Optional[Dict[str, Any]] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Report]
```

**Count Search:**
```python
async def count_search(
    db: AsyncSession,
    query: str,
    filters: Optional[Dict[str, Any]] = None
) -> int
```

**Get Statistics:**
```python
async def get_statistics(
    db: AsyncSession,
    filters: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]
```

**Returns:**
```python
{
    'total': 100,
    'by_status': {'received': 20, 'in_progress': 30, ...},
    'by_category': {'roads': 40, 'water': 30, ...},
    'by_severity': {'low': 10, 'medium': 50, 'high': 30, 'critical': 10}
}
```

---

### 3. Task CRUD

**File:** `app/crud/task.py`  
**Class:** `CRUDTask`

#### Specialized Methods

**Get by Report:**
```python
async def get_by_report(
    db: AsyncSession,
    report_id: int
) -> Optional[Task]
```

**Get by Officer:**
```python
async def get_by_officer(
    db: AsyncSession,
    officer_id: int,
    status: Optional[TaskStatus] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Task]
```

**Get Pending Tasks:**
```python
async def get_pending_tasks(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100
) -> List[Task]
```

**Get Officer Workload:**
```python
async def get_officer_workload(
    db: AsyncSession,
    officer_id: int
) -> int
```

---

### 4. Department CRUD

**File:** `app/crud/department.py` (if exists)  
**Class:** `CRUDDepartment`

Uses base CRUD operations only.

---

### 5. Media CRUD

Uses base CRUD operations only.

---

### 6. Appeal CRUD

Uses base CRUD operations only (can be extended).

---

### 7. Escalation CRUD

Uses base CRUD operations only (can be extended).

---

## CRUD Singleton Instances

Each CRUD class has a singleton instance:

```python
# app/crud/user.py
user_crud = CRUDUser(User)

# app/crud/report.py
report_crud = CRUDReport(Report)

# app/crud/task.py
task_crud = CRUDTask(Task)

# app/crud/department.py
department_crud = CRUDDepartment(Department)
```

**Usage in API endpoints:**
```python
from app.crud.user import user_crud
from app.crud.report import report_crud

@router.get("/users/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await user_crud.get(db, user_id)
    if not user:
        raise NotFoundException("User not found")
    return user
```

---

## Transaction Management

### Basic Transaction

```python
async with AsyncSessionLocal() as session:
    try:
        # Multiple operations
        user = await user_crud.create(session, user_data, commit=False)
        report = await report_crud.create(session, report_data, commit=False)
        
        # Commit all at once
        await session.commit()
    except Exception:
        await session.rollback()
        raise
```

### Dependency Injection (FastAPI)

```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

---

## Query Patterns

### 1. Simple Query

```python
# Get all active users
users = await user_crud.get_multi(
    db,
    filters={'is_active': True}
)
```

### 2. Complex Query with Joins

```python
# Get reports with user and department
reports = await report_crud.get_multi(
    db,
    filters={'status': 'in_progress'},
    relationships=['user', 'department', 'media']
)
```

### 3. Geospatial Query

```python
# Get reports within 1km
nearby_reports = await report_crud.get_nearby(
    db,
    latitude=23.34,
    longitude=85.31,
    radius_meters=1000
)
```

### 4. Search Query

```python
# Search reports
results = await report_crud.search(
    db,
    query="pothole",
    filters={'status': 'in_progress', 'severity': 'critical'}
)
```

### 5. Aggregation Query

```python
# Get statistics
stats = await report_crud.get_statistics(
    db,
    filters={'created_at': '> 2024-01-01'}
)
```

---

## Performance Optimization

### 1. Eager Loading

**Bad (N+1 queries):**
```python
reports = await report_crud.get_multi(db)
for report in reports:
    user = report.user  # Triggers separate query
    department = report.department  # Triggers separate query
```

**Good (1 query):**
```python
reports = await report_crud.get_multi(
    db,
    relationships=['user', 'department']
)
for report in reports:
    user = report.user  # Already loaded
    department = report.department  # Already loaded
```

### 2. Pagination

Always use pagination for large datasets:
```python
page = 1
per_page = 20
skip = (page - 1) * per_page

reports = await report_crud.get_multi(db, skip=skip, limit=per_page)
total = await report_crud.count(db)
```

### 3. Selective Loading

Only load what you need:
```python
# Don't load relationships if not needed
reports = await report_crud.get_multi(db)  # Fast

# Load only specific relationships
reports = await report_crud.get_multi(
    db,
    relationships=['user']  # Don't load media if not needed
)
```

### 4. Indexing

All frequently queried fields are indexed:
- Foreign keys
- Status fields
- Severity fields
- Created_at timestamps
- Phone, email (unique)

---

## Bulk Operations

### Bulk Create

```python
async def bulk_create_reports(db: AsyncSession, reports_data: List[ReportCreate]):
    reports = [Report(**data.dict()) for data in reports_data]
    db.add_all(reports)
    await db.commit()
    return reports
```

### Bulk Update

```python
from sqlalchemy import update

async def bulk_update_status(
    db: AsyncSession,
    report_ids: List[int],
    new_status: ReportStatus
):
    stmt = (
        update(Report)
        .where(Report.id.in_(report_ids))
        .values(status=new_status, status_updated_at=datetime.utcnow())
    )
    await db.execute(stmt)
    await db.commit()
```

### Bulk Delete

```python
from sqlalchemy import delete

async def bulk_delete_reports(db: AsyncSession, report_ids: List[int]):
    stmt = delete(Report).where(Report.id.in_(report_ids))
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount
```

---

## Error Handling

### Not Found

```python
user = await user_crud.get(db, user_id)
if not user:
    raise NotFoundException("User not found")
```

### Duplicate Entry

```python
try:
    user = await user_crud.create(db, user_data)
except IntegrityError:
    raise ValidationException("Phone number already exists")
```

### Foreign Key Violation

```python
try:
    report = await report_crud.create(db, report_data)
except IntegrityError:
    raise ValidationException("Invalid user_id or department_id")
```

---

## CRUD Operations Summary

### Base Operations (All Models)
- ✅ `get(id)` - Get single record
- ✅ `get_multi(filters, pagination)` - Get multiple records
- ✅ `count(filters)` - Count records
- ✅ `create(data)` - Create record
- ✅ `update(id, data)` - Update record
- ✅ `delete(id)` - Delete record

### User-Specific Operations
- ✅ `get_by_phone(phone)`
- ✅ `get_by_email(email)`
- ✅ `create_minimal_user(phone)`
- ✅ `create_with_password(data)`
- ✅ `create_officer(data)`
- ✅ `authenticate(phone, password)`
- ✅ `update_profile(user_id, data)`
- ✅ `update_reputation(user_id, points)`
- ✅ `change_role(user_id, new_role, ...)`
- ✅ `promote_to_contributor(user_id)`
- ✅ `get_users_by_role(role)`
- ✅ `get_users_by_reputation(min_rep)`
- ✅ `get_promotion_candidates()`
- ✅ `update_login_stats(user_id)`
- ✅ `get_user_stats(user_id)`

### Report-Specific Operations
- ✅ `get_with_relations(report_id)`
- ✅ `get_by_status(status)`
- ✅ `get_by_user(user_id)`
- ✅ `get_by_department(dept_id)`
- ✅ `get_nearby(lat, lon, radius)`
- ✅ `search(query, filters)`
- ✅ `count_search(query, filters)`
- ✅ `get_statistics(filters)`

### Task-Specific Operations
- ✅ `get_by_report(report_id)`
- ✅ `get_by_officer(officer_id)`
- ✅ `get_pending_tasks()`
- ✅ `get_officer_workload(officer_id)`

---

**Next:** See `DATABASE_CONSTRAINTS_INDEXES.md` for detailed constraints and indexes.
