"""
Create Sync Tables Migration
Run this script to add offline-first sync tables
"""

import asyncio
from sqlalchemy import text
from app.core.database import engine


async def create_sync_tables():
    """Create sync tables for offline-first mobile support"""
    
    # Client Sync State Table
    create_sync_state_sql = """
    CREATE TABLE IF NOT EXISTS client_sync_state (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id VARCHAR(255) NOT NULL,
        last_sync_timestamp TIMESTAMP WITH TIME ZONE,
        last_upload_timestamp TIMESTAMP WITH TIME ZONE,
        last_download_timestamp TIMESTAMP WITH TIME ZONE,
        sync_version INTEGER DEFAULT 1 NOT NULL,
        device_info JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, device_id)
    );
    """
    
    # Sync Conflicts Table
    create_conflicts_sql = """
    CREATE TABLE IF NOT EXISTS sync_conflicts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id VARCHAR(255) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER NOT NULL,
        client_version JSONB NOT NULL,
        server_version JSONB NOT NULL,
        resolution_strategy VARCHAR(50),
        resolved BOOLEAN DEFAULT FALSE NOT NULL,
        resolved_at TIMESTAMP WITH TIME ZONE,
        resolved_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """
    
    # Offline Actions Log Table
    create_actions_sql = """
    CREATE TABLE IF NOT EXISTS offline_actions_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id VARCHAR(255) NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(255) NOT NULL,
        payload JSONB NOT NULL,
        processed BOOLEAN DEFAULT FALSE NOT NULL,
        processed_at TIMESTAMP WITH TIME ZONE,
        result JSONB,
        error_message TEXT,
        priority INTEGER DEFAULT 0 NOT NULL,
        retry_count INTEGER DEFAULT 0 NOT NULL,
        max_retries INTEGER DEFAULT 3 NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """
    
    # Indexes
    create_indexes_sql = [
        "CREATE INDEX IF NOT EXISTS idx_sync_state_user_id ON client_sync_state(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_sync_state_device_id ON client_sync_state(device_id);",
        "CREATE INDEX IF NOT EXISTS idx_conflicts_user_id ON sync_conflicts(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_conflicts_resolved ON sync_conflicts(resolved);",
        "CREATE INDEX IF NOT EXISTS idx_actions_user_id ON offline_actions_log(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_actions_device_id ON offline_actions_log(device_id);",
        "CREATE INDEX IF NOT EXISTS idx_actions_processed ON offline_actions_log(processed);"
    ]
    
    async with engine.begin() as conn:
        print("🔄 Creating client_sync_state table...")
        await conn.execute(text(create_sync_state_sql))
        print("✅ client_sync_state table created")
        
        print("🔄 Creating sync_conflicts table...")
        await conn.execute(text(create_conflicts_sql))
        print("✅ sync_conflicts table created")
        
        print("🔄 Creating offline_actions_log table...")
        await conn.execute(text(create_actions_sql))
        print("✅ offline_actions_log table created")
        
        print("🔄 Creating indexes...")
        for index_sql in create_indexes_sql:
            await conn.execute(text(index_sql))
        print("✅ Indexes created")
    
    print("\n✅ Migration complete!")
    print("📊 Sync tables are ready for offline-first mobile support")


async def main():
    """Main migration function"""
    print("=" * 60)
    print("CivicLens - Offline Sync Tables Migration")
    print("=" * 60)
    print()
    
    try:
        await create_sync_tables()
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
