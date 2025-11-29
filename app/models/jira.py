"""Pydantic models for JIRA entities."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, validator


class JiraIssueFields(BaseModel):
    """JIRA issue fields."""
    
    summary: str
    status: Optional[dict] = None
    assignee: Optional[dict] = None
    updated: Optional[str] = None
    
    class Config:
        extra = "allow"


class JiraIssue(BaseModel):
    """JIRA issue model."""
    
    key: str
    fields: JiraIssueFields
    
    @property
    def summary(self) -> str:
        """Get issue summary."""
        return self.fields.summary
    
    @property
    def status_name(self) -> Optional[str]:
        """Get status name."""
        if self.fields.status:
            return self.fields.status.get("name")
        return None


class JiraTransition(BaseModel):
    """JIRA transition model."""
    
    id: str
    name: str
    to: dict
    
    @property
    def to_status(self) -> str:
        """Get target status name."""
        return self.to.get("name", "")


class WorkLogRequest(BaseModel):
    """Request model for logging work."""
    
    issue_key: str = Field(..., min_length=1, max_length=20, description="JIRA issue key")
    time_spent: str = Field(..., pattern=r'^([0-9]+h)?([0-9]+m)?$', description="Time spent (e.g., 1h30m)")
    date_input: Optional[str] = Field(None, description="Date in format HH:MM DD-MM-YYYY")
    
    @validator('time_spent')
    def validate_time_spent(cls, v):
        """Ensure time spent is not empty."""
        if not v or v == '0h0m' or v == '0m' or v == '0h':
            raise ValueError('Time spent must be greater than 0')
        return v


class WorkLogResponse(BaseModel):
    """Response model for work log operations."""
    
    success: bool
    message: str
    issue_key: str


class BulkWorkLogRequest(BaseModel):
    """Request model for bulk work logging."""
    
    issue_keys: list[str] = Field(..., min_items=1)
    time_spent: str = Field(..., pattern=r'^([0-9]+h)?([0-9]+m)?$')
    date_input: Optional[str] = None
    target_state: Optional[str] = None


class IndividualWorkLogItem(BaseModel):
    """Individual work log item for bulk operations."""
    
    issue_key: str
    time_spent: str = Field(..., pattern=r'^([0-9]+h)?([0-9]+m)?$')
    date_input: Optional[str] = None
    target_state: Optional[str] = None


class IndividualWorkLogRequest(BaseModel):
    """Request for individual work logs."""
    
    work_logs: list[IndividualWorkLogItem] = Field(..., min_items=1)


class TaskFilterRequest(BaseModel):
    """Request model for filtering tasks."""
    
    filter_keyword: Optional[str] = None
    sort_by: str = Field(default="summary", pattern="^(summary|key)$")
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$")


class TransitionRequest(BaseModel):
    """Request to transition an issue."""
    
    issue_key: str
    target_state: str
