# JIRA Logger

> A modern web application for logging time to JIRA tasks efficiently with bulk operations, Excel integration, and smart task matching.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- JIRA instance with API access

### Running the App

**Option 1 - Quick Start:**
```powershell
# First time setup
.\install.ps1

# Start the app
.\start.ps1
```

Then open: http://localhost:5173

**Option 2 - Manual:**

Terminal 1 (Backend):
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python flask_app.py
```

Terminal 2 (Frontend):
```powershell
cd frontend
npm install
npm run dev
```

Then open: http://localhost:5173

---

## ✨ Features

- 🌙 **Dark Mode** - Beautiful dark theme by default
- 📋 **Task Browser** - View, filter, and sort your assigned JIRA tasks
- 👤 **Assignee Display** - See who's assigned to each task
- 🔄 **State Transitions** - Click status badges to change task states
- ⚡ **Bulk Logging** - Log the same time to multiple tasks at once
- 📝 **Individual Logging** - Set different times for each task
- 📊 **Excel Integration** - Parse tasks from your daily tracker Excel file
- 📅 **Calendar Widgets** - HTML5 date and time pickers for all inputs
- 💾 **Smart Caching** - Instant loading with 10-minute auto-refresh

---

## 🎯 Usage

### 1. Configure
Create a `.env` file with your JIRA credentials:
```env
JIRA_DOMAIN=https://your-jira-instance.com
JIRA_PAT=your-personal-access-token
DEFAULT_EXCEL_PATH=C:\path\to\your\tracker.xlsx
EXCEL_SHEET_NAME=Daily
```

### 2. Browse Tasks
- All your assigned tasks load automatically
- Use search to filter by task key or summary
- Sort by key or summary
- See assignee and status at a glance

### 3. Select Tasks
- Click tasks to select them
- Use "Select All" for bulk operations
- Selection count shown in header

### 4. Log Work

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

### 5. Parse Tasks from Excel
- Switch to "Excel" mode in Task Parser
- Date and name auto-fill
- Tasks are matched from your Excel file
- Select matched tasks and log time

---

## 🏗️ Architecture

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
├── app/                    # Backend (FastAPI)
│   ├── api/               # API endpoints
│   ├── core/              # Configuration & exceptions
│   ├── db/                # SQLite database
│   ├── models/            # Pydantic models
│   └── services/          # Business logic
├── frontend/              # Frontend (React + Vite)
│   └── src/
│       ├── components/    # React components
│       ├── context/       # React context
│       └── services/      # API client
├── flask_app.py           # Backend entry point
├── requirements.txt       # Python dependencies
├── install.ps1            # Setup script
├── start.ps1              # Run script
└── .env                   # Configuration
```

---

## 🔐 Configuration

Create a `.env` file:

```env
# Required
JIRA_DOMAIN=https://your-jira-instance.com
JIRA_PAT=your-personal-access-token

# Optional
JIRA_MAX_RESULTS=500
JIRA_TIMEOUT=30
DEFAULT_EXCEL_PATH=C:\Users\YourName\Downloads\tracker.xlsx
EXCEL_SHEET_NAME=Daily
DEBUG=False
SECRET_KEY=your-secure-random-key
LOG_LEVEL=INFO
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch from `dev`
3. Make your changes
4. Commit with clear messages
5. Push to your fork
6. Create a Pull Request to `dev` branch

### Branch Strategy
- `main` - Production releases only
- `dev` - Active development

---

## 📜 License

MIT License - see [LICENSE](LICENSE) file

---

## 🆘 Support

### Common Issues

**"JIRA API returns 401"**
- Check your PAT is valid
- Verify JIRA_DOMAIN is correct in .env

**"Tasks not loading"**
- Check backend is running on port 8000
- Verify JIRA_PAT is set in .env
- Try manual refresh button

**"Excel file not found"**
- Update DEFAULT_EXCEL_PATH in .env
- Use absolute Windows path

### Getting Help
- Check API documentation: http://localhost:8000/docs
- Open an issue on GitHub

---

**Made with ❤️ for efficient JIRA time tracking**
