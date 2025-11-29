"""SQLite database setup and connection management."""

import sqlite3
from pathlib import Path
from typing import Optional
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)

# Database file location
DB_PATH = Path(__file__).parent.parent.parent / "data" / "tasks_cache.db"


def init_db():
    """Initialize the database and create tables if they don't exist."""
    # Ensure data directory exists
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create tasks cache table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS task_cache (
            key TEXT PRIMARY KEY,
            summary TEXT NOT NULL,
            status_name TEXT,
            assignee_name TEXT,
            updated TEXT,
            fields_json TEXT NOT NULL,
            cached_at REAL NOT NULL
        )
    """)
    
    # Create index on cached_at for quick expiry checks
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_cached_at ON task_cache(cached_at)
    """)
    
    conn.commit()
    conn.close()
    logger.info(f"Database initialized at {DB_PATH}")


@contextmanager
def get_db_connection():
    """Context manager for database connections."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Enable dict-like access
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def get_db() -> sqlite3.Connection:
    """Get a database connection (for dependency injection)."""
    return sqlite3.connect(DB_PATH)
