"""Application configuration using JSON config file."""

import os
import sys
import json
from pathlib import Path
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class Settings(BaseModel):
    """Application settings loaded from config.json."""
    
    # Disable environment variable loading
    model_config = ConfigDict(extra='ignore')
    
    # Application
    app_name: str = "JIRA Logger"
    app_version: str = "2.0.0"
    debug: bool = False
    
    # JIRA Configuration
    jira_domain: str = "https://jira.critical.pt"
    jira_pat: Optional[str] = None
    jira_max_results: int = 500
    jira_timeout: int = 30
    
    # Excel Configuration
    default_excel_path: str = ""
    excel_sheet_name: str = "Daily"
    
    # API Configuration
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # Security
    secret_key: str = "change-me-in-production-use-strong-random-key"
    session_max_age: int = 86400  # 24 hours
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"


def load_settings() -> Settings:
    """Load settings from config.json file."""
    # Clear any JIRA environment variables to prevent override
    for key in list(os.environ.keys()):
        if key.startswith('JIRA_'):
            del os.environ[key]
            print(f"Cleared environment variable: {key}")
    
    # Determine config file location
    if getattr(sys, 'frozen', False):
        # Running as compiled exe - look in same directory as exe
        app_dir = Path(sys.executable).parent
    else:
        # Running as script - look in project root
        app_dir = Path(__file__).parent.parent.parent
    
    config_path = app_dir / "config.json"
    print(f"Loading config from: {config_path}")
    
    if config_path.exists():
        with open(config_path, 'r', encoding='utf-8') as f:
            config_data = json.load(f)
        settings = Settings(**config_data)
        print(f"Settings loaded - JIRA_DOMAIN: {settings.jira_domain}")
        print(f"Settings loaded - JIRA_PAT: {settings.jira_pat[:20] + '...' if settings.jira_pat else 'NONE!'}")
        return settings
    else:
        print(f"Config file not found at: {config_path}")
        # Return settings with defaults
        return Settings()


# Global settings instance
settings = load_settings()
