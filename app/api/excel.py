"""Excel and task matching API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from app.services.excel_service import ExcelService
from app.services.task_matching_service import TaskMatchingService
from app.services.jira_service import JiraService
from app.api.dependencies import get_jira_service
from app.models.excel import ExcelEntryRequest, ExcelEntryResponse
from app.core.exceptions import ExcelException, ValidationException
from app.core.logging import get_logger
from pydantic import BaseModel

logger = get_logger(__name__)
router = APIRouter(prefix="/excel", tags=["excel"])


class TaskListRequest(BaseModel):
    """Request model for task list parsing."""
    task_list: str


class TaskMatchResponse(BaseModel):
    """Response model for task matching."""
    matched_keys: list[str]
    count: int


@router.post("/get-entry", response_model=ExcelEntryResponse)
async def get_excel_entry(request: ExcelEntryRequest):
    """Get a cell value from Excel file."""
    try:
        excel_service = ExcelService(default_file_path=request.file_path)
        data = excel_service.get_entry(
            date_str=request.date_str,
            name=request.name,
            file_path=request.file_path,
            sheet_name=request.sheet_name
        )
        
        return ExcelEntryResponse(
            success=True,
            data=data
        )
        
    except (ExcelException, ValidationException) as e:
        logger.error(f"Excel operation failed: {str(e)}")
        return ExcelEntryResponse(
            success=False,
            error=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error in get_excel_entry: {str(e)}")
        return ExcelEntryResponse(
            success=False,
            error=f"Unexpected error: {str(e)}"
        )


@router.post("/parse-tasks", response_model=TaskMatchResponse)
async def parse_tasks(
    request: TaskListRequest,
    jira_service: JiraService = Depends(get_jira_service)
):
    """Parse task list text and match to JIRA issues."""
    try:
        # Get all tasks (use cache, which includes all tasks)
        all_tasks = await jira_service.get_assigned_tasks(use_cache=True, force_refresh=False)
        
        # Parse and match
        matching_service = TaskMatchingService()
        matched_keys = matching_service.parse_and_match(
            request.task_list,
            all_tasks
        )
        
        logger.info(f"Matched {len(matched_keys)} tasks from input")
        
        return TaskMatchResponse(
            matched_keys=matched_keys,
            count=len(matched_keys)
        )
        
    except Exception as e:
        logger.error(f"Error parsing tasks: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse tasks: {str(e)}"
        )


@router.post("/parse-from-excel", response_model=TaskMatchResponse)
async def parse_from_excel(
    request: ExcelEntryRequest,
    jira_service: JiraService = Depends(get_jira_service)
):
    """Get Excel cell content and match tasks to JIRA issues."""
    try:
        # Get Excel data
        excel_service = ExcelService(default_file_path=request.file_path)
        cell_data = excel_service.get_entry(
            date_str=request.date_str,
            name=request.name,
            file_path=request.file_path,
            sheet_name=request.sheet_name
        )
        
        if not cell_data:
            return TaskMatchResponse(matched_keys=[], count=0)
        
        # Get all tasks (use cache, which includes all tasks)
        all_tasks = await jira_service.get_assigned_tasks(use_cache=True, force_refresh=False)
        
        # Parse and match
        matching_service = TaskMatchingService()
        matched_keys = matching_service.parse_and_match(
            cell_data,
            all_tasks
        )
        
        logger.info(f"Matched {len(matched_keys)} tasks from Excel cell")
        
        return TaskMatchResponse(
            matched_keys=matched_keys,
            count=len(matched_keys)
        )
        
    except (ExcelException, ValidationException) as e:
        logger.error(f"Excel operation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Error parsing from Excel: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse from Excel: {str(e)}"
        )


@router.get("/columns")
async def get_excel_columns(
    file_path: str = None,
    sheet_name: str = "Daily"
):
    """Get available column names from Excel file."""
    try:
        excel_service = ExcelService(default_file_path=file_path)
        columns = excel_service.get_available_columns(
            file_path=file_path,
            sheet_name=sheet_name
        )
        
        return {
            "columns": columns,
            "count": len(columns)
        }
        
    except ExcelException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
