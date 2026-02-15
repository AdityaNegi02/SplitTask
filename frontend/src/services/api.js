import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

export const api = {
  // Get all tasks
  getTasks: async () => {
    const response = await axios.get(`${API_BASE_URL}/tasks`);
    return response.data;
  },

  // Create new task
  createTask: async (taskData) => {
    const response = await axios.post(`${API_BASE_URL}/tasks`, taskData);
    return response.data;
  },

  // Get single task
  getTask: async (id) => {
    const response = await axios.get(`${API_BASE_URL}/tasks/${id}`);
    return response.data;
  },

  // Get task history
  getTaskHistory: async (id) => {
    const response = await axios.get(`${API_BASE_URL}/tasks/${id}/history`);
    return response.data;
  },

  // Delete task
  deleteTask: async (id) => {
    const response = await axios.delete(`${API_BASE_URL}/tasks/${id}`);
    return response.data;
  },

  // Get statistics
  getStats: async () => {
    const response = await axios.get(`${API_BASE_URL}/stats`);
    return response.data;
  },

  // Get workers
  getWorkers: async () => {
    const response = await axios.get(`${API_BASE_URL}/workers`);
    return response.data;
  }
};