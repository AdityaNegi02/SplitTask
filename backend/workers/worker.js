const EventEmitter = require('events');

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
    this.isProcessing = true;
    this.currentTask = task;

    console.log(`[Worker ${this.id}] 🔄 Started processing Task #${task.id}: "${task.title}"`);

    try {
      // Update task status to processing
      task.status = 'processing';
      task.startedAt = new Date().toISOString();
      task.workerId = this.id;

      this.emit('taskStarted', { workerId: this.id, task });

      // Simulate work based on priority
      const processingTime = this.getProcessingTime(task);
      
      // Simulate progress updates
      await this.simulateProcessing(task, processingTime);

      // Mark as completed
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.progress = 100;

      this.tasksCompleted++;
      console.log(`[Worker ${this.id}] ✅ Completed Task #${task.id} in ${processingTime}ms`);

      this.emit('taskCompleted', { workerId: this.id, task });

      return { success: true, task };

    } catch (error) {
      // Handle failure
      task.status = 'failed';
      task.error = error.message;
      task.failedAt = new Date().toISOString();

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
      
      // Emit progress event
      this.emit('taskProgress', { 
        workerId: this.id, 
        taskId: task.id, 
        progress: task.progress 
      });

      // Simulate random failures (5% chance)
      if (Math.random() < 0.05 && !task.retryCount) {
        throw new Error('Random processing error');
      }
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