"""Authentication routes."""

from fastapi import APIRouter, Request, HTTPException, status
from app.models.auth import TokenRequest, TokenResponse
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/set-pat", response_model=TokenResponse)
async def set_pat(request: Request, token_request: TokenRequest):
    """Set JIRA Personal Access Token in session."""
    try:
        request.session['JIRA_PAT'] = token_request.pat
        logger.info("JIRA PAT set successfully")
        return TokenResponse(
            success=True,
            message="JIRA PAT set successfully"
        )
    except Exception as e:
        logger.error(f"Failed to set PAT: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to set PAT"
        )


@router.post("/clear-pat", response_model=TokenResponse)
async def clear_pat(request: Request):
    """Clear JIRA Personal Access Token from session."""
    try:
        request.session.pop('JIRA_PAT', None)
        logger.info("JIRA PAT cleared")
        return TokenResponse(
            success=True,
            message="JIRA PAT cleared successfully"
        )
    except Exception as e:
        logger.error(f"Failed to clear PAT: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear PAT"
        )


@router.get("/status")
async def auth_status(request: Request):
    """Check if PAT is set."""
    pat = request.session.get('JIRA_PAT')
    return {
        "authenticated": bool(pat),
        "message": "PAT is set" if pat else "PAT not set"
    }
