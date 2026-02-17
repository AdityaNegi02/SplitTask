# 📡 API Documentation

Complete API reference for SplitTask backend.

## Base URL
```
http://localhost:5000
```

## Authentication

Currently no authentication required (development mode).

---

## Endpoints

### Health Check

**GET** `/health`

Check if API server is running.

**Response:**
```json
{
  "status": "ok",
  "message": "SplitTask API is running with Redis + PostgreSQL!",
  "timestamp": "2025-02-15T10:30:00.000Z"
}
```

---

### Tasks

#### Create Task

**POST** `/api/tasks`

Create a new task and add to queue.

**Request Body:**
```json
{
  "title": "Send welcome emails",
  "description": "Email 1000 new users",
  "priority": "high"
}
```

**Parameters:**
| Field | Type | Required | Values | Default |
|-------|------|----------|--------|---------|
| title | string | Yes | Any text | - |
| description | string | No | Any text | "" |
| priority | string | No | high, medium, low | medium |

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Task created and queued for processing",
  "task": {
    "id": 1,
    "title": "Send welcome emails",
    "description": "Email 1000 new users",
    "priority": "high",
    "status": "pending",
    "progress": 0,
    "created_at": "2025-02-15T10:30:00.000Z",
    "started_at": null,
    "completed_at": null,
    "retry_count": 0
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Task title is required"
}
```

---

#### Get All Tasks

**GET** `/api/tasks`

Retrieve all tasks from database.

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| status | string | Filter by status | `?status=completed` |
| priority | string | Filter by priority | `?priority=high` |
| limit | number | Limit results | `?limit=10` |

**Response (200 OK):**
```json
{
  "success": true,
  "count": 2,
  "tasks": [
    {
      "id": 1,
      "title": "Send welcome emails",
      "description": "Email 1000 new users",
      "priority": "high",
      "status": "completed",
      "progress": 100,
      "worker_id": 1,
      "retry_count": 0,
      "error_message": null,
      "created_at": "2025-02-15T10:30:00.000Z",
      "started_at": "2025-02-15T10:30:05.000Z",
      "completed_at": "2025-02-15T10:30:08.000Z",
      "failed_at": null
    }
  ]
}
```

---

#### Get Single Task

**GET** `/api/tasks/:id`

Get specific task by ID.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | Task ID |

**Response (200 OK):**
```json
{
  "success": true,
  "task": {
    "id": 1,
    "title": "Send welcome emails",
    "status": "completed",
    ...
  }
}
```

**Error (404 Not Found):**
```json
{
  "success": false,
  "error": "Task not found"
}
```

---

#### Get Task History

**GET** `/api/tasks/:id/history`

Get complete history of task events.

**Response (200 OK):**
```json
{
  "success": true,
  "taskId": 1,
  "history": [
    {
      "id": 1,
      "task_id": 1,
      "event_type": "created",
      "worker_id": null,
      "metadata": {...},
      "created_at": "2025-02-15T10:30:00.000Z"
    },
    {
      "id": 2,
      "task_id": 1,
      "event_type": "started",
      "worker_id": 1,
      "metadata": {...},
      "created_at": "2025-02-15T10:30:05.000Z"
    },
    {
      "id": 3,
      "task_id": 1,
      "event_type": "completed",
      "worker_id": 1,
      "metadata": {"processingTime": 3000},
      "created_at": "2025-02-15T10:30:08.000Z"
    }
  ]
}
```

---

#### Delete Task

**DELETE** `/api/tasks/:id`

Delete a task from database.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

---

### Statistics

#### Get System Statistics

**GET** `/api/stats`

Get comprehensive system statistics.

**Response (200 OK):**
```json
{
  "success": true,
  "stats": {
    "queue": {
      "queueLength": 5,
      "processing": 3,
      "total": 8
    },
    "workers": {
      "total": 3,
      "active": 2,
      "idle": 1,
      "totalCompleted": 150,
      "totalFailed": 3
    },
    "isRunning": true,
    "database": {
      "totalTasks": 200,
      "pending": 5,
      "processing": 3,
      "completed": 190,
      "failed": 2,
      "avgCompletionTime": 4.5
    }
  }
}
```

---

### Workers

#### Get Workers Status

**GET** `/api/workers`

Get status of all worker processes.

**Response (200 OK):**
```json
{
  "success": true,
  "workers": [
    {
      "id": 1,
      "isProcessing": true,
      "currentTask": {
        "id": 42,
        "title": "Process images",
        "progress": 65
      },
      "tasksCompleted": 45,
      "tasksFailed": 1
    },
    {
      "id": 2,
      "isProcessing": false,
      "currentTask": null,
      "tasksCompleted": 50,
      "tasksFailed": 0
    },
    {
      "id": 3,
      "isProcessing": true,
      "currentTask": {
        "id": 43,
        "title": "Send emails",
        "progress": 30
      },
      "tasksCompleted": 48,
      "tasksFailed": 2
    }
  ]
}
```

---

### Queue

#### Get Queue Information

**GET** `/api/queue`

Get current queue status.

**Response (200 OK):**
```json
{
  "success": true,
  "stats": {
    "queueLength": 5,
    "processing": 3,
    "total": 8
  },
  "queued": [
    {"id": 10, "title": "Task 10", "priority": "high"},
    {"id": 11, "title": "Task 11", "priority": "medium"}
  ],
  "processing": [
    {"id": 7, "title": "Task 7", "priority": "high"},
    {"id": 8, "title": "Task 8", "priority": "medium"},
    {"id": 9, "title": "Task 9", "priority": "low"}
  ]
}
```

#### Clear Queue (Development Only)

**POST** `/api/queue/clear`

Clear all tasks from queue.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Queue cleared successfully"
}
```

---

## WebSocket Events

### Connection
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('Connected to server');
});
```

### Events

#### stats

Emitted every 2 seconds with system statistics.

**Payload:**
```json
{
  "queue": {...},
  "workers": {...},
  "database": {...}
}
```

**Example:**
```javascript
socket.on('stats', (data) => {
  console.log('Total tasks:', data.database.totalTasks);
  console.log('Active workers:', data.workers.active);
});
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (invalid input) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Rate Limits

Currently no rate limiting (development mode).

Production deployment should implement:
- 100 requests per minute per IP
- 1000 task creations per hour

---

## Examples

### cURL Examples
```bash
# Create task
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test task","priority":"high"}'

# Get all tasks
curl http://localhost:5000/api/tasks

# Get stats
curl http://localhost:5000/api/stats
```

### JavaScript/Axios Examples
```javascript
import axios from 'axios';

// Create task
const createTask = async () => {
  const response = await axios.post('http://localhost:5000/api/tasks', {
    title: 'Process payments',
    description: 'Process 1000 pending payments',
    priority: 'high'
  });
  console.log('Task created:', response.data.task);
};

// Get stats
const getStats = async () => {
  const response = await axios.get('http://localhost:5000/api/stats');
  console.log('Stats:', response.data.stats);
};
```

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- Task IDs are auto-incrementing integers
- Priority values: `high`, `medium`, `low`
- Status values: `pending`, `processing`, `completed`, `failed`