import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';
const API_PREFIX = '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// JIRA Service
export const jiraService = {
  async getTasks(params = {}) {
    const response = await api.get(`${API_PREFIX}/jira/tasks`, { params });
    return response.data;
  },

  async getTask(issueKey) {
    const response = await api.get(`${API_PREFIX}/jira/tasks/${issueKey}`);
    return response.data;
  },

  async logWork(data) {
    const response = await api.post(`${API_PREFIX}/jira/log-work`, data);
    return response.data;
  },

  async logWorkBulk(data) {
    const response = await api.post(`${API_PREFIX}/jira/log-work-bulk`, data);
    return response.data;
  },

  async logWorkIndividual(data) {
    const response = await api.post(`${API_PREFIX}/jira/log-work-individual`, data);
    return response.data;
  },

  async getTransitions(issueKey) {
    const response = await api.get(`${API_PREFIX}/jira/transitions/${issueKey}`);
    return response.data;
  },

  async transitionIssue(data) {
    const response = await api.post(`${API_PREFIX}/jira/transition`, data);
    return response.data;
  },
};

// Excel Service
export const excelService = {
  async getEntry(data) {
    const response = await api.post(`${API_PREFIX}/excel/get-entry`, data);
    return response.data;
  },

  async parseTasks(taskList) {
    const response = await api.post(`${API_PREFIX}/excel/parse-tasks`, { task_list: taskList });
    return response.data;
  },

  async parseFromExcel(data) {
    const response = await api.post(`${API_PREFIX}/excel/parse-from-excel`, data);
    return response.data;
  },

  async getColumns(params = {}) {
    const response = await api.get(`${API_PREFIX}/excel/columns`, { params });
    return response.data;
  },
};

export default api;
