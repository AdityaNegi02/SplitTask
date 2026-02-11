const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (temporary - we'll add Redis/PostgreSQL later)
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
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  tasks.push(newTask);

  res.status(201).json({
    success: true,
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

// Update task status
app.patch('/api/tasks/:id', (req, res) => {
  const { status } = req.body;
  const task = tasks.find(t => t.id === parseInt(req.params.id));

  if (!task) {
    return res.status(404).json({
      success: false,
      error: 'Task not found'
    });
  }

  task.status = status;
  if (status === 'completed') {
    task.completedAt = new Date().toISOString();
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

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 SplitTask API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});