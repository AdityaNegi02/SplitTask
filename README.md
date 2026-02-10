# SplitTask - Distributed Task Scheduler

**Status:** 🚧 Active Development (Week 1/2)

## Overview
A distributed task scheduling system for processing background jobs with AI-powered optimization and real-time monitoring.

## Features (In Progress)
- 🔄 Task queue with priority management (In Progress)
- 🔄 Distributed worker pool architecture (In Progress)  
- ⏳ AI-based task prioritization using Claude API
- ⏳ Real-time monitoring dashboard
- ⏳ Automatic retry logic with exponential backoff
- ⏳ Task dependency management

## Architecture
```
Client → API Server → Task Queue (Redis) → Worker Pool → PostgreSQL
                           ↓
                   Claude AI Optimizer
```

## Tech Stack
- **Backend:** Node.js, Express
- **Queue:** Redis, RabbitMQ
- **Database:** PostgreSQL
- **Frontend:** React, WebSocket
- **AI:** Claude API (Anthropic)
- **Deployment:** Docker

## Development Roadmap
- **Week 1:** Core backend, queue system, worker pool
- **Week 2:** Dashboard UI, AI integration, deployment

## Current Status
Project structure and architecture planning complete. Implementing core task queue system.

---

*Started: February 10, 2025*  
*Expected Completion: February 17, 2025*
