"""
TestCase Schemas
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class TestCaseBase(BaseModel):
    name: str
    description: Optional[str] = None
    request_config: Optional[Dict[str, Any]] = None
    assertions: Optional[Dict[str, Any]] = None

class TestCaseCreate(TestCaseBase):
    project_id: int
    interface_id: Optional[int] = None

class TestCaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    request_config: Optional[Dict[str, Any]] = None
    assertions: Optional[Dict[str, Any]] = None

class TestCaseResponse(TestCaseBase):
    id: int
    project_id: int
    interface_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
