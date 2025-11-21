"""
Seed script to populate Navi Mumbai Municipal Corporation data
Run this script to populate departments and officers

Usage:
    python -m app.db.seeds.seed_navimumbai_data
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.department import Department
from app.models.user import User, UserRole, ProfileCompletionLevel
from app.core.security import get_password_hash
from app.db.seeds.navimumbai_departments import DEPARTMENTS, OFFICERS

# Import all models to ensure relationships are resolved
# This is needed for SQLAlchemy to properly initialize relationships
from app.models import (
    Department, Report, Task, Session, Notification, Feedback,
    Appeal, Escalation, AreaAssignment, RoleHistory, Media,
    ReportStatusHistory, ClientSyncState, AuditLog
)


async def seed_departments(db: AsyncSession):
    """Seed departments"""
    print("\n📊 Seeding Departments...")
    print("=" * 60)
    
    created_count = 0
    skipped_count = 0
    
    for dept_data in DEPARTMENTS:
        # Check if department already exists
        result = await db.execute(
            select(Department).where(Department.name == dept_data["name"])
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            print(f"⏭️  Skipped: {dept_data['name']} (already exists)")
            skipped_count += 1
            continue
        
        # Create new department
        department = Department(**dept_data)
        db.add(department)
        created_count += 1
        print(f"✅ Created: {dept_data['name']}")
    
    await db.commit()
    
    print("\n" + "=" * 60)
    print(f"✅ Departments seeded: {created_count} created, {skipped_count} skipped")
    print("=" * 60)


async def seed_officers(db: AsyncSession):
    """Seed officers"""
    print("\n👮 Seeding Officers...")
    print("=" * 60)
    
    created_count = 0
    skipped_count = 0
    
    # Get all departments for mapping
    result = await db.execute(select(Department))
    departments = {dept.name: dept for dept in result.scalars().all()}
    
    for officer_data in OFFICERS:
        # Check if officer already exists (by phone or email)
        result = await db.execute(
            select(User).where(
                (User.phone == officer_data["phone"]) | 
                (User.email == officer_data["email"])
            )
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            print(f"⏭️  Skipped: {officer_data['full_name']} (already exists)")
            skipped_count += 1
            continue
        
        # Get department ID
        dept_name = officer_data.pop("department_name")
        department = departments.get(dept_name)
        
        if not department:
            print(f"⚠️  Warning: Department '{dept_name}' not found for {officer_data['full_name']}")
            continue
        
        # Hash password
        password = officer_data.pop("password")
        hashed_password = get_password_hash(password)
        
        # Create officer
        officer = User(
            phone=officer_data["phone"],
            email=officer_data["email"],
            full_name=officer_data["full_name"],
            employee_id=officer_data["employee_id"],
            role=UserRole(officer_data["role"]),
            hashed_password=hashed_password,
            department_id=department.id,
            phone_verified=True,
            email_verified=True,
            profile_completion=ProfileCompletionLevel.COMPLETE,
            account_created_via="admin_seed"
        )
        
        db.add(officer)
        created_count += 1
        print(f"✅ Created: {officer_data['full_name']} ({officer_data['employee_id']}) - {dept_name}")
    
    await db.commit()
    
    print("\n" + "=" * 60)
    print(f"✅ Officers seeded: {created_count} created, {skipped_count} skipped")
    print("=" * 60)


async def seed_super_admin(db: AsyncSession):
    """Seed super admin user (IDEMPOTENT - can run multiple times)"""
    print("\n👑 Creating Super Admin...")
    print("=" * 60)
    
    # Check if super admin already exists
    result = await db.execute(
        select(User).where(User.role == UserRole.SUPER_ADMIN)
    )
    existing_admin = result.scalar_one_or_none()
    
    if existing_admin:
        print(f"⏭️  Super Admin already exists: {existing_admin.email}")
        return existing_admin.id
    
    # Create super admin
    super_admin = User(
        phone="+919999999999",
        email="admin@civiclens.gov.in",
        full_name="System Administrator",
        employee_id="ADMIN-001",
        role=UserRole.SUPER_ADMIN,
        hashed_password=get_password_hash("Admin123!"),
        phone_verified=True,
        email_verified=True,
        profile_completion=ProfileCompletionLevel.COMPLETE,
        account_created_via="system_seed"
    )
    
    db.add(super_admin)
    await db.commit()
    
    print("✅ Super Admin created:")
    print(f"   📧 Email: {super_admin.email}")
    print(f"   📱 Phone: {super_admin.phone}")
    print(f"   🔑 Password: Admin123!")
    print(f"   👤 Name: {super_admin.full_name}")
    print("=" * 60)
    return super_admin.id


async def seed_ai_system_user(db: AsyncSession):
    """Seed AI Engine system user (IDEMPOTENT - can run multiple times)"""
    print("\n🤖 Creating AI Engine System User...")
    print("=" * 60)
    
    AI_EMAIL = "ai-engine@civiclens.system"
    AI_PHONE = "+919999999998"
    AI_EMPLOYEE_ID = "AI-SYS-001"
    
    # Check if AI user already exists (by email, phone, or employee_id)
    result = await db.execute(
        select(User).where(
            (User.email == AI_EMAIL) |
            (User.phone == AI_PHONE) |
            (User.employee_id == AI_EMPLOYEE_ID)
        )
    )
    existing_users = result.scalars().all()
    
    # Handle existing user
    if existing_users:
        existing_user = existing_users[0]
        print(f"⏭️  AI Engine user already exists (ID: {existing_user.id})")
        
        # Update to ensure consistency
        existing_user.email = AI_EMAIL
        existing_user.phone = AI_PHONE
        existing_user.employee_id = AI_EMPLOYEE_ID
        existing_user.full_name = "AI Engine"
        existing_user.role = UserRole.ADMIN
        existing_user.is_active = True
        existing_user.phone_verified = True
        existing_user.email_verified = True
        existing_user.profile_completion = ProfileCompletionLevel.COMPLETE
        
        await db.commit()
        print(f"   ✅ Updated AI Engine user configuration")
        return existing_user.id
    
    # Create new AI Engine user
    ai_user = User(
        phone=AI_PHONE,
        email=AI_EMAIL,
        full_name="AI Engine",
        employee_id=AI_EMPLOYEE_ID,
        role=UserRole.ADMIN,
        hashed_password=get_password_hash("AI_SYSTEM_USER_NO_LOGIN"),
        department_id=None,  # System user, not tied to department
        phone_verified=True,
        email_verified=True,
        is_active=True,
        profile_completion=ProfileCompletionLevel.COMPLETE,
        account_created_via="system_seed"
    )
    
    db.add(ai_user)
    await db.commit()
    
    print("✅ AI Engine user created:")
    print(f"   📧 Email: {ai_user.email}")
    print(f"   📱 Phone: {ai_user.phone}")
    print(f"   🆔 Employee ID: {ai_user.employee_id}")
    print(f"   👤 Name: {ai_user.full_name}")
    print(f"   🔐 Role: {ai_user.role.value}")
    print("\n   💡 This user will appear in audit trails when AI performs actions:")
    print('      • "Classified by: AI Engine"')
    print('      • "Assigned to department by: AI Engine"')
    print("=" * 60)
    return ai_user.id


async def seed_navimumbai_data():
    """Seed all Navi Mumbai Municipal Corporation data"""
    print("\n" + "=" * 60)
    print("🏛️  NAVI MUMBAI MUNICIPAL CORPORATION - DATA SEEDING")
    print("=" * 60)
    print("Area: 146 sq km")
    print("Population: 1,200,000+ (approx)")
    print("Wards: 118")
    print("Zones: 2 (Vashi and CBD Belapur)")
    print("=" * 60)
    
    async with AsyncSessionLocal() as db:
        try:
            # Seed departments first
            await seed_departments(db)
            
            # Then seed officers
            await seed_officers(db)
            
            # Create super admin user
            await seed_super_admin(db)
            
            # Create AI Engine system user
            await seed_ai_system_user(db)
            
            # Summary
            print("\n" + "=" * 60)
            print("🎉 SEEDING COMPLETE!")
            print("=" * 60)
            
            # Count totals
            dept_result = await db.execute(select(Department))
            officer_result = await db.execute(
                select(User).where(User.role == UserRole.NODAL_OFFICER)
            )
            
            total_depts = len(dept_result.scalars().all())
            total_officers = len(officer_result.scalars().all())
            
            print(f"📊 Total Departments: {total_depts}")
            print(f"👮 Total Officers: {total_officers}")
            print("\n✅ Database is ready for CivicLens!")
            print("=" * 60)
            
        except Exception as e:
            print(f"\n❌ Error during seeding: {str(e)}")
            await db.rollback()
            raise


async def clear_all():
    """Clear all seeded data (use with caution!)"""
    print("\n⚠️  WARNING: This will delete all departments and officers!")
    confirm = input("Type 'YES' to confirm: ")
    
    if confirm != "YES":
        print("❌ Aborted")
        return
    
    async with AsyncSessionLocal() as db:
        try:
            # Delete all officers
            result = await db.execute(
                select(User).where(User.role == UserRole.NODAL_OFFICER)
            )
            officers = result.scalars().all()
            for officer in officers:
                await db.delete(officer)
            
            # Delete all departments
            result = await db.execute(select(Department))
            departments = result.scalars().all()
            for dept in departments:
                await db.delete(dept)
            
            await db.commit()
            print("✅ All data cleared")
            
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            await db.rollback()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--clear":
        asyncio.run(clear_all())
    else:
        asyncio.run(seed_navimumbai_data())
