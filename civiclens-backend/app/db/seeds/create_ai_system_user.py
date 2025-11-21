"""
Create AI Engine System User
This user will be shown in audit trails for all AI-automated actions

Usage:
    python -m app.db.seeds.create_ai_system_user
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User, UserRole, ProfileCompletionLevel
from app.core.security import get_password_hash


async def create_ai_system_user():
    """Create or update AI Engine system user"""
    print("\n" + "=" * 60)
    print("🤖 CREATING AI ENGINE SYSTEM USER")
    print("=" * 60)
    
    async with AsyncSessionLocal() as db:
        try:
            # Check if AI Engine user already exists
            result = await db.execute(
                select(User).where(User.email == "ai-engine@civiclens.system")
            )
            existing_user = result.scalar_one_or_none()
            
            if existing_user:
                print(f"✅ AI Engine user already exists (ID: {existing_user.id})")
                print(f"   Name: {existing_user.full_name}")
                print(f"   Email: {existing_user.email}")
                print(f"   Role: {existing_user.role.value}")
                print(f"   Employee ID: {existing_user.employee_id}")
                
                # Update if needed
                existing_user.full_name = "AI Engine"
                existing_user.role = UserRole.ADMIN
                existing_user.is_active = True
                existing_user.phone_verified = True
                existing_user.email_verified = True
                existing_user.profile_completion = ProfileCompletionLevel.COMPLETE
                
                await db.commit()
                print("\n✅ AI Engine user updated successfully")
                return existing_user.id
            
            # Create new AI Engine user with unique phone number
            ai_user = User(
                phone="+919999999998",  # AI System phone number (different from super admin)
                email="ai-engine@civiclens.system",
                full_name="AI Engine",
                employee_id="AI-SYS-001",
                role=UserRole.ADMIN,
                hashed_password=get_password_hash("AI_SYSTEM_USER_NO_LOGIN"),  # Cannot be used to login
                department_id=None,  # System user, not tied to department
                phone_verified=True,
                email_verified=True,
                is_active=True,
                profile_completion=ProfileCompletionLevel.COMPLETE,
                account_created_via="system_seed"
            )
            
            db.add(ai_user)
            await db.commit()
            await db.refresh(ai_user)
            
            print("\n✅ AI Engine user created successfully!")
            print(f"   User ID: {ai_user.id}")
            print(f"   Name: {ai_user.full_name}")
            print(f"   Email: {ai_user.email}")
            print(f"   Employee ID: {ai_user.employee_id}")
            print(f"   Role: {ai_user.role.value}")
            
            print("\n" + "=" * 60)
            print("🎉 AI ENGINE USER READY")
            print("=" * 60)
            print("\nThis user will appear in audit trails as:")
            print('  "AI Engine" when AI performs automated actions')
            print("\nAudit trail examples:")
            print('  • "Classified by: AI Engine"')
            print('  • "Assigned to department by: AI Engine"')
            print('  • "Duplicate detected by: AI Engine"')
            print("=" * 60)
            
            return ai_user.id
            
        except Exception as e:
            print(f"\n❌ Error creating AI Engine user: {str(e)}")
            await db.rollback()
            raise


async def verify_ai_user():
    """Verify AI Engine user exists and is properly configured"""
    print("\n" + "=" * 60)
    print("🔍 VERIFYING AI ENGINE USER")
    print("=" * 60)
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.email == "ai-engine@civiclens.system")
        )
        ai_user = result.scalar_one_or_none()
        
        if not ai_user:
            print("❌ AI Engine user not found!")
            return False
        
        print(f"✅ AI Engine user found (ID: {ai_user.id})")
        print(f"   Name: {ai_user.full_name}")
        print(f"   Email: {ai_user.email}")
        print(f"   Role: {ai_user.role.value}")
        print(f"   Active: {ai_user.is_active}")
        print(f"   Employee ID: {ai_user.employee_id}")
        
        # Verify it's an admin
        if ai_user.role != UserRole.ADMIN:
            print("⚠️  Warning: AI Engine user should be ADMIN role")
            return False
        
        # Verify it's active
        if not ai_user.is_active:
            print("⚠️  Warning: AI Engine user should be active")
            return False
        
        print("\n✅ AI Engine user is properly configured!")
        return True


if __name__ == "__main__":
    print("\n🚀 Starting AI Engine User Setup...")
    
    try:
        # Create AI user
        user_id = asyncio.run(create_ai_system_user())
        
        # Verify it was created correctly
        is_valid = asyncio.run(verify_ai_user())
        
        if is_valid:
            print("\n✅ Setup complete! AI Engine user is ready for production.")
            print(f"\n💡 The AI worker will now use User ID: {user_id} for all automated actions.")
        else:
            print("\n⚠️  Setup completed with warnings. Please review the configuration.")
            
    except Exception as e:
        print(f"\n❌ Setup failed: {str(e)}")
        sys.exit(1)
