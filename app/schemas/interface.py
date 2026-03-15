"""
Pydantic Schemas
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

# Interface Schemas
class InterfaceBase(BaseModel):
    name: str
    method: str
    url: str
    description: Optional[str] = None
    headers: Optional[Dict[str, Any]] = None
    params: Optional[Dict[str, Any]] = None
    body: Optional[Dict[str, Any]] = None
    body_type: str = "json"  # json, form-data, x-www-form-urlencoded, raw
    content_type: Optional[str] = None

class InterfaceCreate(InterfaceBase):
    project_id: Optional[int] = None

class InterfaceUpdate(BaseModel):
    name: Optional[str] = None
    method: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    headers: Optional[Dict[str, Any]] = None
    params: Optional[Dict[str, Any]] = None
    body: Optional[Dict[str, Any]] = None
    body_type: Optional[str] = None
    content_type: Optional[str] = None

class InterfaceResponse(InterfaceBase):
    id: int
    project_id: Optional[int] = None
    is_favorite: Optional[bool] = False
    last_status_code: Optional[int] = None
    last_response_time: Optional[int] = None
    last_response_body: Optional[str] = None
    last_executed_at: Optional[datetime] = None
    assertions: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class InterfaceListResponse(BaseModel):
    """接口列表分页响应"""
    items: List[InterfaceResponse]
    total: int

# TestCase Schemas
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

# Plugin Schemas
class PluginBase(BaseModel):
    name: str
    description: Optional[str] = None
    version: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_enabled: bool = True

class PluginCreate(PluginBase):
    pass

class PluginUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    version: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_enabled: Optional[bool] = None

class PluginResponse(PluginBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# AI Generate Schemas
class AIGenerateRequest(BaseModel):
    """AI生成测试用例请求"""
    requirement: str  # 需求描述
    interface_data: Optional[Dict[str, Any]] = None  # 可选的接口数据

class AIGenerateResponse(BaseModel):
    """AI生成测试用例响应"""
    cases: List[Dict[str, Any]]  # 生成的测试用例

class AISummaryRequest(BaseModel):
    """AI总结请求"""
    content: str

class AISummaryResponse(BaseModel):
    """AI总结响应"""
    summary: str

# Import Schemas
class ImportRequest(BaseModel):
    """导入接口请求"""
    project_id: int
    format: str  # postman, swagger, har
    content: str  # JSON content
