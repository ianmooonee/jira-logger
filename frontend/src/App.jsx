import { useState } from 'react';
import Header from './components/Header';
import TaskList from './components/TaskList';
import LogWorkForm from './components/LogWorkForm';
import TaskParser from './components/TaskParser';

function App() {
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTasksParsed = (taskKeys) => {
    setSelectedTasks(taskKeys);
  };

  const handleWorkLogged = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Task List */}
          <div className="lg:col-span-2">
            <TaskList
              key={refreshKey}
              onTasksSelected={setSelectedTasks}
              selectedTasks={selectedTasks}
            />
          </div>

          {/* Right Column: Actions */}
          <div className="space-y-6">
            {/* Task Parser */}
            <TaskParser onTasksParsed={handleTasksParsed} />

            {/* Log Work Form */}
            <LogWorkForm
              selectedTasks={selectedTasks}
              onSuccess={handleWorkLogged}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
