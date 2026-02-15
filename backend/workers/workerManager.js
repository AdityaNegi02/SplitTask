const Worker = require('./worker');
const redisQueue = require('../services/redisQueue');
const taskRepo = require('../services/taskRepository');

class WorkerManager {
  constructor(workerCount = 3) {
    this.workers = [];
    this.workerCount = workerCount;
    this.isRunning = false;
    this.queue = redisQueue.getInstance();
  }

  // Initialize workers
  initialize() {
    console.log(`🚀 Initializing ${this.workerCount} workers...`);
    
    for (let i = 1; i <= this.workerCount; i++) {
      const worker = new Worker(i);
      
      // Listen to worker events
      worker.on('taskStarted', (data) => {
        console.log(`[Worker ${data.workerId}] Task #${data.task.id} started`);
      });

      worker.on('taskCompleted', async (data) => {
      await this.queue.complete(data.task.id);
      await this.assignNextTask(worker);
    });

worker.on('taskFailed', async (data) => {
  await this.handleTaskFailure(data.task, data.error);
  await this.assignNextTask(worker);
});

      worker.on('taskProgress', (data) => {
        // Can emit to dashboard via WebSocket later
      });

      this.workers.push(worker);
    }

    console.log(`✅ ${this.workerCount} workers initialized`);
  }

  // Start processing tasks
  start() {
    if (this.isRunning) {
      console.log('⚠️  Workers already running');
      return;
    }

    this.isRunning = true;
    console.log('🟢 Worker pool started');

    // Assign initial tasks to all workers
    this.workers.forEach(async (worker) => {
  await this.assignNextTask(worker);
});

    // Check for new tasks every 2 seconds
    this.pollInterval = setInterval(() => {
      this.checkForTasks();
    }, 2000);
  }

  // Stop processing
  stop() {
    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    console.log('🔴 Worker pool stopped');
  }

  // Assign next task to available worker
  // Assign next task to available worker
async assignNextTask(worker) {
  if (!this.isRunning || worker.isProcessing) {
    return;
  }

  const task = await this.queue.dequeue();
  
  if (task) {
    console.log(`[Worker ${worker.id}] 📋 Assigned Task #${task.id}`);
    
    // Process task and handle result
    const result = await worker.processTask(task);
    
    // If task was invalid/skipped, remove from queue
    if (!result.success && result.error) {
      const errorMessage = result.error.message || result.error;
      
      if (typeof errorMessage === 'string' && errorMessage.includes('Invalid task')) {
        await this.queue.complete(task.id || 'invalid');
        console.log(`🗑️  Removed invalid task from queue`);
      }
    }
  }
}
  // Check if any workers are idle and assign tasks
  async checkForTasks() {
  const idleWorkers = this.workers.filter(w => !w.isProcessing);
  
  for (const worker of idleWorkers) {
    await this.assignNextTask(worker);
  }
}

  // Handle task failure with retry logic
  async handleTaskFailure(task, error) {
  const maxRetries = 3;
  task.retryCount = (task.retryCount || 0) + 1;

  // Update retry count in database
  await taskRepo.update(task.id, {
    retryCount: task.retryCount,
    errorMessage: error.message
  });

  if (task.retryCount < maxRetries) {
    console.log(`🔄 Retrying Task #${task.id} (Attempt ${task.retryCount + 1}/${maxRetries})`);
    
    await taskRepo.logHistory(task.id, 'retried', null, {
      attempt: task.retryCount + 1,
      error: error.message
    });
    
    // Exponential backoff
    const delay = Math.pow(2, task.retryCount) * 1000;
    
    setTimeout(async () => {
      task.status = 'pending';
      task.error = null;
      
      await taskRepo.update(task.id, { status: 'pending' });
      await this.queue.requeue(task);
    }, delay);
  } else {
    console.log(`❌ Task #${task.id} failed after ${maxRetries} attempts`);
    
    await this.queue.fail(task.id);
    await taskRepo.update(task.id, { 
      status: 'failed',
      errorMessage: `Failed after ${maxRetries} attempts: ${error.message}`
    });
    
    await taskRepo.logHistory(task.id, 'failed_permanently', null, {
      error: error.message,
      attempts: maxRetries
    });
  }
}
  // Get all workers status
  getWorkersStatus() {
    return this.workers.map(w => w.getStatus());
  }

  // Get overall statistics
  getStats() {
    const queueStats = this.queue.getStats();
    const workerStats = {
      total: this.workers.length,
      active: this.workers.filter(w => w.isProcessing).length,
      idle: this.workers.filter(w => !w.isProcessing).length,
      totalCompleted: this.workers.reduce((sum, w) => sum + w.tasksCompleted, 0),
      totalFailed: this.workers.reduce((sum, w) => sum + w.tasksFailed, 0)
    };

    return {
      queue: queueStats,
      workers: workerStats,
      isRunning: this.isRunning
    };
  }
}

module.exports = WorkerManager;