#!/usr/bin/env python3
"""
RBAC Migration Script
Adds SUPER_ADMIN role to database enum

This script updates the PostgreSQL enum type to include the new SUPER_ADMIN role.
Run this BEFORE restarting the server with the new code.
"""

import asyncio
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.core.database import engine
from app.config import settings


async def migrate_rbac():
    """Add SUPER_ADMIN to UserRole enum"""
    print("=" * 70)
    print("🔐 RBAC Migration: Adding SUPER_ADMIN Role")
    print("=" * 70)
    
    print(f"\nDatabase: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else 'localhost'}")
    print("\nThis will add 'super_admin' to the userrole enum type.")
    print("⚠️  Make sure no one is using the database during migration!")
    print("=" * 70)
    
    response = input("\nType 'YES' to proceed: ")
    
    if response != "YES":
        print("\n❌ Migration cancelled.")
        return
    
    print("\n🔄 Starting migration...")
    
    try:
        async with engine.begin() as conn:
            # Check if super_admin already exists
            check_query = text("""
                SELECT EXISTS (
                    SELECT 1 
                    FROM pg_enum 
                    WHERE enumlabel = 'super_admin' 
                    AND enumtypid = (
                        SELECT oid 
                        FROM pg_type 
                        WHERE typname = 'userrole'
                    )
                );
            """)
            
            result = await conn.execute(check_query)
            exists = result.scalar()
            
            if exists:
                print("✅ SUPER_ADMIN role already exists in database!")
                return
            
            # Add super_admin to enum
            print("\n📝 Adding 'super_admin' to userrole enum...")
            alter_query = text("""
                ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'super_admin';
            """)
            
            await conn.execute(alter_query)
            print("✅ Successfully added 'super_admin' to userrole enum")
            
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return
    
    print("\n" + "=" * 70)
    print("✅ RBAC Migration Complete!")
    print("=" * 70)
    print("\n📋 Summary:")
    print("  ✅ SUPER_ADMIN role added to database")
    print("  ✅ Database schema updated")
    print("\n🚀 Next steps:")
    print("  1. Restart the server: uvicorn app.main:app --reload")
    print("  2. Test the new RBAC system")
    print("  3. Create your first super admin user")
    print("")


async def create_super_admin():
    """Helper to create first super admin user"""
    print("\n" + "=" * 70)
    print("👤 Create First Super Admin User")
    print("=" * 70)
    
    phone = input("\nEnter phone number (e.g., +919876543210): ").strip()
    
    # Add +91 prefix if not present
    if not phone.startswith('+'):
        if phone.startswith('91'):
            phone = '+' + phone
        else:
            phone = '+91' + phone
    
    email = input("Enter email: ").strip()
    full_name = input("Enter full name: ").strip()
    password = input("Enter password (min 8 chars, max 20 chars): ").strip()
    
    if len(password) < 8:
        print("❌ Password must be at least 8 characters!")
        return
    
    if len(password) > 20:
        print("❌ Password too long! Maximum 20 characters.")
        return
    
    try:
        from app.crud.user import user_crud
        from app.core.security import get_password_hash
        from app.models.user import UserRole, ProfileCompletionLevel
        from app.core.database import get_db
        
        async with engine.begin() as conn:
            # This is a simplified version - in production, use proper CRUD
            insert_query = text("""
                INSERT INTO users (
                    phone, email, full_name, hashed_password, 
                    role, profile_completion, is_active, 
                    phone_verified, email_verified
                ) VALUES (
                    :phone, :email, :full_name, :password,
                    'super_admin', 'complete', true,
                    true, true
                ) RETURNING id;
            """)
            
            result = await conn.execute(insert_query, {
                "phone": phone,
                "email": email,
                "full_name": full_name,
                "password": get_password_hash(password)
            })
            
            user_id = result.scalar()
            
        print(f"\n✅ Super Admin created successfully!")
        print(f"   User ID: {user_id}")
        print(f"   Phone: {phone}")
        print(f"   Email: {email}")
        print(f"   Role: SUPER_ADMIN")
        
    except Exception as e:
        print(f"\n❌ Failed to create super admin: {e}")
        import traceback
        traceback.print_exc()


async def run_both():
    """Run both migration and user creation in same event loop"""
    await migrate_rbac()
    await create_super_admin()


if __name__ == "__main__":
    try:
        print("\n🔐 CivicLens RBAC Migration Tool\n")
        print("Options:")
        print("  1. Migrate database (add SUPER_ADMIN role)")
        print("  2. Create first super admin user")
        print("  3. Both")
        
        choice = input("\nSelect option (1/2/3): ").strip()
        
        if choice == "1":
            asyncio.run(migrate_rbac())
        elif choice == "2":
            asyncio.run(create_super_admin())
        elif choice == "3":
            asyncio.run(run_both())
        else:
            print("❌ Invalid option!")
            
    except KeyboardInterrupt:
        print("\n\n❌ Migration cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
