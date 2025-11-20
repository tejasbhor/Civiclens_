// Task model with CRUD operations
import { database } from '../database';
import { TaskStatus } from '../schema';

export interface ChecklistItem {
  id: number;
  text: string;
  isCompleted: boolean;
  completedAt?: number;
}

export interface Task {
  id?: number;
  report_id: number;
  assigned_to: number;
  assigned_by?: number;
  status: TaskStatus;
  priority: number;
  notes?: string;
  resolution_notes?: string;
  rejection_reason?: string;
  before_photos: string[];
  after_photos: string[];
  checklist: ChecklistItem[];
  assigned_at: number;
  acknowledged_at?: number;
  started_at?: number;
  resolved_at?: number;
  rejected_at?: number;
  sla_deadline?: number;
  sla_violated: number; // 0=compliant, 1=warning, 2=violated
  is_synced: boolean;
  pending_sync?: string;
  created_at: number;
  updated_at: number;
}

export class TaskModel {
  // Create a new task
  static async create(data: Partial<Task>): Promise<Task> {
    const now = Date.now();

    const result = await database.runAsync(
      `INSERT INTO tasks (
        report_id, assigned_to, assigned_by, status, priority,
        notes, resolution_notes, rejection_reason,
        before_photos, after_photos, checklist,
        assigned_at, acknowledged_at, started_at, resolved_at, rejected_at,
        sla_deadline, sla_violated, is_synced, pending_sync, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.report_id!,
        data.assigned_to!,
        data.assigned_by || null,
        data.status || TaskStatus.ASSIGNED,
        data.priority || 5,
        data.notes || null,
        data.resolution_notes || null,
        data.rejection_reason || null,
        JSON.stringify(data.before_photos || []),
        JSON.stringify(data.after_photos || []),
        JSON.stringify(data.checklist || []),
        data.assigned_at || now,
        data.acknowledged_at || null,
        data.started_at || null,
        data.resolved_at || null,
        data.rejected_at || null,
        data.sla_deadline || null,
        data.sla_violated || 0,
        data.is_synced ? 1 : 0,
        data.pending_sync || null,
        now,
        now,
      ]
    );

    return this.findById(result.lastInsertRowId)!;
  }

  // Find task by ID
  static async findById(id: number): Promise<Task | null> {
    const row = await database.getFirstAsync<any>(
      'SELECT * FROM tasks WHERE id = ?',
      [id]
    );

    return row ? this.mapRowToTask(row) : null;
  }

  // Find all tasks for an officer
  static async findByOfficerId(officerId: number): Promise<Task[]> {
    const rows = await database.getAllAsync<any>(
      'SELECT * FROM tasks WHERE assigned_to = ? ORDER BY priority DESC, assigned_at DESC',
      [officerId]
    );

    return rows.map(this.mapRowToTask);
  }

  // Find tasks by status
  static async findByStatus(officerId: number, status: TaskStatus): Promise<Task[]> {
    const rows = await database.getAllAsync<any>(
      'SELECT * FROM tasks WHERE assigned_to = ? AND status = ? ORDER BY priority DESC',
      [officerId, status]
    );

    return rows.map(this.mapRowToTask);
  }

  // Find unsynced tasks
  static async findUnsynced(): Promise<Task[]> {
    const rows = await database.getAllAsync<any>(
      'SELECT * FROM tasks WHERE is_synced = 0 ORDER BY created_at ASC'
    );

    return rows.map(this.mapRowToTask);
  }

  // Update task
  static async update(id: number, data: Partial<Task>): Promise<Task | null> {
    const updates: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        updates.push(`${key} = ?`);
        if (key === 'before_photos' || key === 'after_photos' || key === 'checklist') {
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
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  // Mark as synced
  static async markAsSynced(id: number): Promise<void> {
    await database.runAsync(
      `UPDATE tasks SET 
        is_synced = 1,
        pending_sync = NULL,
        updated_at = ?
      WHERE id = ?`,
      [Date.now(), id]
    );
  }

  // Delete task
  static async delete(id: number): Promise<void> {
    await database.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
  }

  // Count tasks by status
  static async countByStatus(officerId: number): Promise<Record<string, number>> {
    const rows = await database.getAllAsync<{ status: string; count: number }>(
      'SELECT status, COUNT(*) as count FROM tasks WHERE assigned_to = ? GROUP BY status',
      [officerId]
    );

    const counts: Record<string, number> = {};
    rows.forEach(row => {
      counts[row.status] = row.count;
    });

    return counts;
  }

  // Helper to map database row to Task object
  private static mapRowToTask(row: any): Task {
    return {
      id: row.id,
      report_id: row.report_id,
      assigned_to: row.assigned_to,
      assigned_by: row.assigned_by,
      status: row.status as TaskStatus,
      priority: row.priority,
      notes: row.notes,
      resolution_notes: row.resolution_notes,
      rejection_reason: row.rejection_reason,
      before_photos: JSON.parse(row.before_photos),
      after_photos: JSON.parse(row.after_photos),
      checklist: JSON.parse(row.checklist),
      assigned_at: row.assigned_at,
      acknowledged_at: row.acknowledged_at,
      started_at: row.started_at,
      resolved_at: row.resolved_at,
      rejected_at: row.rejected_at,
      sla_deadline: row.sla_deadline,
      sla_violated: row.sla_violated,
      is_synced: row.is_synced === 1,
      pending_sync: row.pending_sync,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
