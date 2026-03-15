"""
测试集模型
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class TestSuite(Base):
    """测试集表"""
    __tablename__ = "test_suites"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    environment = Column(JSON)  # 环境变量 {"base_url": "...", "token": "..."}
    concurrency = Column(Integer, default=1)  # 并发数
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TestSuiteItem(Base):
    """测试集-接口关联表"""
    __tablename__ = "test_suite_items"
    
    id = Column(Integer, primary_key=True, index=True)
    suite_id = Column(Integer, ForeignKey("test_suites.id"), nullable=False)
    interface_id = Column(Integer, ForeignKey("interfaces.id"), nullable=False)
    order_index = Column(Integer, nullable=False, default=0)
    assertions = Column(JSON)  # 断言配置 [{"type": "status", "expected": 200}, {"type": "json", "path": "$.code", "expected": 0}]
    var_extracts = Column(JSON)  # 变量提取 {"token": "$.data.token"}
    delay_ms = Column(Integer, default=0)  # 延迟毫秒
    enabled = Column(Boolean, default=True)


class TestSuiteResult(Base):
    """测试集执行结果表"""
    __tablename__ = "test_suite_results"
    
    id = Column(Integer, primary_key=True, index=True)
    suite_id = Column(Integer, ForeignKey("test_suites.id"), nullable=False)
    status = Column(String(20), nullable=False)  # running, success, failed
    total_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    fail_count = Column(Integer, default=0)
    duration_ms = Column(Integer)
    details = Column(JSON)  # 每个接口的执行结果
    environment = Column(JSON)  # 执行时的环境变量
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime)
