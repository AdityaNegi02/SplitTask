import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { useWebSocket } from './hooks/useWebSocket';
import './App.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium'
  });
  
  const { stats, connected } = useWebSocket();

  // Fetch tasks and workers on mount
  useEffect(() => {
    fetchTasks();
    fetchWorkers();
    
    // Refresh every 5 seconds
    const interval = setInterval(() => {
      fetchTasks();
      fetchWorkers();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchTasks = async () => {
    try {
      const data = await api.getTasks();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchWorkers = async () => {
    try {
      const data = await api.getWorkers();
      setWorkers(data.workers || []);
    } catch (error) {
      console.error('Error fetching workers:', error);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    if (!newTask.title) {
      alert('Task title is required!');
      return;
    }

    try {
      await api.createTask(newTask);
      setNewTask({ title: '', description: '', priority: 'medium' });
      fetchTasks();
      alert('✅ Task created successfully!');
    } catch (error) {
      alert('❌ Failed to create task');
      console.error(error);
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    
    try {
      await api.deleteTask(id);
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#4caf50';
      case 'processing': return '#2196f3';
      case 'failed': return '#f44336';
      default: return '#ff9800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#999';
    }
  };

  return (
    <div className="App">
      <header className="header">
        <h1>🚀 SplitTask Dashboard</h1>
        <div className="connection-status">
          <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`}></span>
          {connected ? 'Connected' : 'Disconnected'}
        </div>
      </header>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Tasks</h3>
          <div className="stat-value">{stats?.database?.totalTasks || 0}</div>
        </div>
        <div className="stat-card">
          <h3>Processing</h3>
          <div className="stat-value" style={{color: '#2196f3'}}>
            {stats?.database?.processing || 0}
          </div>
        </div>
        <div className="stat-card">
          <h3>Completed</h3>
          <div className="stat-value" style={{color: '#4caf50'}}>
            {stats?.database?.completed || 0}
          </div>
        </div>
        <div className="stat-card">
          <h3>Failed</h3>
          <div className="stat-value" style={{color: '#f44336'}}>
            {stats?.database?.failed || 0}
          </div>
        </div>
      </div>

      {/* Workers Status */}
      <div className="section">
        <h2>👷 Workers Status</h2>
        <div className="workers-grid">
          {workers.map(worker => (
            <div key={worker.id} className="worker-card">
              <div className="worker-header">
                <h3>Worker #{worker.id}</h3>
                <span className={`status-badge ${worker.isProcessing ? 'busy' : 'idle'}`}>
                  {worker.isProcessing ? 'Busy' : 'Idle'}
                </span>
              </div>
              {worker.currentTask && (
                <div className="current-task">
                  <p><strong>Task #{worker.currentTask.id}:</strong> {worker.currentTask.title}</p>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{width: `${worker.currentTask.progress}%`}}
                    ></div>
                  </div>
                  <p>{worker.currentTask.progress}%</p>
                </div>
              )}
              <div className="worker-stats">
                <span>✅ Completed: {worker.tasksCompleted}</span>
                <span>❌ Failed: {worker.tasksFailed}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Task Form */}
      <div className="section">
        <h2>➕ Create New Task</h2>
        <form onSubmit={handleCreateTask} className="task-form">
          <input
            type="text"
            placeholder="Task Title *"
            value={newTask.title}
            onChange={(e) => setNewTask({...newTask, title: e.target.value})}
            required
          />
          <textarea
            placeholder="Description (optional)"
            value={newTask.description}
            onChange={(e) => setNewTask({...newTask, description: e.target.value})}
          />
          <select
            value={newTask.priority}
            onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
          <button type="submit">Create Task</button>
        </form>
      </div>

      {/* Tasks List */}
      <div className="section">
        <h2>📋 Tasks ({tasks.length})</h2>
        <div className="tasks-list">
          {tasks.length === 0 ? (
            <p className="empty-state">No tasks yet. Create one above!</p>
          ) : (
            tasks.map(task => (
              <div key={task.id} className="task-card">
                <div className="task-header">
                  <h3>#{task.id} - {task.title}</h3>
                  <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="delete-btn"
                  >
                    🗑️
                  </button>
                </div>
                <p className="task-description">{task.description}</p>
                <div className="task-meta">
                  <span 
                    className="badge" 
                    style={{backgroundColor: getStatusColor(task.status)}}
                  >
                    {task.status}
                  </span>
                  <span 
                    className="badge" 
                    style={{backgroundColor: getPriorityColor(task.priority)}}
                  >
                    {task.priority}
                  </span>
                  {task.progress > 0 && (
                    <span className="progress-text">{task.progress}%</span>
                  )}
                </div>
                {task.status === 'processing' && (
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{width: `${task.progress}%`}}
                    ></div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;