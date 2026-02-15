const EventEmitter = require('events');
const taskRepo = require('../services/taskRepository');
class Worker extends EventEmitter {
  constructor(id) {
    super();
    this.id = id;
    this.isProcessing = false;
    this.currentTask = null;
    this.tasksCompleted = 0;
    this.tasksFailed = 0;
  }

  // Simulate task processing
  async processTask(task) {
  // SAFETY CHECK - Skip invalid tasks
  if (!task || task.id === undefined || task.id === null) {
    console.error(`[Worker ${this.id}] ⚠️  Skipping invalid task (no ID):`, task);
    this.isProcessing = false;
    this.currentTask = null;
    return { success: false, error: 'Invalid task - missing ID' };
  }

  this.isProcessing = true;
  this.currentTask = task;

  console.log(`[Worker ${this.id}] 🔄 Started processing Task #${task.id}: "${task.title}"`);
  try {
    // Update task status to processing IN DATABASE
    task.status = 'processing';
    task.startedAt = new Date().toISOString();
    task.workerId = this.id;
    task.progress = 0;

    await taskRepo.update(task.id, {
      status: 'processing',
      startedAt: new Date(),
      workerId: this.id,
      progress: 0
    });

    await taskRepo.logHistory(task.id, 'started', this.id, { task });

    this.emit('taskStarted', { workerId: this.id, task });

    // Simulate work
    const processingTime = this.getProcessingTime(task);
    await this.simulateProcessing(task, processingTime);

    // Mark as completed IN DATABASE
    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    task.progress = 100;

    await taskRepo.update(task.id, {
      status: 'completed',
      completedAt: new Date(),
      progress: 100
    });

    await taskRepo.logHistory(task.id, 'completed', this.id, { 
      processingTime 
    });

    this.tasksCompleted++;
    console.log(`[Worker ${this.id}] ✅ Completed Task #${task.id} in ${processingTime}ms`);

    this.emit('taskCompleted', { workerId: this.id, task });

    return { success: true, task };

  } catch (error) {
    // Handle failure IN DATABASE
    task.status = 'failed';
    task.error = error.message;
    task.failedAt = new Date().toISOString();

    await taskRepo.update(task.id, {
      status: 'failed',
      errorMessage: error.message,
      failedAt: new Date()
    });

    await taskRepo.logHistory(task.id, 'failed', this.id, { 
      error: error.message 
    });

    this.tasksFailed++;
    console.log(`[Worker ${this.id}] ❌ Failed Task #${task.id}: ${error.message}`);

    this.emit('taskFailed', { workerId: this.id, task, error });

    return { success: false, task, error };

  } finally {
    this.isProcessing = false;
    this.currentTask = null;
  }
}
  // Get processing time based on priority
  getProcessingTime(task) {
    const baseTimes = {
      high: 3000,    // 3 seconds
      medium: 5000,  // 5 seconds
      low: 8000      // 8 seconds
    };
    return baseTimes[task.priority] || 5000;
  }

  // Simulate processing with progress updates
  async simulateProcessing(task, totalTime) {
  const steps = 10;
  const stepTime = totalTime / steps;

  for (let i = 1; i <= steps; i++) {
    await this.sleep(stepTime);
    
    task.progress = Math.floor((i / steps) * 100);
    
    // Update progress in database every 20%
    if (task.progress % 20 === 0) {
      await taskRepo.update(task.id, { progress: task.progress });
    }
    
    this.emit('taskProgress', { 
      workerId: this.id, 
      taskId: task.id, 
      progress: task.progress 
    });

    // Simulate random failures (5% chance)
    // if (Math.random() < 0.05 && !task.retryCount) {
    //   throw new Error('Random processing error');
    // }
  }
}

  // Sleep utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get worker status
  getStatus() {
    return {
      id: this.id,
      isProcessing: this.isProcessing,
      currentTask: this.currentTask ? {
        id: this.currentTask.id,
        title: this.currentTask.title,
        progress: this.currentTask.progress || 0
      } : null,
      tasksCompleted: this.tasksCompleted,
      tasksFailed: this.tasksFailed
    };
  }
}

module.exports = Worker;