#!/usr/bin/env python3
"""
Production Setup Script for CivicLens Backend
==============================================

This script initializes the production environment by:
1. Validating database and Redis connectivity
2. Creating/updating database schema
3. Seeding initial data (departments, wards, areas)
4. Creating system users (AI Engine, Super Admin)
5. Verifying setup integrity

Usage:
    python setup_production.py [--skip-seed] [--non-interactive]

Options:
    --skip-seed         Skip data seeding (use if data already exists)
    --non-interactive   Run without prompts (requires env vars for admin)

Environment Variables (for non-interactive mode):
    ADMIN_PHONE         Super admin phone number
    ADMIN_EMAIL         Super admin email
    ADMIN_NAME          Super admin full name
    ADMIN_PASSWORD      Super admin password
    ADMIN_EMPLOYEE_ID   Super admin employee ID (optional)

Requirements:
    - PostgreSQL 14+ with PostGIS extension
    - Redis 6+ (optional but recommended)
    - .env file with valid configuration

Exit Codes:
    0 - Success
    1 - General error
    2 - Database connection failed
    3 - Validation failed
"""

import asyncio
import sys
import os
import logging
import argparse
from pathlib import Path
from datetime import datetime
from typing import Optional, Tuple

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import select, text
from sqlalchemy.exc import OperationalError, IntegrityError
from app.core.database import AsyncSessionLocal, engine, get_redis
from app.models.user import User, UserRole, ProfileCompletionLevel
from app.models.department import Department
from app.core.security import get_password_hash
from app.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('setup_production.log')
    ]
)
logger = logging.getLogger(__name__)


