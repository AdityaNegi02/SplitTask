-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  worker_id INTEGER,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP
);

-- Workers table
CREATE TABLE IF NOT EXISTS workers (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'idle',
  current_task_id INTEGER,
  tasks_completed INTEGER DEFAULT 0,
  tasks_failed INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task history table (for analytics)
CREATE TABLE IF NOT EXISTS task_history (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'created', 'started', 'completed', 'failed', 'retried'
  worker_id INTEGER,
  metadata JSONB, -- Store additional data as JSON
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);

-- View for task statistics
CREATE OR REPLACE VIEW task_stats AS
SELECT 
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'processing') as processing,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) FILTER (WHERE status = 'completed') as avg_completion_time_seconds,
  MAX(created_at) as last_task_created
FROM tasks;