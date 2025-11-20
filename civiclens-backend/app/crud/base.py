from typing import Generic, TypeVar, Type, Optional, List, Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from app.core.database import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """Base CRUD operations"""
    
    def __init__(self, model: Type[ModelType]):
        self.model = model
    
    async def get(
        self,
        db: AsyncSession,
        id: int,
        relationships: Optional[List[str]] = None
    ) -> Optional[ModelType]:
        """Get a single record by ID"""
        query = select(self.model).where(self.model.id == id)
        
        # Load relationships if specified
        if relationships:
            for rel in relationships:
                query = query.options(selectinload(getattr(self.model, rel)))
        
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_multi(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        relationships: Optional[List[str]] = None
    ) -> List[ModelType]:
        """Get multiple records with filters and pagination"""
        query = select(self.model)
        
        # Apply filters
        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key):
                    query = query.where(getattr(self.model, key) == value)
        
        # Apply ordering
        if order_by:
            if order_by.startswith('-'):
                query = query.order_by(getattr(self.model, order_by[1:]).desc())
            else:
                query = query.order_by(getattr(self.model, order_by))
        else:
            query = query.order_by(self.model.id.desc())
        
        # Load relationships
        if relationships:
            for rel in relationships:
                query = query.options(selectinload(getattr(self.model, rel)))
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def count(
        self,
        db: AsyncSession,
        filters: Optional[Dict[str, Any]] = None
    ) -> int:
        """Count records with optional filters"""
        query = select(func.count(self.model.id))
        
        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key):
                    query = query.where(getattr(self.model, key) == value)
        
        result = await db.execute(query)
        return result.scalar()
    
    async def create(
        self,
        db: AsyncSession,
        obj_in: CreateSchemaType,
        commit: bool = True
    ) -> ModelType:
        """Create a new record"""
        # Handle Pydantic models, dictionaries, and other types
        if hasattr(obj_in, 'model_dump'):
            # Pydantic v2
            obj_data = obj_in.model_dump()
        elif hasattr(obj_in, 'dict'):
            # Pydantic v1 or other objects with dict method
            obj_data = obj_in.dict()
        elif isinstance(obj_in, dict):
            # Already a dictionary
            obj_data = obj_in
        else:
            # Convert to dict if possible
            obj_data = dict(obj_in)
        
        db_obj = self.model(**obj_data)
        
        db.add(db_obj)
        if commit:
            await db.commit()
            await db.refresh(db_obj)
        
        return db_obj
    
    async def update(
        self,
        db: AsyncSession,
        id: int,
        obj_in: UpdateSchemaType,
        commit: bool = True
    ) -> Optional[ModelType]:
        """Update a record"""
        # Handle Pydantic models, dictionaries, and other types
        if hasattr(obj_in, 'model_dump'):
            # Pydantic v2
            obj_data = obj_in.model_dump(exclude_unset=True)
        elif hasattr(obj_in, 'dict'):
            # Pydantic v1 or other objects with dict method
            obj_data = obj_in.dict(exclude_unset=True)
        elif isinstance(obj_in, dict):
            # Already a dictionary
            obj_data = {k: v for k, v in obj_in.items() if v is not None}
        else:
            # Convert to dict if possible
            obj_data = dict(obj_in)
        
        stmt = (
            update(self.model)
            .where(self.model.id == id)
            .values(**obj_data)
            .execution_options(synchronize_session="fetch")
        )
        
        await db.execute(stmt)
        
        if commit:
            await db.commit()
        
        return await self.get(db, id)
    
    async def delete(
        self,
        db: AsyncSession,
        id: int,
        commit: bool = True
    ) -> bool:
        """Delete a record"""
        stmt = delete(self.model).where(self.model.id == id)
        result = await db.execute(stmt)
        
        if commit:
            await db.commit()
        
        return result.rowcount > 0
