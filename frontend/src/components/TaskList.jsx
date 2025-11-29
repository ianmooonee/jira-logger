import { useState, useEffect } from 'react';
import { useTasks } from '../hooks/useJira';
import { jiraService } from '../services/api';
import { Search, Filter, Clock, CheckSquare, Square, ChevronDown, Loader2, RefreshCw } from 'lucide-react';

const TaskList = ({ onTasksSelected, selectedTasks = [] }) => {
  const { tasks, loading, error, fetchTasks } = useTasks();
  const [filterKeyword, setFilterKeyword] = useState('');
  const [sortBy, setSortBy] = useState('summary');
  const [sortOrder, setSortOrder] = useState('desc');
  const [localSelectedTasks, setLocalSelectedTasks] = useState(new Set(selectedTasks));
  
  // State transition management
  const [openStatusDropdown, setOpenStatusDropdown] = useState(null);
  const [taskTransitions, setTaskTransitions] = useState({});
  const [transitioningTask, setTransitioningTask] = useState(null);
  
  // Auto-refresh management
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    loadTasks();
    setLastRefresh(new Date());
    
    // Auto-refresh every 10 minutes
    const intervalId = setInterval(() => {
      loadTasks(true); // Silent refresh
    }, 10 * 60 * 1000); // 10 minutes
    
    return () => clearInterval(intervalId);
  }, []);

  const loadTasks = async (silent = false) => {
    try {
      if (!silent) setIsRefreshing(true);
      await fetchTasks({ sort_by: sortBy, sort_order: sortOrder, filter_keyword: filterKeyword });
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };
  
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Force refresh from JIRA API
      await fetchTasks({ 
        sort_by: sortBy, 
        sort_order: sortOrder, 
        filter_keyword: filterKeyword,
        force_refresh: true 
      });
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to refresh tasks:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilterKeyword(e.target.value);
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    loadTasks();
  };

  const handleTaskToggle = (task) => {
    const newSelected = new Set(localSelectedTasks);
    const existingTask = Array.from(newSelected).find(t => (t.key || t) === task.key);
    
    if (existingTask) {
      newSelected.delete(existingTask);
    } else {
      newSelected.add(task);
    }
    setLocalSelectedTasks(newSelected);
    if (onTasksSelected) {
      onTasksSelected(Array.from(newSelected));
    }
  };

  const handleSelectAll = () => {
    if (localSelectedTasks.size === tasks.length) {
      setLocalSelectedTasks(new Set());
      if (onTasksSelected) onTasksSelected([]);
    } else {
      const allTasks = new Set(tasks);
      setLocalSelectedTasks(allTasks);
      if (onTasksSelected) onTasksSelected(Array.from(allTasks));
    }
  };

  const handleStatusClick = async (e, taskKey) => {
    e.stopPropagation(); // Prevent task selection
    
    if (openStatusDropdown === taskKey) {
      setOpenStatusDropdown(null);
      return;
    }
    
    setOpenStatusDropdown(taskKey);
    
    // Fetch transitions if not already loaded
    if (!taskTransitions[taskKey]) {
      try {
        const response = await jiraService.getTransitions(taskKey);
        setTaskTransitions(prev => ({
          ...prev,
          [taskKey]: response.transitions || []
        }));
      } catch (err) {
        console.error(`Failed to fetch transitions for ${taskKey}:`, err);
        setTaskTransitions(prev => ({
          ...prev,
          [taskKey]: []
        }));
      }
    }
  };

  const handleTransition = async (e, taskKey, transitionName) => {
    e.stopPropagation();
    
    setTransitioningTask(taskKey);
    setOpenStatusDropdown(null);
    
    try {
      await jiraService.transitionIssue({
        issue_key: taskKey,
        target_state: transitionName
      });
      
      // Reload tasks to get updated status
      await loadTasks();
    } catch (err) {
      console.error(`Failed to transition ${taskKey}:`, err);
      alert(`Failed to transition task: ${err.response?.data?.detail || err.message}`);
    } finally {
      setTransitioningTask(null);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenStatusDropdown(null);
    if (openStatusDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openStatusDropdown]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <form onSubmit={handleFilterSubmit} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
            <input
              type="text"
              value={filterKeyword}
              onChange={handleFilterChange}
              placeholder="Filter tasks..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="summary">Summary</option>
              <option value="key">Key</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>

      {/* Task Count and Select All */}
      <div className="flex justify-between items-center">
        <p className="text-gray-600 dark:text-gray-400">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''} found
          {localSelectedTasks.size > 0 && ` (${localSelectedTasks.size} selected)`}
          {lastRefresh && (
            <span className="text-xs ml-2">
              • Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1 px-3 py-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium disabled:opacity-50 transition-colors"
            title="Refresh from JIRA"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {tasks.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {localSelectedTasks.size === tasks.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {tasks.map((task) => {
          const isSelected = Array.from(localSelectedTasks).some(t => (t.key || t) === task.key);
          const isDropdownOpen = openStatusDropdown === task.key;
          const isTransitioning = transitioningTask === task.key;
          const transitions = taskTransitions[task.key] || [];
          
          return (
            <div
              key={task.key}
              onClick={() => handleTaskToggle(task)}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">{task.key}</span>
                    {task.fields.status && (
                      <div className="relative">
                        <button
                          onClick={(e) => handleStatusClick(e, task.key)}
                          disabled={isTransitioning}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          {isTransitioning ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              {task.fields.status.name}
                              <ChevronDown className="w-3 h-3" />
                            </>
                          )}
                        </button>
                        
                        {isDropdownOpen && (
                          <div className="absolute z-10 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg min-w-[150px]">
                            {transitions.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                                No transitions available
                              </div>
                            ) : (
                              <div className="py-1">
                                {transitions.map((transition) => (
                                  <button
                                    key={transition.id}
                                    onClick={(e) => handleTransition(e, task.key, transition.name)}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                  >
                                    {transition.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {task.fields.assignee && (
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                        {task.fields.assignee.displayName}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">{task.fields.summary}</p>
                  {task.fields.updated && (
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Updated: {new Date(task.fields.updated).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No tasks found. Try adjusting your filters.</p>
        </div>
      )}
    </div>
  );
};

export default TaskList;
