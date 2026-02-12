require('dotenv').config();
const express = require('express');
const cors = require('cors');
const taskQueue = require('./services/taskQueue');
const WorkerManager = require('./workers/workerManager');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize task queue and workers
const queue = taskQueue.getInstance();
const workerManager = new WorkerManager(3); // 3 workers

// Initialize and start workers
workerManager.initialize();
workerManager.start();

// In-memory task storage (for API responses)
let tasks = [];
let taskId = 1;

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'SplitTask API is running!',
    timestamp: new Date().toISOString() 
  });
});

// Get all tasks
app.get('/api/tasks', (req, res) => {
  res.json({
    success: true,
    count: tasks.length,
    tasks: tasks
  });
});

// Create a new task
app.post('/api/tasks', (req, res) => {
  const { title, description, priority } = req.body;

  if (!title) {
    return res.status(400).json({
      success: false,
      error: 'Task title is required'
    });
  }

  const newTask = {
    id: taskId++,
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

  tasks.push(newTask);
  
  // Add to queue for processing
  queue.enqueue(newTask);

  res.status(201).json({
    success: true,
    message: 'Task created and queued for processing',
    task: newTask
  });
});

// Get single task by ID
app.get('/api/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === parseInt(req.params.id));

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
});

// Delete task
app.delete('/api/tasks/:id', (req, res) => {
  const taskIndex = tasks.findIndex(t => t.id === parseInt(req.params.id));

  if (taskIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Task not found'
    });
  }

  tasks.splice(taskIndex, 1);

  res.json({
    success: true,
    message: 'Task deleted successfully'
  });
});

// Get system statistics
app.get('/api/stats', (req, res) => {
  const stats = workerManager.getStats();
  
  res.json({
    success: true,
    stats: {
      ...stats,
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      failedTasks: tasks.filter(t => t.status === 'failed').length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length,
      processingTasks: tasks.filter(t => t.status === 'processing').length
    }
  });
});

// Get workers status
app.get('/api/workers', (req, res) => {
  const workers = workerManager.getWorkersStatus();
  
  res.json({
    success: true,
    workers: workers
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 SplitTask API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`👷 ${workerManager.workerCount} workers are ready to process tasks!`);
});