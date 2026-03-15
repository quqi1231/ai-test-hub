"""
接口自动化模块 - 数据模型
层级结构：项目 > 测试集合 > 测试用例
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class ApiProject(Base):
    """API 项目表"""
    __tablename__ = "api_projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ApiTestSuite(Base):
    """API 测试集合表"""
    __tablename__ = "api_test_suites"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("api_projects.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String(500))
    order = Column(Integer, default=0)  # 排序
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ApiTestCase(Base):
    """API 测试用例表"""
    __tablename__ = "api_test_cases"
    
    id = Column(Integer, primary_key=True, index=True)
    suite_id = Column(Integer, ForeignKey("api_test_suites.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String(500))
    order = Column(Integer, default=0)  # 排序
    
    # 请求配置
    method = Column(String(10), nullable=False, default="GET")
    url = Column(String(1000), nullable=False)
    headers = Column(JSON, default=dict)
    params = Column(JSON, default=dict)
    body = Column(JSON)
    body_type = Column(String(20), default="json")  # json, form, raw
    
    # 断言配置
    assertions = Column(JSON, default=list)
    
    # 变量提取
    var_extracts = Column(JSON, default=dict)
    
    # 前置脚本/后置脚本
    pre_script = Column(Text)
    post_script = Column(Text)
    
    # 执行状态
    last_status = Column(String(20))  # success, failed, error
    last_status_code = Column(Integer)
    last_response_time = Column(Integer)  # 毫秒
    last_executed_at = Column(DateTime)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ApiExecutionLog(Base):
    """API 执行日志表"""
    __tablename__ = "api_execution_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("api_test_cases.id"), nullable=True)
    suite_id = Column(Integer, ForeignKey("api_test_suites.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("api_projects.id"), nullable=True)
    
    # 执行类型
    exec_type = Column(String(20), default="single")  # single, suite, quick
    
    # 请求信息
    request_method = Column(String(10))
    request_url = Column(String(1000))
    request_headers = Column(JSON)
    request_params = Column(JSON)
    request_body = Column(JSON)
    
    # 响应信息
    response_status = Column(Integer)
    response_headers = Column(JSON)
    response_body = Column(Text)
    duration_ms = Column(Integer)
    
    # 断言结果
    assertion_results = Column(JSON)
    
    # 状态
    status = Column(String(20), nullable=False)  # success, failed, error
    error_message = Column(Text)
    
    executed_at = Column(DateTime, default=datetime.utcnow)


class ApiEnvironment(Base):
    """API 环境配置表"""
    __tablename__ = "api_environments"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("api_projects.id"), nullable=False)
    name = Column(String(50), nullable=False)
    base_url = Column(String(500))
    variables = Column(JSON, default=dict)
    headers = Column(JSON, default=dict)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
