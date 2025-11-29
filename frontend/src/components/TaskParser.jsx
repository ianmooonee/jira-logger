import { useState, useEffect } from 'react';
import { excelService, jiraService } from '../services/api';
import { FileText, FileSpreadsheet, Calendar } from 'lucide-react';

const TaskParser = ({ onTasksParsed }) => {
  const [mode, setMode] = useState('text'); // 'text' or 'excel'
  const [taskList, setTaskList] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Excel specific
  const [excelDate, setExcelDate] = useState('');
  const [excelDateInput, setExcelDateInput] = useState(''); // For the date input (YYYY-MM-DD format)
  const [excelName, setExcelName] = useState('');
  const [excelPath, setExcelPath] = useState('');

  // Auto-fill date and name when switching to Excel mode
  useEffect(() => {
    if (mode === 'excel') {
      // Set current date
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      setExcelDateInput(dateString);
      setExcelDate(`${day}/${month}/${year}`);
      
      // Get user name from first task (if available)
      const getUserName = async () => {
        try {
          const tasks = await jiraService.getTasks({ force_refresh: false });
          if (tasks.length > 0 && tasks[0].fields.assignee) {
            setExcelName(tasks[0].fields.assignee.displayName);
          }
        } catch (err) {
          console.error('Failed to get user name:', err);
        }
      };
      
      getUserName();
    }
  }, [mode]);

  // Fetch full task details for the matched keys
  const fetchTaskDetails = async (taskKeys) => {
    try {
      const taskPromises = taskKeys.map(key => jiraService.getTask(key));
      const tasks = await Promise.all(taskPromises);
      return tasks;
    } catch (err) {
      console.error('Failed to fetch task details:', err);
      // If fetch fails, return task keys as basic objects
      return taskKeys.map(key => ({ key, fields: { summary: key } }));
    }
  };

  const handleParseText = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await excelService.parseTasks(taskList);
      if (result.count > 0) {
        const tasks = await fetchTaskDetails(result.matched_keys);
        if (onTasksParsed) onTasksParsed(tasks);
      } else {
        setError('No tasks matched. Please check your input.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to parse tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleParseExcel = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = {
        date_str: excelDate,
        name: excelName,
        file_path: excelPath || undefined,
      };

      const result = await excelService.parseFromExcel(data);
      if (result.count > 0) {
        const tasks = await fetchTaskDetails(result.matched_keys);
        if (onTasksParsed) onTasksParsed(tasks);
      } else {
        setError('No tasks matched from Excel cell.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to parse from Excel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Parse Tasks</h2>

      {/* Mode Selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('text')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            mode === 'text'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          From Text
        </button>
        <button
          onClick={() => setMode('excel')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            mode === 'excel'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          From Excel
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {mode === 'text' ? (
        <form onSubmit={handleParseText} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task List
            </label>
            <textarea
              value={taskList}
              onChange={(e) => setTaskList(e.target.value)}
              placeholder="Enter tasks, one per line:&#10;Author TC ABC123&#10;Review TP XYZ456&#10;Rework TC DEF789"
              rows={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Format: [Verb] [Type] [Name] (e.g., "Author TC ABC123")
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Parsing...' : 'Parse & Match Tasks'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleParseExcel} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Date
            </label>
            <input
              type="date"
              value={excelDateInput}
              onChange={(e) => {
                setExcelDateInput(e.target.value);
                // Convert from YYYY-MM-DD (input format) to DD/MM/YYYY (backend format)
                if (e.target.value) {
                  const [year, month, day] = e.target.value.split('-');
                  setExcelDate(`${day}/${month}/${year}`);
                } else {
                  setExcelDate('');
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            {excelDate && (
              <p className="text-sm text-gray-600 mt-1">
                Selected: {excelDate}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name (Column)
            </label>
            <input
              type="text"
              value={excelName}
              onChange={(e) => setExcelName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Excel File Path (optional)
            </label>
            <input
              type="text"
              value={excelPath}
              onChange={(e) => setExcelPath(e.target.value)}
              placeholder="Leave empty for default"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">
              Leave empty to use default configured path
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Parsing...' : 'Parse from Excel'}
          </button>
        </form>
      )}
    </div>
  );
};

export default TaskParser;
