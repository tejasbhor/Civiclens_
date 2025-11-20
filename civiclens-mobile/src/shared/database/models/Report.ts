// Report model with CRUD operations
import { database } from '../database';
import { ReportCategory, ReportSeverity, ReportStatus } from '../schema';

export interface Report {
  id?: number;
  report_number?: string;
  user_id: number;
  department_id?: number;
  title: string;
  description: string;
  category: ReportCategory | string;
  sub_category?: string;
  severity: ReportSeverity;
  latitude: number;
  longitude: number;
  address: string;
  landmark?: string;
  ward_number?: string;
  status: ReportStatus;
  status_updated_at?: number;
  photos: string[];
  videos?: string[];
  
  // AI Classification
  ai_category?: string;
  ai_confidence?: number;
  ai_processed_at?: number;
  
  // Visibility
  is_public: boolean;
  is_sensitive: boolean;
  
  // Offline sync
  is_synced: boolean;
  local_id?: string;
  sync_error?: string;
  
  created_at: number;
  updated_at: number;
}

export interface ReportCreate {
  user_id: number;
  title: string;
  description: string;
  category?: string; // Optional - can be AI classified
  sub_category?: string;
  severity: ReportSeverity;
  latitude: number;
  longitude: number;
  address: string;
  landmark?: string;
  ward_number?: string;
  photos: string[];
  videos?: string[];
}

export class ReportModel {
  // Create a new report
  static async create(data: ReportCreate): Promise<Report> {
    const now = Date.now();
    const localId = `local_${now}_${Math.random().toString(36).substr(2, 9)}`;

    const result = await database.runAsync(
      `INSERT INTO reports (
        user_id, title, description, category, sub_category, severity,
        latitude, longitude, address, landmark, ward_number,
        status, status_updated_at, photos, videos,
        is_public, is_sensitive, is_synced, local_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.user_id,
        data.title,
        data.description,
        data.category || null,
        data.sub_category || null,
        data.severity,
        data.latitude,
        data.longitude,
        data.address,
        data.landmark || null,
        data.ward_number || null,
        ReportStatus.RECEIVED,
        now,
        JSON.stringify(data.photos),
        data.videos ? JSON.stringify(data.videos) : null,
        1, // is_public = true
        0, // is_sensitive = false
        0, // is_synced = false
        localId,
        now,
        now,
      ]
    );

    return this.findById(result.lastInsertRowId)!;
  }

  // Find report by ID
  static async findById(id: number): Promise<Report | null> {
    const row = await database.getFirstAsync<any>(
      'SELECT * FROM reports WHERE id = ?',
      [id]
    );

    return row ? this.mapRowToReport(row) : null;
  }

  // Find all reports for a user
  static async findByUserId(userId: number): Promise<Report[]> {
    const rows = await database.getAllAsync<any>(
      'SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    return rows.map(this.mapRowToReport);
  }

  // Find unsynced reports
  static async findUnsynced(): Promise<Report[]> {
    const rows = await database.getAllAsync<any>(
      'SELECT * FROM reports WHERE is_synced = 0 ORDER BY created_at ASC'
    );

    return rows.map(this.mapRowToReport);
  }

  // Update report
  static async update(id: number, data: Partial<Report>): Promise<Report | null> {
    const updates: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        updates.push(`${key} = ?`);
        if (key === 'photos' || key === 'videos') {
          values.push(JSON.stringify(value));
        } else if (typeof value === 'boolean') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    });

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    await database.runAsync(
      `UPDATE reports SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  // Mark as synced
  static async markAsSynced(localId: string, serverId: number, reportNumber: string): Promise<void> {
    await database.runAsync(
      `UPDATE reports SET 
        id = ?,
        report_number = ?,
        is_synced = 1,
        sync_error = NULL,
        updated_at = ?
      WHERE local_id = ?`,
      [serverId, reportNumber, Date.now(), localId]
    );
  }

  // Delete report
  static async delete(id: number): Promise<void> {
    await database.runAsync('DELETE FROM reports WHERE id = ?', [id]);
  }

  // Count reports by status
  static async countByStatus(userId: number): Promise<Record<string, number>> {
    const rows = await database.getAllAsync<{ status: string; count: number }>(
      'SELECT status, COUNT(*) as count FROM reports WHERE user_id = ? GROUP BY status',
      [userId]
    );

    const counts: Record<string, number> = {};
    rows.forEach(row => {
      counts[row.status] = row.count;
    });

    return counts;
  }

  // Helper to map database row to Report object
  private static mapRowToReport(row: any): Report {
    return {
      id: row.id,
      report_number: row.report_number,
      user_id: row.user_id,
      department_id: row.department_id,
      title: row.title,
      description: row.description,
      category: row.category,
      sub_category: row.sub_category,
      severity: row.severity as ReportSeverity,
      latitude: row.latitude,
      longitude: row.longitude,
      address: row.address,
      landmark: row.landmark,
      ward_number: row.ward_number,
      status: row.status as ReportStatus,
      status_updated_at: row.status_updated_at,
      photos: JSON.parse(row.photos),
      videos: row.videos ? JSON.parse(row.videos) : undefined,
      ai_category: row.ai_category,
      ai_confidence: row.ai_confidence,
      ai_processed_at: row.ai_processed_at,
      is_public: row.is_public === 1,
      is_sensitive: row.is_sensitive === 1,
      is_synced: row.is_synced === 1,
      local_id: row.local_id,
      sync_error: row.sync_error,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
