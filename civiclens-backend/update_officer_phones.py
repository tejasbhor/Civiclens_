#!/usr/bin/env python3
"""
Update existing officers' phone numbers to correct format (remove dashes)
Run this to fix phone numbers in existing database
"""
import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User, UserRole

# Import all models to ensure relationships are resolved
from app.models import (
    User, Department, Report, Task, Session, Notification, Feedback,
    Appeal, Escalation, AreaAssignment, RoleHistory, Media,
    ReportStatusHistory, ClientSyncState, AuditLog
)
import re

async def update_officer_phones():
    """Update all officer phone numbers to remove dashes"""
    print("\n" + "=" * 60)
    print("📱 UPDATING OFFICER PHONE NUMBERS")
    print("=" * 60)
    
    updated_count = 0
    skipped_count = 0
    error_count = 0
    
    async with AsyncSessionLocal() as db:
        try:
            # Get all officers
            result = await db.execute(
                select(User).where(User.role == UserRole.NODAL_OFFICER)
            )
            officers = result.scalars().all()
            
            for officer in officers:
                old_phone = officer.phone
                # Remove dashes from phone number
                new_phone = old_phone.replace('-', '')
                
                if old_phone == new_phone:
                    # Already in correct format
                    skipped_count += 1
                    continue
                
                # Check if the new phone number already exists (to avoid conflicts)
                existing_check = await db.execute(
                    select(User).where(User.phone == new_phone)
                )
                existing_user = existing_check.scalar_one_or_none()
                
                if existing_user and existing_user.id != officer.id:
                    print(f"⚠️  Skipping {officer.full_name}: Phone {new_phone} already exists (belongs to {existing_user.full_name})")
                    skipped_count += 1
                    continue
                
                try:
                    print(f"Updating {officer.full_name}: {old_phone} -> {new_phone}")
                    officer.phone = new_phone
                    # Commit each update individually to avoid batch conflicts
                    await db.commit()
                    await db.refresh(officer)
                    updated_count += 1
                except Exception as e:
                    print(f"❌ Error updating {officer.full_name}: {str(e)}")
                    await db.rollback()
                    error_count += 1
                    continue
            
            print("\n" + "=" * 60)
            print(f"✅ Updated: {updated_count} officers")
            print(f"⏭️  Skipped: {skipped_count} officers (already correct or conflicts)")
            if error_count > 0:
                print(f"❌ Errors: {error_count} officers")
            print("=" * 60)
            
        except Exception as e:
            print(f"\n❌ Fatal Error: {str(e)}")
            await db.rollback()
            raise

if __name__ == "__main__":
    asyncio.run(update_officer_phones())

