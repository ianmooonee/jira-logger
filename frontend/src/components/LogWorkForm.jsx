import { useState, useEffect } from 'react';
import { useWorkLog } from '../hooks/useJira';
import { jiraService } from '../services/api';
import { format } from 'date-fns';
import { Clock, Calendar, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

const LogWorkForm = ({ selectedTasks = [], onSuccess }) => {
  const { logWorkBulk, logWorkIndividual, loading } = useWorkLog();
  const [mode, setMode] = useState('bulk'); // 'bulk' or 'individual'
  const [timeSpent, setTimeSpent] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [individualTimes, setIndividualTimes] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState([]);
  
  // State transitions
  const [bulkTargetState, setBulkTargetState] = useState('');
  const [taskTransitions, setTaskTransitions] = useState({});
  const [loadingTransitions, setLoadingTransitions] = useState(false);
  
  // Set current date/time as default on mount
  useEffect(() => {
    const now = new Date();
    const defaultDateTime = format(now, 'HH:mm dd-MM-yyyy');
    setDateInput(defaultDateTime);
  }, []);

  // Fetch available transitions for selected tasks
  useEffect(() => {
    const fetchTransitions = async () => {
      if (selectedTasks.length === 0) return;
      
      setLoadingTransitions(true);
      const transitions = {};
      
      try {
        await Promise.all(
          selectedTasks.map(async (task) => {
            const key = task.key || task;
            try {
              const response = await jiraService.getTransitions(key);
              transitions[key] = response.transitions || [];
            } catch (err) {
              console.error(`Failed to fetch transitions for ${key}:`, err);
              transitions[key] = [];
            }
          })
        );
        setTaskTransitions(transitions);
      } finally {
        setLoadingTransitions(false);
      }
    };
    
    fetchTransitions();
  }, [selectedTasks]);

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        issue_keys: selectedTasks.map(task => task.key || task),
        time_spent: timeSpent,
        date_input: dateInput || undefined,
        target_state: bulkTargetState || undefined,
      };

      const response = await logWorkBulk(data);
      setResults(response);
      setShowResults(true);
      
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to log work:', err);
    }
  };

  const handleIndividualSubmit = async (e) => {
    e.preventDefault();

    try {
      const workLogs = selectedTasks.map(task => {
        const key = task.key || task;
        return {
          issue_key: key,
          time_spent: individualTimes[key]?.time || '0m',
          date_input: individualTimes[key]?.date || dateInput || undefined,
          target_state: individualTimes[key]?.targetState || undefined,
        };
      });

      const data = { work_logs: workLogs };
      const response = await logWorkIndividual(data);
      setResults(response);
      setShowResults(true);
      
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to log work:', err);
    }
  };

  const handleIndividualTimeChange = (taskKey, field, value) => {
    setIndividualTimes(prev => ({
      ...prev,
      [taskKey]: {
        ...prev[taskKey],
        [field]: value,
      },
    }));
  };
  
  // Initialize individual times with current date when tasks change
  useEffect(() => {
    if (selectedTasks.length > 0 && mode === 'individual') {
      const now = new Date();
      const defaultDateTime = format(now, 'HH:mm dd-MM-yyyy');
      const initialTimes = {};
      selectedTasks.forEach(task => {
        if (!individualTimes[task.key || task]) {
          initialTimes[task.key || task] = { date: defaultDateTime, time: '' };
        }
      });
      if (Object.keys(initialTimes).length > 0) {
        setIndividualTimes(prev => ({ ...prev, ...initialTimes }));
      }
    }
  }, [selectedTasks, mode]);

  const getCurrentDateTime = () => {
    const now = new Date();
    return format(now, 'HH:mm dd-MM-yyyy');
  };

  // Get transitions that are available for ALL selected tasks (for bulk mode)
  const getCommonTransitions = () => {
    if (selectedTasks.length === 0) return [];
    
    const taskKeys = selectedTasks.map(task => task.key || task);
    const allTransitions = taskKeys.map(key => 
      (taskTransitions[key] || []).map(t => t.name)
    );
    
    if (allTransitions.length === 0) return [];
    
    // Find intersection of all transitions
    return allTransitions.reduce((common, transitions) => 
      common.filter(t => transitions.includes(t))
    );
  };

  if (selectedTasks.length === 0) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded-lg">
        Please select at least one task to log work.
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Work Log Results</h3>
        <div className="space-y-2 mb-6">
          {results.map((result, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                result.success ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}
            >
              {result.success ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <div className="flex-1">
                <p className="font-medium">{result.issue_key}</p>
                <p className="text-sm">{result.message}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            setShowResults(false);
            setResults([]);
            setTimeSpent('');
            setDateInput('');
            setIndividualTimes({});
            setBulkTargetState('');
          }}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Log More Work
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Log Work for {selectedTasks.length} Task(s)</h3>

      {/* Mode Selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('bulk')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'bulk'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Same Time for All
        </button>
        <button
          onClick={() => setMode('individual')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'individual'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Individual Times
        </button>
      </div>

      {mode === 'bulk' ? (
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Clock className="inline w-4 h-4 mr-1" />
              Time Spent
            </label>
            <input
              type="text"
              value={timeSpent}
              onChange={(e) => setTimeSpent(e.target.value)}
              placeholder="e.g., 1h30m, 2h, 45m"
              pattern="([0-9]+h)?([0-9]+m)?"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              required
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Format: 1h30m, 2h, 45m</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                Date (optional)
              </label>
              <input
                type="date"
                value={dateInput.split(' ')[1] ? (() => {
                  const [d, m, y] = dateInput.split(' ')[1].split('-');
                  return `${y}-${m}-${d}`;
                })() : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const [y, m, d] = e.target.value.split('-');
                    const time = dateInput.split(' ')[0] || format(new Date(), 'HH:mm');
                    setDateInput(`${time} ${d}-${m}-${y}`);
                  } else {
                    setDateInput('');
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Clock className="inline w-4 h-4 mr-1" />
                Time (optional)
              </label>
              <input
                type="time"
                value={dateInput.split(' ')[0] || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const date = dateInput.split(' ')[1] || format(new Date(), 'dd-MM-yyyy');
                    setDateInput(`${e.target.value} ${date}`);
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <ArrowRight className="inline w-4 h-4 mr-1" />
              Transition State (optional)
            </label>
            <select
              value={bulkTargetState}
              onChange={(e) => setBulkTargetState(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              disabled={loadingTransitions}
            >
              <option value="">No state change</option>
              {getCommonTransitions().map((transition) => (
                <option key={transition} value={transition}>
                  {transition}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {loadingTransitions ? 'Loading available states...' : 'Only shows states available for all selected tasks'}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Logging Work...' : 'Log Work for All Tasks'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleIndividualSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Date & Time (optional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="date"
                value={dateInput.split(' ')[1] ? (() => {
                  const [d, m, y] = dateInput.split(' ')[1].split('-');
                  return `${y}-${m}-${d}`;
                })() : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const [y, m, d] = e.target.value.split('-');
                    const time = dateInput.split(' ')[0] || format(new Date(), 'HH:mm');
                    setDateInput(`${time} ${d}-${m}-${y}`);
                  } else {
                    setDateInput('');
                  }
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <input
                type="time"
                value={dateInput.split(' ')[0] || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const date = dateInput.split(' ')[1] || format(new Date(), 'dd-MM-yyyy');
                    setDateInput(`${e.target.value} ${date}`);
                  }
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Applied to all tasks (can override individually)</p>
          </div>

          <div className="space-y-3">
            {selectedTasks.map((task) => {
              const taskKey = task.key || task;
              const taskSummary = task.fields?.summary || task.summary || taskKey;
              const currentStatus = task.fields?.status?.name || 'Unknown';
              const availableTransitions = taskTransitions[taskKey] || [];
              
              return (
                <div key={taskKey} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50">
                  <div className="mb-2">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{taskSummary}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{taskKey}</p>
                      <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                        {currentStatus}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Time Spent
                      </label>
                      <input
                        type="text"
                        value={individualTimes[taskKey]?.time || ''}
                        onChange={(e) => handleIndividualTimeChange(taskKey, 'time', e.target.value)}
                        placeholder="e.g., 1h30m"
                        pattern="([0-9]+h)?([0-9]+m)?"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          value={individualTimes[taskKey]?.date?.split(' ')[1] ? (() => {
                            const [d, m, y] = individualTimes[taskKey].date.split(' ')[1].split('-');
                            return `${y}-${m}-${d}`;
                          })() : ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              const [y, m, d] = e.target.value.split('-');
                              const time = individualTimes[taskKey]?.date?.split(' ')[0] || format(new Date(), 'HH:mm');
                              handleIndividualTimeChange(taskKey, 'date', `${time} ${d}-${m}-${y}`);
                            }
                          }}
                          className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Time
                        </label>
                        <input
                          type="time"
                          value={individualTimes[taskKey]?.date?.split(' ')[0] || ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              const date = individualTimes[taskKey]?.date?.split(' ')[1] || format(new Date(), 'dd-MM-yyyy');
                              handleIndividualTimeChange(taskKey, 'date', `${e.target.value} ${date}`);
                            }
                          }}
                          className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      <ArrowRight className="inline w-3 h-3 mr-1" />
                      Change State (optional)
                    </label>
                    <select
                      value={individualTimes[taskKey]?.targetState || ''}
                      onChange={(e) => handleIndividualTimeChange(taskKey, 'targetState', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      disabled={loadingTransitions}
                    >
                      <option value="">No change</option>
                      {availableTransitions.map((transition) => (
                        <option key={transition.id} value={transition.name}>
                          {transition.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Logging Work...' : 'Log Individual Work'}
          </button>
        </form>
      )}
    </div>
  );
};

export default LogWorkForm;
