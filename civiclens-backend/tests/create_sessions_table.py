"""
Create Sessions Table Migration
Run this script to add the sessions table for session management
"""

import asyncio
from sqlalchemy import text
from app.core.database import engine


async def create_sessions_table():
    """Create sessions table for session management"""
    
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        jti VARCHAR(255) UNIQUE NOT NULL,
        refresh_token_jti VARCHAR(255) UNIQUE,
        device_info JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        login_method VARCHAR(50) DEFAULT 'password',
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """
    
    create_indexes_sql = [
        "CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_sessions_jti ON sessions(jti);",
        "CREATE INDEX IF NOT EXISTS idx_sessions_refresh_jti ON sessions(refresh_token_jti);",
        "CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);",
        "CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);"
    ]
    
    async with engine.begin() as conn:
        print("🔄 Creating sessions table...")
        await conn.execute(text(create_table_sql))
        print("✅ Sessions table created")
        
        print("🔄 Creating indexes...")
        for index_sql in create_indexes_sql:
            await conn.execute(text(index_sql))
        print("✅ Indexes created")
    
    print("\n✅ Migration complete!")
    print("📊 Sessions table is ready for use")


async def main():
    """Main migration function"""
    print("=" * 60)
    print("CivicLens - Sessions Table Migration")
    print("=" * 60)
    print()
    
    try:
        await create_sessions_table()
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
