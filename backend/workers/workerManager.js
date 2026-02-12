const Worker = require('./worker');
const taskQueue = require('../services/taskQueue');

class WorkerManager {
  constructor(workerCount = 3) {
    this.workers = [];
    this.workerCount = workerCount;
    this.isRunning = false;
    this.queue = taskQueue.getInstance();
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

      worker.on('taskCompleted', (data) => {
        this.queue.complete(data.task.id);
        this.assignNextTask(worker);
      });

      worker.on('taskFailed', (data) => {
        this.handleTaskFailure(data.task, data.error);
        this.assignNextTask(worker);
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
    this.workers.forEach(worker => {
      this.assignNextTask(worker);
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
  assignNextTask(worker) {
    if (!this.isRunning || worker.isProcessing) {
      return;
    }

    const task = this.queue.dequeue();
    
    if (task) {
      console.log(`[Worker ${worker.id}] 📋 Assigned Task #${task.id}`);
      worker.processTask(task);
    }
  }

  // Check if any workers are idle and assign tasks
  checkForTasks() {
    const idleWorkers = this.workers.filter(w => !w.isProcessing);
    
    idleWorkers.forEach(worker => {
      this.assignNextTask(worker);
    });
  }

  // Handle task failure with retry logic
  handleTaskFailure(task, error) {
    const maxRetries = 3;
    task.retryCount = (task.retryCount || 0) + 1;

    if (task.retryCount < maxRetries) {
      console.log(`🔄 Retrying Task #${task.id} (Attempt ${task.retryCount + 1}/${maxRetries})`);
      
      // Exponential backoff: 2s, 4s, 8s
      const delay = Math.pow(2, task.retryCount) * 1000;
      
      setTimeout(() => {
        task.status = 'pending';
        task.error = null;
        this.queue.enqueue(task);
      }, delay);
    } else {
      console.log(`❌ Task #${task.id} failed after ${maxRetries} attempts`);
      this.queue.fail(task.id);
      task.status = 'failed';
      task.finalError = error.message;
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