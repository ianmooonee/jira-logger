const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

// Configure auto-updater
autoUpdater.autoDownload = false; // Ask user before downloading
autoUpdater.autoInstallOnAppQuit = true;

// Get paths for packaged vs dev
const isDev = !app.isPackaged;
const appPath = isDev ? __dirname : path.dirname(app.getPath('exe'));
const backendPath = isDev 
  ? path.join(__dirname, '..') 
  : appPath;
const backendExePath = isDev
  ? null  // Will use python in dev mode
  : path.join(process.resourcesPath, 'app.asar.unpacked', 'jira_logger.exe');
const frontendPath = isDev
  ? path.join(__dirname, '..', 'frontend', 'dist')
  : path.join(__dirname, 'renderer');

// Path to backend directory where config.json should be
const backendDir = isDev 
  ? backendPath 
  : path.join(process.resourcesPath, 'app.asar.unpacked');

// Check if config.json exists and create from template if not
function checkAndCreateConfigFile() {
  const configPath = path.join(backendDir, 'config.json');
  const templatePath = isDev
    ? path.join(__dirname, 'config.template.json')
    : path.join(process.resourcesPath, 'app.asar.unpacked', 'config.template.json');
  
  if (!fs.existsSync(configPath)) {
    // Create config.json from template
    try {
      if (fs.existsSync(templatePath)) {
        fs.copyFileSync(templatePath, configPath);
      } else {
        // Fallback to hardcoded template if file not found
        const CONFIG_TEMPLATE = {
          "jira_domain": "https://your-jira-instance.com",
          "jira_pat": "your-personal-access-token-here",
          "jira_max_results": 500,
          "jira_timeout": 30,
          "default_excel_path": "C:\\Users\\YourUsername\\Downloads\\tracker.xlsx",
          "excel_sheet_name": "Daily",
          "debug": false,
          "secret_key": "change-this-to-random-string",
          "api_prefix": "/api/v1",
          "cors_origins": ["http://localhost:3000", "http://localhost:5173"],
          "log_level": "INFO",
          "log_format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        };
        fs.writeFileSync(configPath, JSON.stringify(CONFIG_TEMPLATE, null, 2), 'utf8');
      }
      return { exists: false, created: true, path: configPath };
    } catch (error) {
      return { exists: false, created: false, error: error.message };
    }
  }
  
  return { exists: true, path: configPath };
}

// Start Python backend
function startBackend() {
  return new Promise((resolve, reject) => {
    const configPath = path.join(backendDir, 'config.json');
    
    if (!fs.existsSync(configPath)) {
      reject(new Error('config.json file not found at: ' + configPath));
      return;
    }

    const backendExe = isDev
      ? 'python'
      : backendExePath;

    const args = isDev
      ? ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000']
      : [];

    const options = {
      cwd: isDev ? backendPath : path.dirname(backendExePath),
      env: { 
        ...process.env
      }
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
    if (backendProcess) {
      backendProcess.kill();
      backendProcess = null;
    }
    mainWindow = null;
  });
}

// Show error dialog
function showErrorDialog(message) {
  dialog.showErrorBox('Configuration Error', message);
}

// App ready
app.whenReady().then(async () => {
  // Check for config.json file and create template if missing
  const configCheck = checkAndCreateConfigFile();
  
  if (!configCheck.exists) {
    if (configCheck.created) {
      // config.json was created, open it for user to edit
      const response = dialog.showMessageBoxSync({
        type: 'warning',
        title: 'Configuration Required',
        message: 'Configuration file created!',
        detail: `A template config.json file has been created at:\n\n${configCheck.path}\n\n` +
                'Please edit this file with your JIRA credentials and settings.\n\n' +
                'Required fields:\n' +
                '  • jira_domain - Your JIRA instance URL\n' +
                '  • jira_pat - Your Personal Access Token\n' +
                '  • default_excel_path - Path to your Excel tracker\n\n' +
                'Click OK to open the file for editing.',
        buttons: ['Open File', 'Cancel']
      });
      
      if (response === 0) {
        // Open config.json file in default text editor
        shell.openPath(configCheck.path);
      }
    } else {
      showErrorDialog(
        'Failed to create configuration file!\n\n' +
        `Error: ${configCheck.error}\n\n` +
        `Please manually create a config.json file at:\n${configCheck.path}`
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

    // Check for updates (only in production)
    if (!isDev) {
      checkForUpdates();
    }
  } catch (error) {
    console.error('Failed to start backend:', error);
    showErrorDialog(
      'Failed to start application backend!\n\n' +
      `Error: ${error.message}\n\n` +
      'Please check your config.json configuration and try again.'
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
  const configCheck = checkAndCreateConfigFile();
  return configCheck.exists;
});

// Auto-update functions
function checkForUpdates() {
  autoUpdater.checkForUpdates();
}

// Auto-updater event handlers
autoUpdater.on('update-available', (info) => {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: `A new version (${info.version}) is available!`,
    detail: 'Do you want to download it now? The update will be installed when you close the app.',
    buttons: ['Download', 'Later'],
    defaultId: 0,
    cancelId: 1
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });
});

autoUpdater.on('update-not-available', () => {
  console.log('No updates available');
});

autoUpdater.on('download-progress', (progressObj) => {
  let message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`;
  console.log(message);
  
  // Update window title with download progress
  if (mainWindow) {
    mainWindow.setTitle(`JIRA Logger - Downloading update ${Math.round(progressObj.percent)}%`);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  // Reset window title
  if (mainWindow) {
    mainWindow.setTitle('JIRA Logger');
  }

  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Ready',
    message: `Version ${info.version} has been downloaded.`,
    detail: 'The update will be installed when you close the app. Click "Restart Now" to install immediately.',
    buttons: ['Restart Now', 'Later'],
    defaultId: 0,
    cancelId: 1
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (error) => {
  console.error('Update error:', error);
});
