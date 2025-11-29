"""Authentication models."""

from pydantic import BaseModel, Field


class TokenRequest(BaseModel):
    """Request model for setting PAT."""
    
    pat: str = Field(..., min_length=1, description="JIRA Personal Access Token")


class TokenResponse(BaseModel):
    """Response model for token operations."""
    
    success: bool
    message: str
