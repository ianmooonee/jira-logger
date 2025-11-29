const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

// Get paths for packaged vs dev
const isDev = !app.isPackaged;
const appPath = isDev ? __dirname : process.resourcesPath;
const backendPath = isDev 
  ? path.join(appPath, '..') 
  : path.join(appPath, 'backend');
const frontendPath = isDev
  ? path.join(appPath, '..', 'frontend', 'dist')
  : path.join(appPath, 'renderer');

// Check if .env exists
function checkEnvFile() {
  const envPath = path.join(backendPath, '.env');
  return fs.existsSync(envPath);
}

// Start Python backend
function startBackend() {
  return new Promise((resolve, reject) => {
    const envPath = path.join(backendPath, '.env');
    
    if (!fs.existsSync(envPath)) {
      reject(new Error('.env file not found'));
      return;
    }

    const backendExe = isDev
      ? 'python'
      : path.join(backendPath, 'jira_logger.exe');

    const args = isDev
      ? ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000']
      : [];

    const options = {
      cwd: backendPath,
      env: { ...process.env }
    };

    backendProcess = spawn(backendExe, args, options);

    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend: ${data}`);
      if (data.toString().includes('Uvicorn running') || data.toString().includes('Application startup complete')) {
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend error: ${data}`);
    });

    backendProcess.on('error', (error) => {
      reject(error);
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
    });

    // Timeout fallback
    setTimeout(() => resolve(), 3000);
  });
}

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  // Load the frontend
  const indexPath = path.join(frontendPath, 'index.html');
  mainWindow.loadFile(indexPath);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Show error dialog
function showErrorDialog(message) {
  dialog.showErrorBox('Configuration Error', message);
}

// App ready
app.whenReady().then(async () => {
  // Check for .env file first
  if (!checkEnvFile()) {
    showErrorDialog(
      'Configuration file (.env) not found!\n\n' +
      'Please create a .env file with your JIRA credentials:\n\n' +
      'JIRA_DOMAIN=https://your-jira-instance.com\n' +
      'JIRA_PAT=your-personal-access-token\n\n' +
      `Expected location: ${path.join(backendPath, '.env')}`
    );
    app.quit();
    return;
  }

  try {
    // Start backend
    await startBackend();
    console.log('Backend started successfully');

    // Create window
    createWindow();
  } catch (error) {
    console.error('Failed to start backend:', error);
    showErrorDialog(
      'Failed to start application backend!\n\n' +
      `Error: ${error.message}\n\n` +
      'Please check your .env configuration and try again.'
    );
    app.quit();
  }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Kill backend on quit
app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('check-env', () => {
  return checkEnvFile();
});
