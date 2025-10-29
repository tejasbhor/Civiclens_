from fastapi import HTTPException, status


class CivicLensException(HTTPException):
    """Base exception for CivicLens"""
    def __init__(self, detail: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(status_code=status_code, detail=detail)


class UnauthorizedException(CivicLensException):
    """Raised when user is not authenticated"""
    def __init__(self, detail: str = "Not authenticated"):
        super().__init__(detail=detail, status_code=status.HTTP_401_UNAUTHORIZED)


class ForbiddenException(CivicLensException):
    """Raised when user doesn't have permission"""
    def __init__(self, detail: str = "Not enough permissions"):
        super().__init__(detail=detail, status_code=status.HTTP_403_FORBIDDEN)


class NotFoundException(CivicLensException):
    """Raised when resource is not found"""
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(detail=detail, status_code=status.HTTP_404_NOT_FOUND)


class ValidationException(CivicLensException):
    """Raised for validation errors"""
    def __init__(self, detail: str = "Validation error"):
        super().__init__(detail=detail, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)


class ConflictException(CivicLensException):
    """Raised when resource already exists"""
    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(detail=detail, status_code=status.HTTP_409_CONFLICT)
