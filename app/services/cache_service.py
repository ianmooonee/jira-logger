"""Task caching service using SQLite."""

import json
import time
from typing import Optional, List
from datetime import datetime, timedelta
import logging

from app.db.database import get_db_connection
from app.models.jira import JiraIssue

logger = logging.getLogger(__name__)

# Cache expiry time in seconds (10 minutes)
CACHE_EXPIRY_SECONDS = 600


class TaskCacheService:
    """Service for caching JIRA tasks in SQLite."""
    
    @staticmethod
    def get_cached_tasks(max_age_seconds: int = CACHE_EXPIRY_SECONDS) -> Optional[List[JiraIssue]]:
        """
        Get tasks from cache if they're fresh enough.
        
        Args:
            max_age_seconds: Maximum age of cache in seconds (default 10 minutes)
            
        Returns:
            List of JiraIssue objects if cache is valid, None otherwise
        """
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                
                # Check if any task has been marked as stale (cached_at = 0)
                cursor.execute("SELECT COUNT(*) FROM task_cache WHERE cached_at = 0")
                stale_count = cursor.fetchone()[0]
                
                if stale_count > 0:
                    logger.info("Cache contains stale tasks, forcing refresh")
                    return None
                
                # Calculate cutoff time
                cutoff_time = time.time() - max_age_seconds
                
                # Get tasks cached after cutoff
                cursor.execute("""
                    SELECT key, fields_json
                    FROM task_cache
                    WHERE cached_at > ?
                    ORDER BY key
                """, (cutoff_time,))
                
                rows = cursor.fetchall()
                
                if not rows:
                    logger.info("No valid cached tasks found")
                    return None
                
                # Reconstruct JiraIssue objects
                tasks = []
                for row in rows:
                    fields_data = json.loads(row['fields_json'])
                    task = JiraIssue(
                        key=row['key'],
                        fields=fields_data
                    )
                    tasks.append(task)
                
                logger.info(f"Retrieved {len(tasks)} tasks from cache")
                return tasks
                
        except Exception as e:
            logger.error(f"Error reading from cache: {e}")
            return None
    
    @staticmethod
    def cache_tasks(tasks: List[JiraIssue]) -> None:
        """
        Cache tasks in SQLite database.
        
        Args:
            tasks: List of JiraIssue objects to cache
        """
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                current_time = time.time()
                
                # Clear old cache first
                cursor.execute("DELETE FROM task_cache")
                
                # Insert new tasks
                for task in tasks:
                    fields_json = json.dumps(task.fields.dict())
                    
                    cursor.execute("""
                        INSERT INTO task_cache 
                        (key, summary, status_name, assignee_name, updated, fields_json, cached_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        task.key,
                        task.fields.summary,
                        task.fields.status.get('name') if task.fields.status else None,
                        task.fields.assignee.get('displayName') if task.fields.assignee else None,
                        task.fields.updated,
                        fields_json,
                        current_time
                    ))
                
                logger.info(f"Cached {len(tasks)} tasks")
                
        except Exception as e:
            logger.error(f"Error caching tasks: {e}")
    
    @staticmethod
    def invalidate_task(task_key: str) -> None:
        """
        Mark cache as stale by setting cached_at to 0 for invalidated task.
        This will cause the entire cache to be considered expired on next fetch.
        
        Args:
            task_key: JIRA task key to invalidate
        """
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                # Set cache time to 0 to force refresh on next fetch
                cursor.execute("UPDATE task_cache SET cached_at = 0 WHERE key = ?", (task_key,))
                logger.info(f"Marked cache as stale due to {task_key} update")
        except Exception as e:
            logger.error(f"Error invalidating task {task_key}: {e}")
    
    @staticmethod
    def invalidate_all() -> None:
        """Clear all cached tasks."""
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM task_cache")
                logger.info("Cleared all cached tasks")
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
    
    @staticmethod
    def get_cache_info() -> dict:
        """
        Get information about the cache.
        
        Returns:
            Dictionary with cache statistics
        """
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute("SELECT COUNT(*), MIN(cached_at), MAX(cached_at) FROM task_cache")
                row = cursor.fetchone()
                
                if row[0] == 0:
                    return {
                        "count": 0,
                        "oldest": None,
                        "newest": None,
                        "age_seconds": None
                    }
                
                count, oldest, newest = row
                age_seconds = time.time() - newest if newest else None
                
                return {
                    "count": count,
                    "oldest": datetime.fromtimestamp(oldest).isoformat() if oldest else None,
                    "newest": datetime.fromtimestamp(newest).isoformat() if newest else None,
                    "age_seconds": age_seconds
                }
        except Exception as e:
            logger.error(f"Error getting cache info: {e}")
            return {"error": str(e)}
