"""
接口自动化模块 - Pydantic Schemas
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


# ==================== 项目 ====================

class ApiProjectBase(BaseModel):
    name: str
    description: Optional[str] = None


class ApiProjectCreate(ApiProjectBase):
    pass


class ApiProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ApiProjectResponse(ApiProjectBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ApiProjectWithStats(ApiProjectResponse):
    """项目带统计信息"""
    suite_count: int = 0
    case_count: int = 0


# ==================== 测试集合 ====================

class ApiTestSuiteBase(BaseModel):
    name: str
    description: Optional[str] = None


class ApiTestSuiteCreate(ApiTestSuiteBase):
    project_id: int


class ApiTestSuiteUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None


class ApiTestSuiteResponse(ApiTestSuiteBase):
    id: int
    project_id: int
    order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ApiTestSuiteWithCases(ApiTestSuiteResponse):
    """测试集合带用例列表"""
    cases: List["ApiTestCaseResponse"] = []
    case_count: int = 0


# ==================== 测试用例 ====================

class AssertionConfig(BaseModel):
    """断言配置"""
    type: str  # status_code, body_contains, json_path, response_time, header
    expected: Any
    actual: Optional[str] = None  # 用于 json_path
    operator: Optional[str] = None  # eq, ne, gt, lt, contains, regex


class VarExtractConfig(BaseModel):
    """变量提取配置"""
    var_name: str
    source: str  # body, header
    json_path: Optional[str] = None
    header_name: Optional[str] = None


class ApiTestCaseBase(BaseModel):
    name: str
    description: Optional[str] = None
    method: str = "GET"
    url: str
    headers: Optional[Dict[str, Any]] = None
    params: Optional[Dict[str, Any]] = None
    body: Optional[Any] = None
    body_type: str = "json"
    assertions: Optional[List[Dict[str, Any]]] = None
    var_extracts: Optional[Dict[str, Any]] = None
    pre_script: Optional[str] = None
    post_script: Optional[str] = None


class ApiTestCaseCreate(ApiTestCaseBase):
    suite_id: int


class ApiTestCaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    method: Optional[str] = None
    url: Optional[str] = None
    headers: Optional[Dict[str, Any]] = None
    params: Optional[Dict[str, Any]] = None
    body: Optional[Any] = None
    body_type: Optional[str] = None
    assertions: Optional[List[Dict[str, Any]]] = None
    var_extracts: Optional[Dict[str, Any]] = None
    pre_script: Optional[str] = None
    post_script: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None


class ApiTestCaseResponse(ApiTestCaseBase):
    id: int
    suite_id: int
    order: int
    last_status: Optional[str] = None
    last_status_code: Optional[int] = None
    last_response_time: Optional[int] = None
    last_executed_at: Optional[datetime] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== 执行请求 ====================

class QuickExecuteRequest(BaseModel):
    """快捷执行请求（无需保存）"""
    method: str = "GET"
    url: str
    headers: Optional[Dict[str, Any]] = None
    params: Optional[Dict[str, Any]] = None
    body: Optional[Any] = None
    body_type: str = "json"
    timeout: int = 30


class ExecuteResponse(BaseModel):
    """执行响应"""
    success: bool
    status_code: int
    response_headers: Optional[Dict[str, str]] = None
    response_body: Optional[Any] = None
    duration_ms: int
    assertion_results: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None


# ==================== 执行日志 ====================

class ApiExecutionLogResponse(BaseModel):
    """执行日志响应"""
    id: int
    case_id: Optional[int] = None
    suite_id: Optional[int] = None
    project_id: Optional[int] = None
    exec_type: str
    request_method: Optional[str] = None
    request_url: Optional[str] = None
    response_status: Optional[int] = None
    duration_ms: Optional[int] = None
    status: str
    error_message: Optional[str] = None
    executed_at: datetime

    class Config:
        from_attributes = True


class ApiExecutionLogDetail(ApiExecutionLogResponse):
    """执行日志详情"""
    request_headers: Optional[Dict[str, Any]] = None
    request_params: Optional[Dict[str, Any]] = None
    request_body: Optional[Any] = None
    response_headers: Optional[Dict[str, Any]] = None
    response_body: Optional[str] = None
    assertion_results: Optional[List[Dict[str, Any]]] = None


# ==================== 环境配置 ====================

class ApiEnvironmentBase(BaseModel):
    name: str
    base_url: Optional[str] = None
    variables: Optional[Dict[str, Any]] = None
    headers: Optional[Dict[str, Any]] = None


class ApiEnvironmentCreate(ApiEnvironmentBase):
    project_id: int


class ApiEnvironmentUpdate(BaseModel):
    name: Optional[str] = None
    base_url: Optional[str] = None
    variables: Optional[Dict[str, Any]] = None
    headers: Optional[Dict[str, Any]] = None
    is_default: Optional[bool] = None


class ApiEnvironmentResponse(ApiEnvironmentBase):
    id: int
    project_id: int
    is_default: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== AI 相关 ====================

class AIGenerateCasesRequest(BaseModel):
    """AI 生成测试用例请求"""
    url: str
    method: str = "GET"
    description: Optional[str] = None
    count: int = 3  # 生成用例数量


class AIGenerateCasesResponse(BaseModel):
    """AI 生成测试用例响应"""
    cases: List[ApiTestCaseCreate]


class AIAnalyzeErrorRequest(BaseModel):
    """AI 分析错误请求"""
    request_method: str
    request_url: str
    error_message: str
    response_status: Optional[int] = None
    response_body: Optional[str] = None


class AIAnalyzeErrorResponse(BaseModel):
    """AI 分析错误响应"""
    analysis: str
    suggestions: List[str]
