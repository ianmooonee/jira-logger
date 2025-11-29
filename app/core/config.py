"""Application configuration using Pydantic settings."""

from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Application
    app_name: str = "JIRA Logger"
    app_version: str = "2.0.0"
    debug: bool = False
    
    # JIRA Configuration
    jira_domain: str = "https://jira.critical.pt"
    jira_pat: Optional[str] = None
    jira_max_results: int = 100
    jira_timeout: int = 30
    
    # Excel Configuration
    default_excel_path: str = "/mnt/c/Users/peserrano/OneDrive - CRITICAL SOFTWARE, S.A/BSP_G2/BSP-G2_Daily_Tracker.xlsx"
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
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


# Global settings instance
settings = Settings()
