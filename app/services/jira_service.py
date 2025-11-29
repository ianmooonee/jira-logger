"""JIRA service for API interactions."""

import httpx
import base64
from datetime import datetime
from typing import Optional
from app.core.config import settings
from app.core.exceptions import JiraAPIException, AuthenticationException, TaskNotFoundException
from app.core.logging import get_logger
from app.models.jira import JiraIssue, JiraTransition
from app.services.cache_service import TaskCacheService

logger = get_logger(__name__)


class JiraService:
    """Service for interacting with JIRA API."""
    
    def __init__(self, pat: Optional[str] = None):
        """Initialize JIRA service with optional PAT."""
        self.pat = pat or settings.jira_pat
        self.domain = settings.jira_domain
        self.timeout = settings.jira_timeout
        
        # Debug logging
        logger.info(f"JiraService initialized with domain: {self.domain}")
        logger.info(f"JiraService PAT (first 20 chars): {self.pat[:20] if self.pat else 'NONE'}...")
        
        if not self.pat:
            raise AuthenticationException("JIRA PAT is required")
    
    def _get_headers(self) -> dict:
        """Get headers for JIRA API requests."""
        # Use Bearer authentication for JIRA PAT
        return {
            'Authorization': f'Bearer {self.pat}',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }
    
    async def get_assigned_tasks(self, max_results: Optional[int] = None, use_cache: bool = True, force_refresh: bool = False) -> list[JiraIssue]:
        """
        Fetch all tasks assigned to the current user.
        
        Args:
            max_results: Maximum number of results to return
            use_cache: Whether to use cached results if available
            force_refresh: Force refresh from JIRA even if cache is valid
            
        Returns:
            List of JiraIssue objects
            
        Raises:
            JiraAPIException: If the API call fails
        """
        # Try cache first if enabled and not forcing refresh
        if use_cache and not force_refresh:
            cached_tasks = TaskCacheService.get_cached_tasks()
            if cached_tasks is not None:
                logger.info(f"Returning {len(cached_tasks)} tasks from cache")
                return cached_tasks
        
        # Fetch from JIRA API
        url = f'{self.domain}/rest/api/2/search'
        jql = 'assignee = currentUser() ORDER BY updated DESC'
        params = {
            'jql': jql,
            'maxResults': max_results or settings.jira_max_results
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self._get_headers(), params=params)
                
                if response.status_code != 200:
                    logger.error(f"Failed to fetch tasks: {response.status_code} - {response.text}")
                    raise JiraAPIException(
                        f"Failed to fetch tasks: {response.status_code}",
                        status_code=response.status_code
                    )
                
                data = response.json()
                issues = data.get('issues', [])
                
                tasks = [JiraIssue(**issue) for issue in issues]
                logger.info(f"Fetched {len(tasks)} tasks from JIRA")
                
                # Cache the results
                if use_cache:
                    TaskCacheService.cache_tasks(tasks)
                
                return tasks
                
        except httpx.TimeoutException:
            logger.error("JIRA API request timed out")
            raise JiraAPIException("JIRA API request timed out", status_code=504)
        except httpx.RequestError as e:
            logger.error(f"JIRA API request failed: {str(e)}")
            raise JiraAPIException(f"JIRA API request failed: {str(e)}")
    
    async def log_work(self, issue_key: str, time_spent: str, started: Optional[str] = None) -> dict:
        """
        Log work for a given JIRA issue.
        
        Args:
            issue_key: JIRA issue key (e.g., 'PROJ-123')
            time_spent: Time spent in JIRA format (e.g., '1h30m')
            started: Optional start time in ISO format
            
        Returns:
            Dictionary with success status and message
            
        Raises:
            JiraAPIException: If the API call fails
        """
        url = f'{self.domain}/rest/api/2/issue/{issue_key}/worklog'
        
        # Default to current time if not provided
        if not started:
            started = datetime.now().strftime('%Y-%m-%dT%H:%M:%S.000+0000')
        
        payload = {
            "started": started,
            "timeSpent": time_spent
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, headers=self._get_headers(), json=payload)
                
                if response.status_code == 201:
                    logger.info(f"Successfully logged {time_spent} on {issue_key}")
                    return {
                        "success": True,
                        "message": f"Successfully logged {time_spent} on {issue_key}"
                    }
                else:
                    logger.error(f"Failed to log work on {issue_key}: {response.status_code}")
                    raise JiraAPIException(
                        f"Failed to log work: {response.status_code} - {response.text}",
                        status_code=response.status_code
                    )
                    
        except httpx.TimeoutException:
            logger.error(f"Timeout logging work on {issue_key}")
            raise JiraAPIException("JIRA API request timed out", status_code=504)
        except httpx.RequestError as e:
            logger.error(f"Request failed logging work on {issue_key}: {str(e)}")
            raise JiraAPIException(f"JIRA API request failed: {str(e)}")
    
    async def get_transitions(self, issue_key: str) -> list[JiraTransition]:
        """
        Get available transitions for an issue.
        
        Args:
            issue_key: JIRA issue key
            
        Returns:
            List of available transitions
            
        Raises:
            JiraAPIException: If the API call fails
        """
        url = f"{self.domain}/rest/api/2/issue/{issue_key}/transitions"
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self._get_headers())
                
                if response.status_code != 200:
                    logger.error(f"Failed to fetch transitions for {issue_key}: {response.status_code}")
                    raise JiraAPIException(
                        f"Failed to fetch transitions: {response.status_code}",
                        status_code=response.status_code
                    )
                
                data = response.json()
                transitions = data.get('transitions', [])
                
                return [JiraTransition(**t) for t in transitions]
                
        except httpx.TimeoutException:
            raise JiraAPIException("JIRA API request timed out", status_code=504)
        except httpx.RequestError as e:
            raise JiraAPIException(f"JIRA API request failed: {str(e)}")
    
    async def transition_issue(self, issue_key: str, target_state: str) -> dict:
        """
        Transition an issue to a target state.
        
        Args:
            issue_key: JIRA issue key
            target_state: Target state name (e.g., 'In Progress', 'Done')
            
        Returns:
            Dictionary with success status and message
            
        Raises:
            JiraAPIException: If the transition fails
            TaskNotFoundException: If no transition to target state is available
        """
        # Get available transitions
        transitions = await self.get_transitions(issue_key)
        
        # Find transition by name (exact match)
        transition_id = None
        for t in transitions:
            if t.name.lower() == target_state.lower():
                transition_id = t.id
                break
        
        if not transition_id:
            available = [f"{t.name} (→ {t.to_status})" for t in transitions]
            raise TaskNotFoundException(
                f"No transition '{target_state}' available for {issue_key}. "
                f"Available transitions: {', '.join(available)}"
            )
        
        # Perform transition
        url = f"{self.domain}/rest/api/2/issue/{issue_key}/transitions"
        payload = {"transition": {"id": transition_id}}
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, headers=self._get_headers(), json=payload)
                
                if response.status_code == 204:
                    logger.info(f"Transitioned {issue_key} to '{target_state}'")
                    return {
                        "success": True,
                        "message": f"Task {issue_key} transitioned to '{target_state}'"
                    }
                else:
                    logger.error(f"Failed to transition {issue_key}: {response.status_code}")
                    raise JiraAPIException(
                        f"Failed to transition: {response.status_code} - {response.text}",
                        status_code=response.status_code
                    )
                    
        except httpx.TimeoutException:
            raise JiraAPIException("JIRA API request timed out", status_code=504)
        except httpx.RequestError as e:
            raise JiraAPIException(f"JIRA API request failed: {str(e)}")
    
    async def get_issue(self, issue_key: str) -> JiraIssue:
        """
        Get a specific JIRA issue.
        
        Args:
            issue_key: JIRA issue key
            
        Returns:
            JiraIssue object
            
        Raises:
            JiraAPIException: If the API call fails
            TaskNotFoundException: If the issue doesn't exist
        """
        url = f'{self.domain}/rest/api/2/issue/{issue_key}'
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self._get_headers())
                
                if response.status_code == 404:
                    raise TaskNotFoundException(f"Issue {issue_key} not found")
                
                if response.status_code != 200:
                    raise JiraAPIException(
                        f"Failed to fetch issue: {response.status_code}",
                        status_code=response.status_code
                    )
                
                return JiraIssue(**response.json())
                
        except httpx.TimeoutException:
            raise JiraAPIException("JIRA API request timed out", status_code=504)
        except httpx.RequestError as e:
            raise JiraAPIException(f"JIRA API request failed: {str(e)}")
