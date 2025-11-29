"""Custom exceptions for the application."""


class JiraLoggerException(Exception):
    """Base exception for JIRA Logger application."""
    
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class JiraAPIException(JiraLoggerException):
    """Exception raised when JIRA API calls fail."""
    
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message, status_code)


class AuthenticationException(JiraLoggerException):
    """Exception raised when authentication fails."""
    
    def __init__(self, message: str = "Authentication required", status_code: int = 401):
        super().__init__(message, status_code)


class ValidationException(JiraLoggerException):
    """Exception raised when input validation fails."""
    
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message, status_code)


class ExcelException(JiraLoggerException):
    """Exception raised when Excel operations fail."""
    
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message, status_code)


class TaskNotFoundException(JiraLoggerException):
    """Exception raised when a task is not found."""
    
    def __init__(self, message: str = "Task not found", status_code: int = 404):
        super().__init__(message, status_code)
