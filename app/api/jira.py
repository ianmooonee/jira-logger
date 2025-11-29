"""JIRA-related API routes."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from datetime import datetime
from typing import Optional
from app.services.jira_service import JiraService
from app.services.cache_service import TaskCacheService
from app.api.dependencies import get_jira_service
from app.models.jira import (
    JiraIssue,
    WorkLogRequest,
    WorkLogResponse,
    BulkWorkLogRequest,
    IndividualWorkLogRequest,
    TaskFilterRequest,
    TransitionRequest
)
from app.core.exceptions import JiraAPIException, TaskNotFoundException
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/jira", tags=["jira"])


@router.get("/tasks", response_model=list[JiraIssue])
async def get_tasks(
    filter_keyword: Optional[str] = Query(None, description="Filter tasks by keyword"),
    sort_by: str = Query("summary", pattern="^(summary|key)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    force_refresh: bool = Query(False, description="Force refresh from JIRA API"),
    jira_service: JiraService = Depends(get_jira_service)
):
    """Get all tasks assigned to the current user."""
    try:
        tasks = await jira_service.get_assigned_tasks(force_refresh=force_refresh)
        
        # Apply filter
        if filter_keyword:
            tasks = [
                t for t in tasks
                if filter_keyword.lower() in t.summary.lower()
                or filter_keyword.lower() in t.key.lower()
            ]
        
        # Apply sorting
        reverse = (sort_order == "desc")
        if sort_by == "summary":
            tasks = sorted(tasks, key=lambda t: t.summary.lower(), reverse=reverse)
        else:
            tasks = sorted(tasks, key=lambda t: t.key, reverse=reverse)
        
        return tasks
        
    except JiraAPIException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Error fetching tasks: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch tasks"
        )


@router.get("/tasks/{issue_key}", response_model=JiraIssue)
async def get_task(
    issue_key: str,
    jira_service: JiraService = Depends(get_jira_service)
):
    """Get a specific task by key."""
    try:
        return await jira_service.get_issue(issue_key)
    except TaskNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except JiraAPIException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/log-work", response_model=WorkLogResponse)
async def log_work(
    work_log: WorkLogRequest,
    jira_service: JiraService = Depends(get_jira_service)
):
    """Log work for a single task."""
    try:
        # Parse date if provided
        started = None
        if work_log.date_input:
            try:
                started = datetime.strptime(
                    work_log.date_input,
                    "%H:%M %d-%m-%Y"
                ).strftime('%Y-%m-%dT%H:%M:%S.000+0000')
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid date format. Use HH:MM DD-MM-YYYY"
                )
        
        result = await jira_service.log_work(
            work_log.issue_key,
            work_log.time_spent,
            started
        )
        
        # Invalidate cache for this task
        TaskCacheService.invalidate_task(work_log.issue_key)
        
        return WorkLogResponse(
            success=result["success"],
            message=result["message"],
            issue_key=work_log.issue_key
        )
        
    except JiraAPIException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Error logging work: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to log work: {str(e)}"
        )


@router.post("/log-work-bulk", response_model=list[WorkLogResponse])
async def log_work_bulk(
    bulk_request: BulkWorkLogRequest,
    jira_service: JiraService = Depends(get_jira_service)
):
    """Log the same amount of work for multiple tasks."""
    try:
        # Parse date if provided
        started = None
        if bulk_request.date_input:
            try:
                started = datetime.strptime(
                    bulk_request.date_input,
                    "%H:%M %d-%m-%Y"
                ).strftime('%Y-%m-%dT%H:%M:%S.000+0000')
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid date format. Use HH:MM DD-MM-YYYY"
                )
        
        responses = []
        for issue_key in bulk_request.issue_keys:
            try:
                result = await jira_service.log_work(
                    issue_key,
                    bulk_request.time_spent,
                    started
                )
                
                # Transition if requested
                if bulk_request.target_state:
                    try:
                        await jira_service.transition_issue(issue_key, bulk_request.target_state)
                        result["message"] += f" and transitioned to '{bulk_request.target_state}'"
                    except Exception as e:
                        logger.warning(f"Failed to transition {issue_key}: {str(e)}")
                        result["message"] += f" but transition failed: {str(e)}"
                
                # Invalidate cache for this task
                TaskCacheService.invalidate_task(issue_key)
                
                responses.append(WorkLogResponse(
                    success=result["success"],
                    message=result["message"],
                    issue_key=issue_key
                ))
            except Exception as e:
                logger.error(f"Error logging work for {issue_key}: {str(e)}")
                responses.append(WorkLogResponse(
                    success=False,
                    message=f"Failed: {str(e)}",
                    issue_key=issue_key
                ))
        
        return responses
        
    except Exception as e:
        logger.error(f"Error in bulk log work: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to log work: {str(e)}"
        )


@router.post("/log-work-individual", response_model=list[WorkLogResponse])
async def log_work_individual(
    individual_request: IndividualWorkLogRequest,
    jira_service: JiraService = Depends(get_jira_service)
):
    """Log work for multiple tasks with individual time and state for each."""
    responses = []
    
    for item in individual_request.work_logs:
        try:
            # Parse date if provided
            started = None
            if item.date_input:
                try:
                    started = datetime.strptime(
                        item.date_input,
                        "%H:%M %d-%m-%Y"
                    ).strftime('%Y-%m-%dT%H:%M:%S.000+0000')
                except ValueError:
                    responses.append(WorkLogResponse(
                        success=False,
                        message="Invalid date format",
                        issue_key=item.issue_key
                    ))
                    continue
            
            # Log work
            result = await jira_service.log_work(
                item.issue_key,
                item.time_spent,
                started
            )
            
            # Transition if requested
            if item.target_state:
                try:
                    await jira_service.transition_issue(item.issue_key, item.target_state)
                    result["message"] += f" and transitioned to '{item.target_state}'"
                except Exception as e:
                    logger.warning(f"Failed to transition {item.issue_key}: {str(e)}")
                    result["message"] += f" but transition failed: {str(e)}"
            
            # Invalidate cache for this task
            TaskCacheService.invalidate_task(item.issue_key)
            
            responses.append(WorkLogResponse(
                success=result["success"],
                message=result["message"],
                issue_key=item.issue_key
            ))
            
        except Exception as e:
            logger.error(f"Error processing {item.issue_key}: {str(e)}")
            responses.append(WorkLogResponse(
                success=False,
                message=f"Failed: {str(e)}",
                issue_key=item.issue_key
            ))
    
    return responses


@router.get("/transitions/{issue_key}")
async def get_transitions(
    issue_key: str,
    jira_service: JiraService = Depends(get_jira_service)
):
    """Get available transitions for a task."""
    try:
        transitions = await jira_service.get_transitions(issue_key)
        return {
            "issue_key": issue_key,
            "transitions": [
                {"id": t.id, "name": t.name, "to_status": t.to_status}
                for t in transitions
            ]
        }
    except JiraAPIException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/transition")
async def transition_issue(
    transition_req: TransitionRequest,
    jira_service: JiraService = Depends(get_jira_service)
):
    """Transition a task to a new state."""
    try:
        result = await jira_service.transition_issue(
            transition_req.issue_key,
            transition_req.target_state
        )
        
        # Invalidate cache for this task
        TaskCacheService.invalidate_task(transition_req.issue_key)
        
        return result
    except TaskNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except JiraAPIException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/cache/info")
async def get_cache_info():
    """Get information about the task cache."""
    return TaskCacheService.get_cache_info()


@router.post("/cache/clear")
async def clear_cache():
    """Clear all cached tasks."""
    TaskCacheService.invalidate_all()
    return {"message": "Cache cleared successfully"}

