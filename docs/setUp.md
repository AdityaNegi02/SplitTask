# 🛠️ Setup Guide

Complete step-by-step guide to set up SplitTask on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or higher ([Download](https://nodejs.org/))
- **PostgreSQL** 12.x or higher ([Download](https://www.postgresql.org/download/))
- **Redis** 6.x or higher ([Download Windows](https://github.com/tporadowski/redis/releases))
- **Git** ([Download](https://git-scm.com/downloads))

## Step 1: Clone Repository
```bash
git clone https://github.com/AdityaNegi02/SplitTask.git
cd SplitTask
```

## Step 2: PostgreSQL Setup

### Install PostgreSQL

1. Download PostgreSQL from official website
2. Run installer (remember your password!)
3. Default port: 5432

### Create Database
```bash
# Open psql command line
psql -U postgres

# Create database
CREATE DATABASE splittask;

# Verify
\l

# Exit
\q
```

## Step 3: Redis Setup

### Windows

1. Download Redis from [tporadowski/redis](https://github.com/tporadowski/redis/releases)
2. Extract to `C:\Redis`
3. Run `redis-server.exe`

**Keep this window open!**

### Linux/Mac
```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo service redis-server start

# Mac
brew install redis
brew services start redis
```

### Verify Redis
```bash
redis-cli ping
# Should return: PONG
```

## Step 4: Backend Setup
```bash
cd backend
npm install
```

### Configure Environment

Create `.env` file:
```bash
PORT=5000
NODE_ENV=development

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=splittask
DB_USER=postgres
DB_PASSWORD=your_password_here
```

**⚠️ Important:** Replace `your_password_here` with your PostgreSQL password!

### Initialize Database
```bash
node database/init.js
```

Expected output:
```
🔄 Initializing database schema...
✅ Database schema initialized successfully
📊 Created tables:
  - task_history
  - task_stats
  - tasks
  - workers
```

### Start Backend
```bash
npm run dev
```

Expected output:
```
🚀 SplitTask - Distributed Task Scheduler
📡 API Server: http://localhost:5000
💾 Database: PostgreSQL (Connected)
⚡ Queue: Redis (Connected)
👷 Workers: 3 workers ready
```

## Step 5: Frontend Setup

Open **new terminal** (keep backend running!):
```bash
cd frontend
npm install
npm start
```

Browser opens automatically at `http://localhost:3000`

## Step 6: Verify Installation

### Check Dashboard

1. Open http://localhost:3000
2. You should see "🟢 Connected" in top-right
3. All stat cards should show "0"

### Create Test Task

1. Fill in form:
   - Title: "Test task"
   - Description: "Testing installation"
   - Priority: High
2. Click "Create Task"
3. Watch worker process it!

### Verify Backend
```bash
curl http://localhost:5000/health
```

Should return:
```json
{
  "status": "ok",
  "message": "SplitTask API is running with Redis + PostgreSQL!",
  "timestamp": "..."
}
```

## Troubleshooting

### PostgreSQL Connection Failed

**Error:** `password authentication failed`

**Fix:** Update `DB_PASSWORD` in `.env` to match your PostgreSQL password

**Verify:** 
```bash
psql -U postgres -d splittask
```

### Redis Connection Failed

**Error:** `ECONNREFUSED`

**Fix:** Make sure Redis is running
```bash
redis-cli ping
```

### Port Already in Use

**Error:** `EADDRINUSE: address already in use`

**Fix:** Change port in `.env`:
```env
PORT=5001  # or any other available port
```

### Database Tables Missing

**Fix:** Re-run initialization:
```bash
cd backend
node database/init.js
```

## Next Steps

- ✅ Read [API Documentation](./API.md)
- ✅ Check [Architecture Overview](./architecture.md)
- ✅ Explore the [README](../README.md)

## Support

If you encounter issues:
1. Check the error message carefully
2. Verify all prerequisites are installed
3. Ensure ports 5000 and 3000 are available
4. Check `.env` file is configured correctly