"""Pydantic models for Excel operations."""

from typing import Optional
from pydantic import BaseModel, Field, validator
from datetime import datetime


class ExcelEntryRequest(BaseModel):
    """Request model for fetching Excel entries."""
    
    date_str: str = Field(..., description="Date in DD/MM/YYYY or DD-MM-YYYY format")
    name: str = Field(..., min_length=1, description="Column name (person name)")
    file_path: Optional[str] = Field(None, description="Path to Excel file")
    sheet_name: str = Field(default="Daily", description="Sheet name")
    
    @validator('date_str')
    def validate_date_format(cls, v):
        """Validate date format."""
        for fmt in ('%d/%m/%Y', '%d-%m-%Y'):
            try:
                datetime.strptime(v, fmt)
                return v
            except ValueError:
                continue
        raise ValueError('Date must be in DD/MM/YYYY or DD-MM-YYYY format')
    
    @validator('file_path')
    def validate_file_path(cls, v):
        """Validate file path."""
        if v:
            if '..' in v or v.strip() == '':
                raise ValueError('Invalid file path')
            if not v.lower().endswith('.xlsx'):
                raise ValueError('File must be an Excel file (.xlsx)')
        return v


class ExcelEntryResponse(BaseModel):
    """Response model for Excel entry."""
    
    success: bool
    data: Optional[str] = None
    error: Optional[str] = None


class ParsedTaskLine(BaseModel):
    """Model for a parsed task line from Excel."""
    
    original_line: str
    verb: Optional[str] = None  # Author, Review, Rework
    task_type: Optional[str] = None  # TC, TP, or None
    base_name: Optional[str] = None
    matched: bool = False
