"""
测试集 Schema
"""
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class TestSuiteItemCreate(BaseModel):
    """测试集项目创建"""
    interface_id: int
    order_index: int = 0
    assertions: Optional[List[Dict]] = None
    var_extracts: Optional[Dict[str, str]] = None
    delay_ms: int = 0
    enabled: bool = True


class TestSuiteCreate(BaseModel):
    """测试集创建"""
    project_id: int
    name: str
    description: Optional[str] = None
    environment: Optional[Dict[str, str]] = None
    concurrency: int = 1
    items: Optional[List[TestSuiteItemCreate]] = None


class TestSuiteResponse(BaseModel):
    """测试集响应"""
    id: int
    project_id: int
    name: str
    description: Optional[str]
    environment: Optional[Dict]
    concurrency: int
    is_enabled: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TestSuiteWithItems(TestSuiteResponse):
    """带项目的测试集"""
    items: List[Dict] = []


class TestSuiteItemResponse(BaseModel):
    """测试集项目响应"""
    id: int
    suite_id: int
    interface_id: int
    order_index: int
    assertions: Optional[List[Dict]]
    var_extracts: Optional[Dict[str, str]]
    delay_ms: int
    enabled: bool
    
    class Config:
        from_attributes = True
