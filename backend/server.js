require('dotenv').config();
const express = require('express');
const http = require('http'); 
const { Server } = require('socket.io'); 
const cors = require('cors');
const redisQueue = require('./services/redisQueue');
const taskRepo = require('./services/taskRepository');
const WorkerManager = require('./workers/workerManager');

const app = express();
const server = http.createServer(app);  // ← ADD THIS
const io = new Server(server, {  // ← ADD THIS
  cors: {
    origin: "http://localhost:3000",  // React app URL
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Middleware
app.use(cors());
app.use(express.json());

// WebSocket connection
io.on('connection', (socket) => {
  console.log('🔌 Dashboard connected:', socket.id);

  // Send initial stats
  socket.emit('stats', getSystemStats());

  socket.on('disconnect', () => {
    console.log('🔌 Dashboard disconnected:', socket.id);
  });
});

// Helper function to get system stats
async function getSystemStats() {
  try {
    const workerStats = workerManager.getStats();
    const queueStats = await queue.getStats();
    const dbStats = await taskRepo.getStats();

    return {
      queue: queueStats,
      workers: workerStats.workers,
      isRunning: workerStats.isRunning,
      database: {
        totalTasks: parseInt(dbStats.total_tasks) || 0,
        pending: parseInt(dbStats.pending) || 0,
        processing: parseInt(dbStats.processing) || 0,
        completed: parseInt(dbStats.completed) || 0,
        failed: parseInt(dbStats.failed) || 0,
        avgCompletionTime: parseFloat(dbStats.avg_completion_time_seconds) || 0
      }
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return null;
  }
}

// Broadcast stats every 2 seconds
setInterval(async () => {
  const stats = await getSystemStats();
  if (stats) {
    io.emit('stats', stats);
  }
}, 2000);
// Initialize Redis queue and workers
const queue = redisQueue.getInstance();
const workerManager = new WorkerManager(3); // 3 workers

// Initialize and start workers
workerManager.initialize();
workerManager.start();
// Task ID counter
let taskIdCounter = 1;

// Initialize task counter from database
async function initializeTaskCounter() {
  try {
    // Get the NEXT value from PostgreSQL sequence
    const result = await taskRepo.query("SELECT nextval('tasks_id_seq') as next_id");
    taskIdCounter = parseInt(result.rows[0].next_id);
    
    console.log(`📊 Task ID counter synchronized with database: ${taskIdCounter}`);
  } catch (error) {
    console.error('⚠️  Could not sync task counter:', error.message);
    
    // Fallback: use MAX(id) + 1
    try {
      const maxResult = await taskRepo.query('SELECT COALESCE(MAX(id), 0) as max_id FROM tasks');
      taskIdCounter = maxResult.rows[0].max_id + 1;
      console.log(`📊 Task ID counter fallback: ${taskIdCounter}`);
    } catch (err) {
      taskIdCounter = 1;
    }
  }
}
// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'SplitTask API is running with Redis + PostgreSQL!',
    timestamp: new Date().toISOString() 
  });
});

// Get all tasks (from database)
app.get('/api/tasks', async (req, res) => {
  try {
    const { status, priority, limit } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (limit) filters.limit = parseInt(limit);

    const tasks = await taskRepo.findAll(filters);

    res.json({
      success: true,
      count: tasks.length,
      tasks: tasks
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks'
    });
  }
});

// Create new task
app.post('/api/tasks', async (req, res) => {
  try {
    const { title, description, priority } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Task title is required'
      });
    }

    // Don't manually set ID - let PostgreSQL generate it
    const newTask = {
      title,
      description: description || '',
      priority: priority || 'medium',
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      retryCount: 0
    };

    // Save to PostgreSQL (it will auto-generate the ID)
    const createdTask = await taskRepo.create(newTask);
    
    // Add the ID from database to the task
    newTask.id = createdTask.id;
    
    // Add to Redis queue for processing
    await queue.enqueue(newTask);

    res.status(201).json({
      success: true,
      message: 'Task created and queued for processing',
      task: createdTask
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task'
    });
  }
});
// Get single task by ID (from database)
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const task = await taskRepo.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    res.json({
      success: true,
      task: task
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task'
    });
  }
});

// Get task history
app.get('/api/tasks/:id/history', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const history = await taskRepo.getHistory(taskId);

    res.json({
      success: true,
      taskId: taskId,
      history: history
    });
  } catch (error) {
    console.error('Error fetching task history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task history'
    });
  }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    
    await taskRepo.delete(taskId);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete task'
    });
  }
});

// Get system statistics (combined from Redis + PostgreSQL)
app.get('/api/stats', async (req, res) => {
  try {
    const workerStats = workerManager.getStats();
    const queueStats = await queue.getStats();
    const dbStats = await taskRepo.getStats();

    res.json({
      success: true,
      stats: {
        queue: queueStats,
        workers: workerStats.workers,
        isRunning: workerStats.isRunning,
        database: {
          totalTasks: parseInt(dbStats.total_tasks) || 0,
          pending: parseInt(dbStats.pending) || 0,
          processing: parseInt(dbStats.processing) || 0,
          completed: parseInt(dbStats.completed) || 0,
          failed: parseInt(dbStats.failed) || 0,
          avgCompletionTime: parseFloat(dbStats.avg_completion_time_seconds) || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// Get workers status
app.get('/api/workers', (req, res) => {
  try {
    const workers = workerManager.getWorkersStatus();
    
    res.json({
      success: true,
      workers: workers
    });
  } catch (error) {
    console.error('Error fetching workers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workers status'
    });
  }
});

// Get queue info (from Redis)
app.get('/api/queue', async (req, res) => {
  try {
    const stats = await queue.getStats();
    const queued = await queue.getAllQueued();
    const processing = await queue.getAllProcessing();

    res.json({
      success: true,
      stats: stats,
      queued: queued.slice(0, 10), // First 10 queued tasks
      processing: processing
    });
  } catch (error) {
    console.error('Error fetching queue info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch queue information'
    });
  }
});

// Clear queue (for testing)
app.post('/api/queue/clear', async (req, res) => {
  try {
    await queue.clear();
    
    res.json({
      success: true,
      message: 'Queue cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear queue'
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  workerManager.stop();
  await queue.close();
   io.close();  // ← ADD THIS
  server.close();  // ← ADD THIS
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  workerManager.stop();
  await queue.close();
  io.close();  // ← ADD THIS
  server.close();  // ← ADD THIS
  process.exit(0);
});

// Start server
// Start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  // Initialize task counter from database first
  await initializeTaskCounter();
  
  server.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('🚀 SplitTask - Distributed Task Scheduler');
    console.log('═══════════════════════════════════════════════');
    console.log(`📡 API Server: http://localhost:${PORT}`);
    console.log(`💚 Health Check: http://localhost:${PORT}/health`);
    console.log(`📊 Statistics: http://localhost:${PORT}/api/stats`);
    console.log('');
    console.log('💾 Database: PostgreSQL (Connected)');
    console.log('⚡ Queue: Redis (Connected)');
    console.log(`👷 Workers: ${workerManager.workerCount} workers ready`);
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('');
  });
}

// Start the server
startServer();