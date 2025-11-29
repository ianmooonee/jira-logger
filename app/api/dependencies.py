"""Authentication dependencies for FastAPI."""

from fastapi import Depends, HTTPException, status
from app.services.jira_service import JiraService
from app.core.config import settings
from app.core.exceptions import AuthenticationException


def get_jira_service() -> JiraService:
    """
    Dependency to get JiraService instance.
    Uses PAT from environment configuration.
    """
    if not settings.jira_pat:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JIRA PAT not configured. Please set JIRA_PAT in .env file."
        )
    
    try:
        return JiraService(pat=settings.jira_pat)
    except AuthenticationException as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
