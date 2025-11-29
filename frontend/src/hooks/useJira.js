import { useState, useEffect } from 'react';
import { jiraService } from '../services/api';

export const useTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTasks = async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await jiraService.getTasks(params);
      setTasks(data);
      return data;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to fetch tasks';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return { tasks, loading, error, fetchTasks, setTasks };
};

export const useWorkLog = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const logWork = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const result = await jiraService.logWork(data);
      return result;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to log work';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const logWorkBulk = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const result = await jiraService.logWorkBulk(data);
      return result;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to log work in bulk';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const logWorkIndividual = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const result = await jiraService.logWorkIndividual(data);
      return result;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to log individual work';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return { logWork, logWorkBulk, logWorkIndividual, loading, error };
};
