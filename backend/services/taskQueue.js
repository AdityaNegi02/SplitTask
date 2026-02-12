class TaskQueue {
  constructor() {
    this.queue = [];
    this.processing = new Map(); // Track tasks being processed
  }

  // Add task to queue
  enqueue(task) {
    // Priority-based insertion
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    task.priorityValue = priorityOrder[task.priority] || 2;
    
    // Find correct position based on priority
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priorityValue < task.priorityValue) {
        insertIndex = i;
        break;
      }
    }
    
    this.queue.splice(insertIndex, 0, task);
    console.log(`✅ Task #${task.id} added to queue (Priority: ${task.priority})`);
  }

  // Get next task from queue
  dequeue() {
    if (this.queue.length === 0) {
      return null;
    }
    
    const task = this.queue.shift();
    this.processing.set(task.id, task);
    return task;
  }

  // Mark task as completed
  complete(taskId) {
    this.processing.delete(taskId);
    console.log(`✅ Task #${taskId} completed and removed from processing`);
  }

  // Mark task as failed
  fail(taskId) {
    const task = this.processing.get(taskId);
    if (task) {
      this.processing.delete(taskId);
      console.log(`❌ Task #${taskId} failed`);
    }
  }

  // Get queue statistics
  getStats() {
    return {
      queueLength: this.queue.length,
      processing: this.processing.size,
      total: this.queue.length + this.processing.size
    };
  }

  // Get all tasks (for API)
  getAllTasks() {
    return {
      queued: [...this.queue],
      processing: Array.from(this.processing.values())
    };
  }
}

// Singleton pattern - only one queue instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new TaskQueue();
    }
    return instance;
  }
};