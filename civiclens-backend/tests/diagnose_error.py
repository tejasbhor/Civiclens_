#!/usr/bin/env python3
"""
Diagnostic script to check what's causing the 500 error
"""

import asyncio
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db, get_redis, init_db
from app.crud.user import user_crud
from app.models.user import UserRole, ProfileCompletionLevel


async def test_database():
    """Test database operations"""
    print("=" * 60)
    print("Testing Database Operations")
    print("=" * 60)
    
    try:
        # Initialize database
        print("\n1. Initializing database tables...")
        await init_db()
        print("✅ Database tables initialized")
    except Exception as e:
        print(f"❌ Failed to initialize database: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    try:
        # Test creating a user
        print("\n2. Testing user creation...")
        async for db in get_db():
            # Check if user exists
            existing_user = await user_crud.get_by_phone(db, "+919999999999")
            if existing_user:
                print(f"✅ Found existing user: {existing_user.id}")
            else:
                print("Creating new test user...")
                user = await user_crud.create_minimal_user(db, "+919999999999")
                print(f"✅ Created user with ID: {user.id}")
                print(f"   Phone: {user.phone}")
                print(f"   Role: {user.role}")
                print(f"   Profile: {user.profile_completion}")
            break
    except Exception as e:
        print(f"❌ Failed to create user: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print("\n✅ All database operations successful!")
    return True


async def test_redis():
    """Test Redis operations"""
    print("\n" + "=" * 60)
    print("Testing Redis Operations")
    print("=" * 60)
    
    try:
        print("\n1. Connecting to Redis...")
        redis = await get_redis()
        print("✅ Connected to Redis")
        
        print("\n2. Testing PING...")
        await redis.ping()
        print("✅ Redis PING successful")
        
        print("\n3. Testing SET/GET...")
        await redis.setex("test_key", 60, "test_value")
        value = await redis.get("test_key")
        print(f"✅ SET/GET successful: {value}")
        
        print("\n4. Testing DELETE...")
        await redis.delete("test_key")
        print("✅ DELETE successful")
        
    except Exception as e:
        print(f"❌ Redis operation failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print("\n✅ All Redis operations successful!")
    return True


async def test_otp_workflow():
    """Test the complete OTP workflow"""
    print("\n" + "=" * 60)
    print("Testing OTP Workflow")
    print("=" * 60)
    
    try:
        from app.core.security import generate_otp
        from app.config import settings
        
        phone = "+919876543210"
        
        # Step 1: Generate OTP
        print("\n1. Generating OTP...")
        otp = generate_otp()
        print(f"✅ Generated OTP: {otp}")
        
        # Step 2: Store in Redis
        print("\n2. Storing OTP in Redis...")
        redis = await get_redis()
        redis_key = f"otp:{phone}"
        await redis.setex(redis_key, settings.OTP_EXPIRY_MINUTES * 60, otp)
        print(f"✅ Stored OTP with key: {redis_key}")
        
        # Step 3: Retrieve OTP
        print("\n3. Retrieving OTP from Redis...")
        stored_otp = await redis.get(redis_key)
        print(f"✅ Retrieved OTP: {stored_otp}")
        
        if stored_otp != otp:
            print(f"❌ OTP mismatch! Stored: {stored_otp}, Generated: {otp}")
            return False
        
        # Step 4: Create user
        print("\n4. Creating/getting user...")
        async for db in get_db():
            user = await user_crud.get_by_phone(db, phone)
            if not user:
                user = await user_crud.create_minimal_user(db, phone)
                print(f"✅ Created new user: {user.id}")
            else:
                print(f"✅ Found existing user: {user.id}")
            
            # Step 5: Update login stats
            print("\n5. Updating login stats...")
            await user_crud.update_login_stats(db, user.id)
            print("✅ Login stats updated")
            
            break
        
        # Step 6: Delete OTP
        print("\n6. Deleting OTP from Redis...")
        await redis.delete(redis_key)
        print("✅ OTP deleted")
        
    except Exception as e:
        print(f"❌ OTP workflow failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print("\n✅ Complete OTP workflow successful!")
    return True


async def main():
    """Run all diagnostic tests"""
    print("\n" + "=" * 60)
    print("CivicLens API Diagnostic Tool")
    print("=" * 60)
    
    results = []
    
    # Test database
    db_ok = await test_database()
    results.append(("Database", db_ok))
    
    # Test Redis
    redis_ok = await test_redis()
    results.append(("Redis", redis_ok))
    
    # Test OTP workflow
    if db_ok and redis_ok:
        otp_ok = await test_otp_workflow()
        results.append(("OTP Workflow", otp_ok))
    else:
        print("\n⚠️  Skipping OTP workflow test (dependencies failed)")
        results.append(("OTP Workflow", False))
    
    # Summary
    print("\n" + "=" * 60)
    print("Diagnostic Summary")
    print("=" * 60)
    
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name:20} - {status}")
    
    total = len(results)
    passed = sum(1 for _, p in results if p)
    
    print(f"\nTotal: {total} | Passed: {passed} | Failed: {total - passed}")
    
    if passed == total:
        print("\n✅ All diagnostics passed! The API should work correctly.")
        sys.exit(0)
    else:
        print("\n❌ Some diagnostics failed. Please fix the issues above.")
        sys.exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nDiagnostic interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nUnexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
