"""
扩展 Schemas - 环境配置、接口链、数据源
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


# ===== 环境配置 =====
class EnvironmentBase(BaseModel):
    name: str
    base_url: Optional[str] = None
    variables: Optional[Dict[str, Any]] = {}
    headers: Optional[Dict[str, str]] = {}
    description: Optional[str] = None
    is_active: bool = False


class EnvironmentCreate(EnvironmentBase):
    project_id: int


class EnvironmentUpdate(BaseModel):
    name: Optional[str] = None
    base_url: Optional[str] = None
    variables: Optional[Dict[str, Any]] = None
    headers: Optional[Dict[str, str]] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class EnvironmentResponse(EnvironmentBase):
    id: int
    project_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ===== 接口链 =====
class ChainStep(BaseModel):
    """接口链步骤"""
    interface_id: int
    name: Optional[str] = None
    # 变量提取：从响应中提取值保存到变量
    extract_vars: Optional[Dict[str, str]] = {}  
    # 变量映射：将提取的变量映射到请求参数
    var_mapping: Optional[Dict[str, str]] = {}
    # 自定义请求覆盖
    custom_headers: Optional[Dict[str, str]] = {}
    custom_params: Optional[Dict[str, Any]] = {}
    custom_body: Optional[Dict[str, Any]] = {}
    # 条件执行
    condition: Optional[str] = None  # {{var}} == "value"
    # 断言
    assertions: Optional[List[Dict[str, Any]]] = []


class InterfaceChainBase(BaseModel):
    name: str
    description: Optional[str] = None
    steps: List[Dict[str, Any]]  # List[ChainStep]
    global_vars: Optional[Dict[str, Any]] = {}


class InterfaceChainCreate(InterfaceChainBase):
    project_id: int


class InterfaceChainUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    steps: Optional[List[Dict[str, Any]]] = None
    global_vars: Optional[Dict[str, Any]] = None


class InterfaceChainResponse(InterfaceChainBase):
    id: int
    project_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ChainExecuteRequest(BaseModel):
    """接口链执行请求"""
    environment_id: Optional[int] = None  # 使用环境配置
    override_vars: Optional[Dict[str, Any]] = {}  # 覆盖变量


class ChainStepResult(BaseModel):
    """步骤执行结果"""
    step_name: str
    interface_id: int
    success: bool
    response: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    extracted_vars: Dict[str, Any] = {}
    duration_ms: int = 0


class ChainExecuteResponse(BaseModel):
    """接口链执行响应"""
    chain_name: str
    success: bool
    steps: List[ChainStepResult]
    final_vars: Dict[str, Any] = {}  # 所有提取的变量
    total_duration_ms: int = 0


# ===== 数据源 =====
class DataSourceBase(BaseModel):
    name: str
    source_type: str  # csv, json, excel
    file_path: Optional[str] = None
    data: Optional[List[Dict[str, Any]]] = []
    description: Optional[str] = None


class DataSourceCreate(DataSourceBase):
    project_id: int


class DataSourceUpdate(BaseModel):
    name: Optional[str] = None
    source_type: Optional[str] = None
    file_path: Optional[str] = None
    data: Optional[List[Dict[str, Any]]] = None
    description: Optional[str] = None


class DataSourceResponse(DataSourceBase):
    id: int
    project_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ===== 参数化执行 =====
class ParametricTestRequest(BaseModel):
    """参数化测试请求"""
    interface_id: int
    data_source_id: Optional[int] = None  # 数据源 ID
    # 或直接使用参数列表
    params_list: Optional[List[Dict[str, Any]]] = []
    environment_id: Optional[int] = None
    # 全局变量
    global_vars: Optional[Dict[str, Any]] = {}


class ParametricTestResult(BaseModel):
    """参数化测试结果"""
    total: int
    success: int
    fail: int
    results: List[Dict[str, Any]]  # 每个参数组合的执行结果
