"""
环境管理 Schema
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class EnvironmentBase(BaseModel):
    """环境基础字段"""
    name: str
    base_url: Optional[str] = None
    variables: Optional[Dict[str, Any]] = {}
    headers: Optional[Dict[str, str]] = {}
    description: Optional[str] = None
    is_active: bool = True


class EnvironmentCreate(EnvironmentBase):
    """创建环境"""
    project_id: int


class EnvironmentUpdate(BaseModel):
    """更新环境"""
    name: Optional[str] = None
    base_url: Optional[str] = None
    variables: Optional[Dict[str, Any]] = None
    headers: Optional[Dict[str, str]] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class EnvironmentResponse(EnvironmentBase):
    """环境响应"""
    id: int
    project_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
