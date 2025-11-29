const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

// Get paths for packaged vs dev
const isDev = !app.isPackaged;
const appPath = isDev ? __dirname : path.dirname(app.getPath('exe'));
const backendPath = isDev 
  ? path.join(__dirname, '..') 
  : appPath;
const frontendPath = isDev
  ? path.join(__dirname, '..', 'frontend', 'dist')
  : path.join(process.resourcesPath, 'renderer');

// .env template
const ENV_TEMPLATE = `# JIRA Configuration
JIRA_DOMAIN=https://your-jira-instance.com
JIRA_PAT=your-personal-access-token-here
JIRA_MAX_RESULTS=500
JIRA_TIMEOUT=30

# Excel Configuration
DEFAULT_EXCEL_PATH=C:\\\\Users\\\\YourUsername\\\\Downloads\\\\tracker.xlsx
EXCEL_SHEET_NAME=Daily

# Application
DEBUG=False
SECRET_KEY=change-this-to-random-string

# API
API_PREFIX=/api/v1
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=%(asctime)s - %(name)s - %(levelname)s - %(message)s
`;

// Check if .env exists and create template if not
function checkAndCreateEnvFile() {
  const envPath = path.join(backendPath, '.env');
  
  if (!fs.existsSync(envPath)) {
    // Create template .env file
    try {
      fs.writeFileSync(envPath, ENV_TEMPLATE, 'utf8');
      return { exists: false, created: true, path: envPath };
    } catch (error) {
      return { exists: false, created: false, error: error.message };
    }
  }
  
  return { exists: true, path: envPath };
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
      : path.join(appPath, 'jira_logger.exe');

    const args = isDev
      ? ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000']
      : [];

    const options = {
      cwd: isDev ? backendPath : appPath,
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
  // Check for .env file and create template if missing
  const envCheck = checkAndCreateEnvFile();
  
  if (!envCheck.exists) {
    if (envCheck.created) {
      // .env was created, open it for user to edit
      const response = dialog.showMessageBoxSync({
        type: 'warning',
        title: 'Configuration Required',
        message: 'Configuration file created!',
        detail: `A template .env file has been created at:\n\n${envCheck.path}\n\n` +
                'Please edit this file with your JIRA credentials and settings.\n\n' +
                'Required fields:\n' +
                '  • JIRA_DOMAIN - Your JIRA instance URL\n' +
                '  • JIRA_PAT - Your Personal Access Token\n' +
                '  • DEFAULT_EXCEL_PATH - Path to your Excel tracker\n\n' +
                'Click OK to open the file for editing.',
        buttons: ['Open File', 'Cancel']
      });
      
      if (response === 0) {
        // Open .env file in default text editor
        shell.openPath(envCheck.path);
      }
    } else {
      showErrorDialog(
        'Failed to create configuration file!\n\n' +
        `Error: ${envCheck.error}\n\n` +
        `Please manually create a .env file at:\n${envCheck.path}`
      );
    }
    
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
// IPC handlers
ipcMain.handle('check-env', () => {
  const envCheck = checkAndCreateEnvFile();
  return envCheck.exists;
});Quit when all windows are closed
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
