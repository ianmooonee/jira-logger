# JIRA Logger - Desktop App

> A modern desktop application for logging time to JIRA tasks efficiently with bulk operations, Excel integration, and smart task matching.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Windows-blue.svg)

---

## 🚀 Quick Start

### For Users

1. **Download** the latest installer from [Releases](https://github.com/ianmooonee/jira-logger/releases)
2. **Run** `JIRA Logger Setup 2.0.0.exe`
3. **Configure** your JIRA credentials on first launch
4. **Start logging** time to your tasks!

### For Developers

**Prerequisites:**
- Python 3.10+
- Node.js 18+
- JIRA instance with API access

**Development Setup:**
```powershell
# Clone the repository
git clone https://github.com/ianmooonee/jira-logger.git
cd jira-logger

# Install dependencies
.\install.ps1

# Run in development mode
.\start.ps1
```

Then open: http://localhost:5173

---

## ✨ Features

- 🖥️ **Desktop Application** - Native Windows app with system tray integration
- 🔄 **Auto-Updates** - Get notified when new versions are available
- 🌙 **Dark Mode** - Beautiful dark theme by default
- 📋 **Task Browser** - View, filter, and sort your assigned JIRA tasks
- 🔍 **Smart Search** - Search by task key (WRSHALLOWFORD-5816) or summary
- 👤 **Assignee Display** - See who's assigned to each task
- 🔄 **State Transitions** - Click status badges to change task states
- ⚡ **Bulk Logging** - Log the same time to multiple tasks at once
- 📝 **Individual Logging** - Set different times for each task
- 📊 **Excel Integration** - Parse tasks from your daily tracker Excel file
- 📅 **Calendar Widgets** - HTML5 date and time pickers for all inputs
- 💾 **Smart Caching** - Instant loading with 10-minute auto-refresh

---

## 📦 Installation

### Option 1: Install from Release (Recommended)

1. Download `JIRA Logger Setup 2.0.0.exe` from the [latest release](https://github.com/ianmooonee/jira-logger/releases/latest)
2. Run the installer
3. Launch JIRA Logger from Start Menu or Desktop shortcut
4. On first launch, configure your JIRA credentials

### Option 2: Build from Source

```powershell
# 1. Clone and install
git clone https://github.com/ianmooonee/jira-logger.git
cd jira-logger
.\install.ps1

# 2. Build desktop app
.\build.ps1

# 3. Installer will be in electron\dist\
```

---

## ⚙️ Configuration

On first launch, the app will create a `config.json` template. Edit it with your JIRA credentials:

**Location:** `C:\Users\YourName\AppData\Local\Programs\JIRA Logger\resources\app.asar.unpacked\config.json`

**Quick Access:** Click "Configure JIRA" in the app menu

```json
{
  "jira_domain": "https://your-jira-instance.com",
  "jira_pat": "your-personal-access-token",
  "jira_max_results": 500,
  "jira_timeout": 30,
  "default_excel_path": "C:\\Users\\YourName\\Downloads\\tracker.xlsx",
  "excel_sheet_name": "Daily",
  "debug": false,
  "secret_key": "your-secure-random-key",
  "log_level": "INFO",
  "api_prefix": "/api/v1",
  "cors_origins": ["http://localhost:3000", "http://localhost:5173"],
  "log_format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
}
```

### Getting Your JIRA Personal Access Token

1. Go to your JIRA account settings
2. Security → Create and manage API tokens
3. Click "Create API token"
4. Copy the token and paste it into `jira_pat` in config.json

---

## 🎯 Usage

### 1. Browse Tasks
- All your assigned tasks load automatically
- Use search to filter by task key (e.g., `WRSHALLOWFORD-5816`) or summary
- Sort by key or summary
- See assignee and status at a glance

### 2. Select Tasks
- Click tasks to select them
- Use "Select All" for bulk operations
- Selection count shown in header

### 3. Log Work

**Bulk Mode** (same time for all):
- Select multiple tasks
- Choose "Same Time for All"
- Enter time (e.g., `2h30m`)
- Pick date and time with calendar widgets
- Optionally change state (e.g., "In Progress")
- Submit

**Individual Mode** (different times):
- Select multiple tasks
- Choose "Individual Times"
- Set time and date for each task separately
- Set state transitions per task
- Submit

### 4. Parse Tasks from Excel
- Switch to "Excel" mode in Task Parser
- Date and name auto-fill
- Tasks are matched from your Excel file
- Select matched tasks and log time

---

## 🏗️ Architecture

### Desktop App (Electron + Python)
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: FastAPI (bundled as standalone .exe)
- **Desktop**: Electron 28
- **Packaging**: electron-builder + PyInstaller
- **Updates**: electron-updater (GitHub Releases)

### Backend (FastAPI)
- **Framework**: FastAPI with async/await
- **HTTP Client**: httpx (async)
- **Validation**: Pydantic v2
- **Caching**: SQLite (10-minute expiry)
- **Excel**: pandas + openpyxl

### Frontend (React)
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS (dark mode)
- **HTTP**: Axios
- **Date Handling**: date-fns
- **Icons**: lucide-react

---

## 📁 Project Structure

```
jira-logger/
├── app/                      # Backend (FastAPI)
│   ├── api/                 # API endpoints
│   ├── core/                # Configuration & exceptions
│   ├── db/                  # SQLite database
│   ├── models/              # Pydantic models
│   └── services/            # Business logic
├── frontend/                # Frontend (React + Vite)
│   └── src/
│       ├── components/      # React components
│       ├── context/         # React context
│       └── services/        # API client
├── electron/                # Electron desktop app
│   ├── main.js             # Electron main process
│   ├── preload.js          # Preload script
│   └── package.json        # Electron config
├── main_standalone.py       # Backend entry point (standalone)
├── flask_app.py            # Backend entry point (development)
├── requirements.txt         # Python dependencies
├── build.ps1               # Desktop build script
├── install.ps1             # Setup script
├── start.ps1               # Development run script
└── config.json             # Configuration (gitignored)
```

---

## 🔧 Development

### Run Development Mode

**Terminal 1 (Backend):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python flask_app.py
```

**Terminal 2 (Frontend):**
```powershell
cd frontend
npm install
npm run dev
```

**Terminal 3 (Electron - Optional):**
```powershell
cd electron
npm install
npm start
```

### Build Desktop App

```powershell
.\build.ps1
```

This will:
1. Build the React frontend
2. Bundle Python backend into standalone .exe
3. Package Electron desktop app
4. Create installer in `electron\dist\`

### Publishing a Release

See [HOW_TO_RELEASE.md](HOW_TO_RELEASE.md) for complete instructions.

**Quick version:**
```powershell
# 1. Update version in electron/package.json
# 2. Build
.\build.ps1

# 3. Publish to GitHub
$env:GH_TOKEN = "your_github_token"
cd electron
npm run publish
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open a Pull Request

---

## 📜 License

MIT License - see [LICENSE](LICENSE) file

---

## 🆘 Support

### Common Issues

**"JIRA API returns 401"**
- Check your PAT is valid in config.json
- Verify jira_domain is correct (include `https://`)

**"Tasks not loading"**
- Click the refresh button to force reload
- Check config.json has valid credentials
- Open DevTools (Ctrl+Shift+I) to check for errors

**"Excel file not found"**
- Update `default_excel_path` in config.json
- Use absolute Windows path with double backslashes: `C:\\Users\\...`

**"App won't start"**
- Delete `config.json` and restart (it will create a new template)
- Check if port 8000 is available
- Try running as administrator

**"Backend process stays running after closing app"**
- This is fixed in version 2.0.0+
- Update to the latest version

### Getting Help
- Check [HOW_TO_RELEASE.md](HOW_TO_RELEASE.md) for publishing releases
- Open an issue on GitHub

---

## 🔄 Auto-Updates

The app automatically checks for updates when launched. When a new version is available:
1. You'll see a notification dialog
2. Click "Download" to get the update
3. Update installs when you close the app
4. Next launch runs the new version!

Updates are published via GitHub Releases.

---

**Made with ❤️ for efficient JIRA time tracking**
