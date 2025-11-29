"""Excel service for reading task data from Excel files."""

import pandas as pd
from pathlib import Path
from typing import Optional
from datetime import datetime
from app.core.config import settings
from app.core.exceptions import ExcelException, ValidationException
from app.core.logging import get_logger

logger = get_logger(__name__)


class ExcelService:
    """Service for Excel file operations."""
    
    def __init__(self, default_file_path: Optional[str] = None):
        """Initialize Excel service."""
        self.default_file_path = default_file_path or settings.default_excel_path
    
    def get_entry(
        self,
        date_str: str,
        name: str,
        file_path: Optional[str] = None,
        sheet_name: Optional[str] = None
    ) -> str:
        """
        Get cell value for a given name and date from Excel file.
        
        Args:
            date_str: Date string in DD/MM/YYYY or DD-MM-YYYY format
            name: Column name (person name)
            file_path: Optional path to Excel file
            sheet_name: Optional sheet name
            
        Returns:
            Cell value as string
            
        Raises:
            ExcelException: If reading fails
            ValidationException: If date format is invalid
        """
        # Use defaults if not provided
        file_path = file_path or self.default_file_path
        sheet_name = sheet_name or settings.excel_sheet_name
        
        # Validate and parse date
        date_obj = self._parse_date(date_str)
        
        # Validate file path
        self._validate_file_path(file_path)
        
        try:
            # Read Excel file
            logger.info(f"Reading Excel file: {file_path}, sheet: {sheet_name}")
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            
            # Convert Days column to datetime
            if 'Days' not in df.columns:
                raise ExcelException("Excel file must have a 'Days' column")
            
            df['Days'] = pd.to_datetime(df['Days'], errors='coerce')
            
            # Check if name column exists
            if name not in df.columns:
                available_cols = [col for col in df.columns if col != 'Days']
                raise ExcelException(
                    f"No column named '{name}' in sheet '{sheet_name}'. "
                    f"Available columns: {', '.join(available_cols)}"
                )
            
            # Find matching row
            matching_rows = df[df['Days'].dt.date == date_obj.date()]
            
            if matching_rows.empty:
                raise ExcelException(f"No entry found for date {date_str}")
            
            # Get cell value
            cell_value = matching_rows[name].values[0]
            
            # Handle NaN or empty values
            if pd.isna(cell_value):
                return ""
            
            logger.info(f"Successfully retrieved entry for {name} on {date_str}")
            return str(cell_value)
            
        except FileNotFoundError:
            logger.error(f"Excel file not found: {file_path}")
            raise ExcelException(f"Excel file not found: {file_path}")
        except PermissionError:
            logger.error(f"Permission denied accessing: {file_path}")
            raise ExcelException(f"Permission denied accessing Excel file")
        except Exception as e:
            if isinstance(e, (ExcelException, ValidationException)):
                raise
            logger.error(f"Error reading Excel file: {str(e)}")
            raise ExcelException(f"Error reading Excel file: {str(e)}")
    
    def _parse_date(self, date_str: str) -> datetime:
        """
        Parse date string to datetime object.
        
        Args:
            date_str: Date string in DD/MM/YYYY or DD-MM-YYYY format
            
        Returns:
            datetime object
            
        Raises:
            ValidationException: If date format is invalid
        """
        for fmt in ('%d/%m/%Y', '%d-%m-%Y'):
            try:
                return pd.to_datetime(date_str, format=fmt, dayfirst=True)
            except Exception:
                continue
        
        raise ValidationException(
            "Invalid date format. Use DD/MM/YYYY or DD-MM-YYYY"
        )
    
    def _validate_file_path(self, file_path: str) -> None:
        """
        Validate file path for security and format.
        
        Args:
            file_path: Path to validate
            
        Raises:
            ValidationException: If path is invalid
        """
        if not file_path or file_path.strip() == '':
            raise ValidationException("File path cannot be empty")
        
        # Block path traversal
        if '..' in file_path:
            raise ValidationException("Invalid file path: path traversal not allowed")
        
        # Check file extension
        if not file_path.lower().endswith('.xlsx'):
            raise ValidationException("File must be an Excel file (.xlsx)")
    
    def get_available_columns(
        self,
        file_path: Optional[str] = None,
        sheet_name: Optional[str] = None
    ) -> list[str]:
        """
        Get list of available column names (excluding 'Days').
        
        Args:
            file_path: Optional path to Excel file
            sheet_name: Optional sheet name
            
        Returns:
            List of column names
            
        Raises:
            ExcelException: If reading fails
        """
        file_path = file_path or self.default_file_path
        sheet_name = sheet_name or settings.excel_sheet_name
        
        try:
            df = pd.read_excel(file_path, sheet_name=sheet_name, nrows=0)
            columns = [col for col in df.columns if col != 'Days']
            return columns
        except Exception as e:
            logger.error(f"Error reading Excel columns: {str(e)}")
            raise ExcelException(f"Error reading Excel file: {str(e)}")
