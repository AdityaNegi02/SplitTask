const Redis = require('ioredis');

class RedisQueue {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    this.queueKey = 'task:queue';
    this.processingKey = 'task:processing';

    this.redis.on('connect', () => {
      console.log('✅ Connected to Redis');
    });

    this.redis.on('error', (err) => {
      console.error('❌ Redis error:', err);
    });
  }

  // Add task to queue with priority
  async enqueue(task) {
    const priorityScores = {
      high: 3,
      medium: 2,
      low: 1
    };

    const score = priorityScores[task.priority] || 2;
    const timestamp = Date.now();
    
    // Use sorted set for priority queue
    // Score = priority * 1000000 + timestamp (to maintain order within same priority)
    const finalScore = (score * 1000000) + timestamp;

    await this.redis.zadd(
      this.queueKey,
      finalScore,
      JSON.stringify(task)
    );

    console.log(`✅ Task #${task.id} added to Redis queue (Priority: ${task.priority})`);
  }

  // Get next task from queue
  async dequeue() {
    // Get highest priority task (highest score)
    const tasks = await this.redis.zrevrange(this.queueKey, 0, 0);
    
    if (tasks.length === 0) {
      return null;
    }

    const taskStr = tasks[0];
    const task = JSON.parse(taskStr);

    // Move to processing set
    await this.redis.zrem(this.queueKey, taskStr);
    await this.redis.hset(this.processingKey, task.id, taskStr);

    return task;
  }

  // Mark task as completed
  // Mark task as completed
async complete(taskId) {
  if (!taskId || taskId === 'invalid' || taskId === undefined) {
    console.log(`⚠️  Skipping invalid taskId in complete()`);
    return;
  }
  await this.redis.hdel(this.processingKey, taskId);
  console.log(`✅ Task #${taskId} removed from processing (Redis)`);
}

  // Mark task as failed
  // Mark task as failed
async fail(taskId) {
  if (!taskId || taskId === 'invalid' || taskId === undefined) {
    console.log(`⚠️  Skipping invalid taskId in fail()`);
    return;
  }
  await this.redis.hdel(this.processingKey, taskId);
  console.log(`❌ Task #${taskId} marked as failed (Redis)`);
}
  // Re-queue a task (for retries)
  async requeue(task) {
    await this.redis.hdel(this.processingKey, task.id);
    await this.enqueue(task);
    console.log(`🔄 Task #${task.id} re-queued for retry`);
  }

  // Get queue statistics
  async getStats() {
    const queueLength = await this.redis.zcard(this.queueKey);
    const processingCount = await this.redis.hlen(this.processingKey);

    return {
      queueLength,
      processing: processingCount,
      total: queueLength + processingCount
    };
  }

  // Get all tasks in queue (for debugging)
  async getAllQueued() {
    const tasks = await this.redis.zrevrange(this.queueKey, 0, -1);
    return tasks.map(t => JSON.parse(t));
  }

  // Get all processing tasks
  async getAllProcessing() {
    const tasks = await this.redis.hvals(this.processingKey);
    return tasks.map(t => JSON.parse(t));
  }

  // Clear all (for testing)
  async clear() {
    await this.redis.del(this.queueKey);
    await this.redis.del(this.processingKey);
    console.log('🗑️  Queue cleared');
  }

  // Close connection
  async close() {
    await this.redis.quit();
  }
}

// Singleton
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new RedisQueue();
    }
    return instance;
  }
};