class ProductionSetup:
    """
    Production environment setup orchestrator.
    
    Handles database initialization, user creation, and validation
    for production deployment of CivicLens backend.
    """
    
    def __init__(self, skip_seed: bool = False, non_interactive: bool = False):
        """
        Initialize setup orchestrator.
        
        Args:
            skip_seed: Skip data seeding if True
            non_interactive: Run without user prompts if True
        """
        self.skip_seed = skip_seed
        self.non_interactive = non_interactive
        self.setup_complete = False
        self.ai_user_id: Optional[int] = None
        self.super_admin_id: Optional[int] = None
        
    async def run(self) -> int:
        """
        Execute complete production setup sequence.
        
        Returns:
            Exit code (0 for success, non-zero for failure)
        """
        logger.info("=" * 80)
        logger.info("CIVICLENS PRODUCTION SETUP")
        logger.info("=" * 80)
        logger.info(f"Environment: {settings.ENVIRONMENT}")
        logger.info(f"City Code: {settings.CITY_CODE}")
        logger.info(f"Skip Seed: {self.skip_seed}")
        logger.info(f"Non-Interactive: {self.non_interactive}")
        logger.info("=" * 80)
        
        try:
            # Step 1: Validate connections
            logger.info("Step 1/6: Validating service connections...")
            await self.check_connections()
            
            # Step 2: Initialize database schema
            logger.info("Step 2/6: Initializing database schema...")
            await self.initialize_database()
            
            # Step 3: Seed initial data
            if not self.skip_seed:
                logger.info("Step 3/6: Seeding initial data...")
                await self.seed_rmc_data()
            else:
                logger.info("Step 3/6: Skipping data seeding (--skip-seed flag)")
            
            # Step 4: Create AI Engine system user
            logger.info("Step 4/6: Creating AI Engine system user...")
            await self.create_ai_user()
            
            # Step 5: Create Super Admin user
            logger.info("Step 5/6: Creating Super Admin user...")
            await self.create_super_admin()
            
            # Step 6: Verify setup integrity
            logger.info("Step 6/6: Verifying setup integrity...")
            is_valid = await self.verify_setup()
            
            if not is_valid:
                logger.error("Setup validation failed")
                return 3
            
            # Print summary
            self.print_summary()
            
            self.setup_complete = True
            logger.info("Production setup completed successfully")
            return 0
            
        except KeyboardInterrupt:
            logger.warning("Setup cancelled by user")
            return 1
        except OperationalError as e:
            logger.error(f"Database connection failed: {str(e)}")
            return 2
        except Exception as e:
            logger.error(f"Setup failed: {str(e)}", exc_info=True)
            return 1
    
    async def check_connections(self) -> None:
        """
        Validate database and Redis connectivity.
        
        Raises:
            OperationalError: If database connection fails
        """
        # Validate PostgreSQL connection
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            logger.info("PostgreSQL connection validated successfully")
        except OperationalError as e:
            logger.error(f"PostgreSQL connection failed: {str(e)}")
            logger.error("Ensure PostgreSQL is running and credentials are correct")
            raise
        
        # Validate Redis connection (optional)
        try:
            redis = await get_redis()
            await redis.ping()
            logger.info("Redis connection validated successfully")
        except Exception as e:
            logger.warning(f"Redis connection failed: {str(e)}")
            logger.warning("Redis is optional but recommended for rate limiting")
    
    async def initialize_database(self) -> None:
        """
        Initialize database schema and create all tables.
        
        Raises:
            Exception: If database initialization fails
        """
        try:
            from app.core.database import init_db
            await init_db()
            logger.info("Database schema initialized successfully")
        except Exception as e:
            logger.error(f"Database initialization failed: {str(e)}")
            raise
    
    async def seed_rmc_data(self) -> None:
        """
        Seed Ranchi Municipal Corporation initial data.
        
        Seeds departments, wards, and area assignments.
        Non-critical - logs warning if fails.
        """
        try:
            from app.db.seeds.seed_ranchi_data import seed_ranchi_data
            await seed_ranchi_data()
            logger.info("Initial data seeded successfully")
        except Exception as e:
            logger.warning(f"Data seeding failed: {str(e)}")
            logger.warning("You may need to run seed script manually")
    
    async def create_ai_user(self) -> None:
        """
        Create or update AI Engine system user.
        
        This user is used for audit trails of automated AI actions.
        
        Raises:
            Exception: If user creation fails
        """
        async with AsyncSessionLocal() as db:
            try:
                # Check if AI Engine user exists
                result = await db.execute(
                    select(User).where(User.email == "ai-engine@civiclens.system")
                )
                existing_user = result.scalar_one_or_none()
                
                if existing_user:
                    logger.info(f"AI Engine user already exists (ID: {existing_user.id})")
                    self.ai_user_id = existing_user.id
                    
                    # Update configuration to ensure consistency
                    existing_user.full_name = "AI Engine"
                    existing_user.role = UserRole.ADMIN
                    existing_user.is_active = True
                    existing_user.phone_verified = True
                    existing_user.email_verified = True
                    existing_user.profile_completion = ProfileCompletionLevel.COMPLETE
                    await db.commit()
                    logger.info("AI Engine user configuration updated")
                    return
                
                # Create new AI Engine system user
                ai_user = User(
                    phone="+919999999999",
                    email="ai-engine@civiclens.system",
                    full_name="AI Engine",
                    employee_id="AI-SYS-001",
                    role=UserRole.ADMIN,
                    hashed_password=get_password_hash("AI_SYSTEM_USER_NO_LOGIN"),
                    department_id=None,
                    phone_verified=True,
                    email_verified=True,
                    is_active=True,
                    profile_completion=ProfileCompletionLevel.COMPLETE,
                    account_created_via="system_seed"
                )
                
                db.add(ai_user)
                await db.commit()
                await db.refresh(ai_user)
                
                self.ai_user_id = ai_user.id
                logger.info(f"AI Engine user created successfully (ID: {ai_user.id})")
                
            except Exception as e:
                logger.error(f"Failed to create AI Engine user: {str(e)}")
                await db.rollback()
                raise
    
    async def create_super_admin(self) -> None:
        """
        Create Super Admin user.
        
        Interactive mode: Prompts for user details
        Non-interactive mode: Reads from environment variables
        
        Raises:
            Exception: If user creation fails
        """
        async with AsyncSessionLocal() as db:
            try:
                # Check for existing Super Admins
                result = await db.execute(
                    select(User).where(User.role == UserRole.SUPER_ADMIN)
                )
                existing_admins = result.scalars().all()
                
                if existing_admins and not self.non_interactive:
                    logger.info(f"Found {len(existing_admins)} existing Super Admin(s)")
                    for admin in existing_admins:
                        logger.info(f"  - {admin.full_name} ({admin.phone}) [ID: {admin.id}]")
                    
                    create_another = input("\nCreate another Super Admin? (yes/no): ").strip().lower()
                    if create_another != 'yes':
                        self.super_admin_id = existing_admins[0].id
                        logger.info("Using existing Super Admin")
                        return
                
                # Get admin details
                if self.non_interactive:
                    phone, email, full_name, employee_id, password = self._get_admin_from_env()
                else:
                    phone, email, full_name, employee_id, password = self._get_admin_interactive()
                
                # Check for duplicate phone
                result = await db.execute(
                    select(User).where(User.phone == phone)
                )
                existing = result.scalar_one_or_none()
                
                if existing:
                    logger.warning(f"User with phone {phone} already exists (Role: {existing.role.value})")
                    if not self.non_interactive:
                        upgrade = input("Upgrade to SUPER_ADMIN? (yes/no): ").strip().lower()
                        if upgrade == 'yes':
                            existing.role = UserRole.SUPER_ADMIN
                            existing.hashed_password = get_password_hash(password)
                            await db.commit()
                            self.super_admin_id = existing.id
                            logger.info(f"User upgraded to SUPER_ADMIN (ID: {existing.id})")
                    return
                
                # Create new Super Admin
                super_admin = User(
                    phone=phone,
                    email=email,
                    full_name=full_name,
                    employee_id=employee_id,
                    role=UserRole.SUPER_ADMIN,
                    hashed_password=get_password_hash(password),
                    department_id=None,
                    phone_verified=True,
                    email_verified=True,
                    is_active=True,
                    profile_completion=ProfileCompletionLevel.COMPLETE,
                    account_created_via="production_setup"
                )
                
                db.add(super_admin)
                await db.commit()
                await db.refresh(super_admin)
                
                self.super_admin_id = super_admin.id
                logger.info(f"Super Admin created successfully (ID: {super_admin.id})")
                logger.info(f"  Phone: {super_admin.phone}")
                logger.info(f"  Email: {super_admin.email}")
                
            except Exception as e:
                logger.error(f"Failed to create Super Admin: {str(e)}")
                await db.rollback()
                raise
    
    def _get_admin_from_env(self) -> Tuple[str, str, str, Optional[str], str]:
        """
        Get Super Admin details from environment variables.
        
        Returns:
            Tuple of (phone, email, full_name, employee_id, password)
        
        Raises:
            ValueError: If required environment variables are missing
        """
        phone = os.getenv('ADMIN_PHONE')
        email = os.getenv('ADMIN_EMAIL')
        full_name = os.getenv('ADMIN_NAME')
        password = os.getenv('ADMIN_PASSWORD')
        employee_id = os.getenv('ADMIN_EMPLOYEE_ID')
        
        if not all([phone, email, full_name, password]):
            raise ValueError("Missing required environment variables for non-interactive mode")
        
        if not phone.startswith('+'):
            phone = '+91' + phone if phone.startswith('91') else '+91' + phone
        
        return phone, email, full_name, employee_id, password
    
    def _get_admin_interactive(self) -> Tuple[str, str, str, Optional[str], str]:
        """
        Get Super Admin details interactively from user input.
        
        Returns:
            Tuple of (phone, email, full_name, employee_id, password)
        """
        logger.info("Enter Super Admin details:")
        logger.info("-" * 70)
        
        phone = input("Phone number (e.g., +919876543210): ").strip()
        if not phone.startswith('+'):
            phone = '+91' + phone if phone.startswith('91') else '+91' + phone
        
        email = input("Email: ").strip()
        full_name = input("Full name: ").strip()
        employee_id = input("Employee ID (optional): ").strip() or None
        
        # Password with confirmation
        while True:
            password = input("Password (min 12 chars): ").strip()
            if len(password) < 12:
                logger.error("Password must be at least 12 characters")
                continue
            password_confirm = input("Confirm password: ").strip()
            if password != password_confirm:
                logger.error("Passwords don't match")
                continue
            break
        
        return phone, email, full_name, employee_id, password
    
    async def verify_setup(self) -> bool:
        """
        Verify setup integrity and configuration.
        
        Returns:
            True if all verifications pass, False otherwise
        """
        async with AsyncSessionLocal() as db:
            issues = []
            
            # Verify AI Engine user
            result = await db.execute(
                select(User).where(User.id == self.ai_user_id)
            )
            ai_user = result.scalar_one_or_none()
            if not ai_user or ai_user.role != UserRole.ADMIN:
                issues.append("AI Engine user not properly configured")
                logger.error("AI Engine user verification failed")
            else:
                logger.info(f"AI Engine user verified (ID: {ai_user.id})")
            
            # Verify Super Admin
            result = await db.execute(
                select(User).where(User.id == self.super_admin_id)
            )
            super_admin = result.scalar_one_or_none()
            if not super_admin or super_admin.role != UserRole.SUPER_ADMIN:
                issues.append("Super Admin not properly configured")
                logger.error("Super Admin verification failed")
            else:
                logger.info(f"Super Admin verified (ID: {super_admin.id})")
            
            # Verify departments
            result = await db.execute(select(Department))
            departments = result.scalars().all()
            if len(departments) < 6:
                issues.append(f"Only {len(departments)} departments found (expected 6+)")
                logger.warning(f"Department count below expected: {len(departments)}/6")
            else:
                logger.info(f"Departments verified ({len(departments)} departments)")
            
            if issues:
                logger.warning("Setup completed with warnings:")
                for issue in issues:
                    logger.warning(f"  - {issue}")
                return False
            else:
                logger.info("All verifications passed successfully")
                return True
    
    def print_summary(self) -> None:
        """
        Print setup completion summary and next steps.
        """
        logger.info("=" * 80)
        logger.info("PRODUCTION SETUP COMPLETE")
        logger.info("=" * 80)
        
        logger.info("\nSetup Summary:")
        logger.info(f"  Environment: {settings.ENVIRONMENT}")
        logger.info(f"  City Code: {settings.CITY_CODE}")
        logger.info(f"  AI Engine User ID: {self.ai_user_id}")
        logger.info(f"  Super Admin User ID: {self.super_admin_id}")
        
        logger.info("\nNext Steps:")
        logger.info("  1. Review .env file for production settings:")
        logger.info("     - Set DEBUG=false")
        logger.info("     - Set ENVIRONMENT=production")
        logger.info("     - Configure CORS_ORIGINS with production URLs")
        logger.info("     - Enable HTTPS_ONLY=true")
        logger.info("     - Enable SECURE_COOKIES=true")
        logger.info("     - Configure ADMIN_IP_WHITELIST if needed")
        
        logger.info("\n  2. Start the application:")
        logger.info("     gunicorn app.main:app -c gunicorn_config.py")
        logger.info("     OR: uvicorn app.main:app --host 0.0.0.0 --port 8000")
        
        logger.info("\n  3. (Optional) Start AI worker:")
        logger.info("     python -m app.workers.ai_worker")
        
        logger.info("\n  4. Access the API:")
        logger.info("     - API: http://localhost:8000")
        logger.info("     - Health: http://localhost:8000/health")
        logger.info("     - Docs: http://localhost:8000/docs (if DEBUG=true)")
        
        logger.info("\n  5. Login with Super Admin credentials")
        
        logger.info("\n" + "=" * 80)
        logger.info("Backend is ready for production deployment")
        logger.info("=" * 80)


async def main() -> int:
    """
    Main entry point for production setup.
    
    Returns:
        Exit code (0 for success, non-zero for failure)
    """
    parser = argparse.ArgumentParser(
        description='CivicLens Production Setup Script',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  python setup_production.py
  python setup_production.py --skip-seed
  python setup_production.py --non-interactive
        '''
    )
    parser.add_argument(
        '--skip-seed',
        action='store_true',
        help='Skip data seeding (use if data already exists)'
    )
    parser.add_argument(
        '--non-interactive',
        action='store_true',
        help='Run without prompts (requires environment variables)'
    )
    
    args = parser.parse_args()
    
    setup = ProductionSetup(
        skip_seed=args.skip_seed,
        non_interactive=args.non_interactive
    )
    return await setup.run()


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        logger.warning("Setup cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Setup failed: {str(e)}", exc_info=True)
        sys.exit(1)
