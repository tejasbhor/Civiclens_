from pydantic import BaseModel
from typing import Generic, TypeVar, List

T = TypeVar('T')


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response"""
    data: List[T]
    total: int
    page: int
    per_page: int
    total_pages: int


class SuccessResponse(BaseModel):
    """Generic success response"""
    message: str
    data: dict = {}


class ErrorResponse(BaseModel):
    """Generic error response"""
    detail: str
    code: str = "error"
