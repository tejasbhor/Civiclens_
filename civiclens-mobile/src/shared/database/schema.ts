// Database schema for CivicLens Mobile App
// Using expo-sqlite with encryption support

export const DATABASE_NAME = 'civiclens.db';
export const DATABASE_VERSION = 1;

// SQL statements for creating tables
export const CREATE_TABLES = {
  reports: `
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_number TEXT,
      user_id INTEGER NOT NULL,
      department_id INTEGER,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT,
      sub_category TEXT,
      severity TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      address TEXT NOT NULL,
      landmark TEXT,
      ward_number TEXT,
      status TEXT NOT NULL,
      status_updated_at INTEGER,
      photos TEXT NOT NULL,
      videos TEXT,
      ai_category TEXT,
      ai_confidence REAL,
      ai_processed_at INTEGER,
      is_public INTEGER NOT NULL DEFAULT 1,
      is_sensitive INTEGER NOT NULL DEFAULT 0,
      is_synced INTEGER NOT NULL DEFAULT 0,
      local_id TEXT,
      sync_error TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `,

  tasks: `
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      assigned_to INTEGER NOT NULL,
      assigned_by INTEGER,
      status TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 5,
      notes TEXT,
      resolution_notes TEXT,
      rejection_reason TEXT,
      before_photos TEXT NOT NULL,
      after_photos TEXT NOT NULL,
      checklist TEXT NOT NULL,
      assigned_at INTEGER NOT NULL,
      acknowledged_at INTEGER,
      started_at INTEGER,
      resolved_at INTEGER,
      rejected_at INTEGER,
      sla_deadline INTEGER,
      sla_violated INTEGER NOT NULL DEFAULT 0,
      is_synced INTEGER NOT NULL DEFAULT 0,
      pending_sync TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `,

  sync_queue: `
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_type TEXT NOT NULL,
      operation TEXT NOT NULL,
      data TEXT NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_attempt INTEGER,
      error TEXT,
      created_at INTEGER NOT NULL
    );
  `,

  cache_data: `
    CREATE TABLE IF NOT EXISTS cache_data (
      key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      expires_at INTEGER
    );
  `,
};

// Indexes for better query performance
export const CREATE_INDEXES = {
  reports_user_id: 'CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);',
  reports_is_synced: 'CREATE INDEX IF NOT EXISTS idx_reports_is_synced ON reports(is_synced);',
  reports_status: 'CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);',
  reports_created_at: 'CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);',
  
  tasks_assigned_to: 'CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);',
  tasks_is_synced: 'CREATE INDEX IF NOT EXISTS idx_tasks_is_synced ON tasks(is_synced);',
  tasks_status: 'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);',
  
  sync_queue_item_type: 'CREATE INDEX IF NOT EXISTS idx_sync_queue_item_type ON sync_queue(item_type);',
  
  cache_data_expires_at: 'CREATE INDEX IF NOT EXISTS idx_cache_data_expires_at ON cache_data(expires_at);',
};

// Enums
export enum ReportCategory {
  ROADS = 'roads',
  WATER = 'water',
  SANITATION = 'sanitation',
  ELECTRICITY = 'electricity',
  STREETLIGHT = 'streetlight',
  DRAINAGE = 'drainage',
  PUBLIC_PROPERTY = 'public_property',
  OTHER = 'other',
}

export enum ReportSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Match backend exactly
export enum ReportStatus {
  RECEIVED = 'received',
  PENDING_CLASSIFICATION = 'pending_classification',
  CLASSIFIED = 'classified',
  ASSIGNED_TO_DEPARTMENT = 'assigned_to_department',
  ASSIGNED_TO_OFFICER = 'assigned_to_officer',
  ASSIGNMENT_REJECTED = 'assignment_rejected',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  PENDING_VERIFICATION = 'pending_verification',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  REJECTED = 'rejected',
  DUPLICATE = 'duplicate',
  ON_HOLD = 'on_hold',
  REOPENED = 'reopened',
}

export enum TaskStatus {
  ASSIGNED = 'assigned',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  PENDING_VERIFICATION = 'pending_verification',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
  ON_HOLD = 'on_hold',
}
