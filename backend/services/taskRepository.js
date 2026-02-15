const db = require('./database');

class TaskRepository {
  // Create new task in database
  async create(task) {
  const query = `
    INSERT INTO tasks (
      title, description, priority, status, progress, 
      retry_count, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const values = [
    task.title,
    task.description || '',
    task.priority || 'medium',
    task.status || 'pending',
    task.progress || 0,
    task.retryCount || 0,
    task.createdAt || new Date()
  ];

  const result = await db.query(query, values);
  
  // Log to history with the generated ID
  const createdTask = result.rows[0];
  await this.logHistory(createdTask.id, 'created', null, { task: createdTask });
  
  return createdTask;
}
  // Update task
  async update(taskId, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic UPDATE query
    Object.keys(updates).forEach(key => {
      // Convert camelCase to snake_case
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${dbKey} = $${paramCount}`);
      values.push(updates[key]);
      paramCount++;
    });

    values.push(taskId);

    const query = `
      UPDATE tasks 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Get task by ID
  async findById(taskId) {
    const result = await db.query(
      'SELECT * FROM tasks WHERE id = $1',
      [taskId]
    );
    return result.rows[0];
  }

  // Get all tasks
  async findAll(filters = {}) {
    let query = 'SELECT * FROM tasks';
    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (filters.status) {
      conditions.push(`status = $${paramCount}`);
      values.push(filters.status);
      paramCount++;
    }

    if (filters.priority) {
      conditions.push(`priority = $${paramCount}`);
      values.push(filters.priority);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ` LIMIT ${filters.limit}`;
    }

    const result = await db.query(query, values);
    return result.rows;
  }

  // Delete task
  async delete(taskId) {
    await db.query('DELETE FROM tasks WHERE id = $1', [taskId]);
  }

  // Log task history event
  async logHistory(taskId, eventType, workerId = null, metadata = {}) {
    const query = `
      INSERT INTO task_history (task_id, event_type, worker_id, metadata)
      VALUES ($1, $2, $3, $4)
    `;

    await db.query(query, [
      taskId,
      eventType,
      workerId,
      JSON.stringify(metadata)
    ]);
  }

  // Get task statistics
  async getStats() {
    const result = await db.query('SELECT * FROM task_stats');
    return result.rows[0];
  }

  // Get task history
  async getHistory(taskId) {
    const result = await db.query(
      `SELECT * FROM task_history 
       WHERE task_id = $1 
       ORDER BY created_at ASC`,
      [taskId]
    );
    return result.rows;
  }
}

module.exports = new TaskRepository();