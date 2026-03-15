"""
用户认证系统 - 模型
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import hashlib

Base = declarative_base()


def hash_password(password: str) -> str:
    """密码哈希"""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    """验证密码"""
    return hash_password(password) == hashed


class User(Base):
    """用户表"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)


class Project(Base):
    """项目表（修改所有者为用户）"""
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500))
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Interface(Base):
    """接口表"""
    __tablename__ = "interfaces"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    name = Column(String(100), nullable=False)
    method = Column(String(10), nullable=False)
    url = Column(String(500), nullable=False)
    description = Column(String(500))
    headers = Column(JSON)
    params = Column(JSON)
    body = Column(JSON)
    body_type = Column(String(20), default="json")
    content_type = Column(String(50))
    is_favorite = Column(Boolean, default=False)  # 是否收藏
    var_extracts = Column(JSON)  # 变量提取配置，如 {"token": "$.data.token"}
    assertions = Column(JSON)  # 断言配置，如 [{"type": "status", "expected": 200}]
    last_status_code = Column(Integer, nullable=True)  # 最后一次执行状态码
    last_response_time = Column(Integer, nullable=True)  # 最后一次执行耗时(ms)
    last_response_body = Column(Text, nullable=True)  # 最后一次执行响应体
    last_executed_at = Column(DateTime, nullable=True)  # 最后一次执行时间
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TestCase(Base):
    """测试用例表"""
    __tablename__ = "test_cases"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    interface_id = Column(Integer, ForeignKey("interfaces.id"))
    name = Column(String(100), nullable=False)
    description = Column(String(500))
    request_config = Column(JSON)
    assertions = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TestResult(Base):
    """测试结果表"""
    __tablename__ = "test_results"
    
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("test_cases.id"), nullable=False)
    status = Column(String(20), nullable=False)  # success, fail, error
    response = Column(JSON)
    error_message = Column(String(1000))
    duration_ms = Column(Integer)
    executed_at = Column(DateTime, default=datetime.utcnow)


class Plugin(Base):
    """插件表"""
    __tablename__ = "plugins"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500))
    version = Column(String(20))
    config = Column(JSON)
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# 新增模型
class Environment(Base):
    """环境配置表"""
    __tablename__ = "environments"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String(50), nullable=False)
    base_url = Column(String(200))
    variables = Column(JSON)
    headers = Column(JSON)
    description = Column(String(500))
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class InterfaceChain(Base):
    """接口链表"""
    __tablename__ = "interface_chains"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String(500))
    steps = Column(JSON, nullable=False)
    global_vars = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DataSource(Base):
    """数据源表"""
    __tablename__ = "data_sources"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String(100), nullable=False)
    source_type = Column(String(20), nullable=False)
    file_path = Column(String(500))
    data = Column(JSON)
    description = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ScheduleTask(Base):
    """定时任务表"""
    __tablename__ = "schedule_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String(500))
    cron_expression = Column(String(100))  # Cron 表达式
    interval_minutes = Column(Integer)  # 间隔分钟数（与 cron 二选一）
    task_type = Column(String(20), nullable=False)  # interface, chain, case
    target_id = Column(Integer, nullable=False)  # 关联的接口/链/用例 ID
    is_enabled = Column(Boolean, default=True)
    last_run_at = Column(DateTime)
    next_run_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ScheduleRun(Base):
    """定时任务执行记录表"""
    __tablename__ = "schedule_runs"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("schedule_tasks.id"), nullable=False)
    status = Column(String(20), nullable=False)  # running, success, fail, error
    result = Column(JSON)
    error_message = Column(String(1000))
    duration_ms = Column(Integer)
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime)


class Knowledge(Base):
    """RAG 知识库表 - 存储团队测试经验"""
    __tablename__ = "knowledge"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)  # 可选关联项目
    category = Column(String(50), nullable=False)  # 业务规则/测试模式/历史踩坑/风险场景
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    tags = Column(JSON, default=list)  # 标签列表
    keywords = Column(String(500))  # 关键词，用于检索
    usage_count = Column(Integer, default=0)  # 被引用次数
    effectiveness_score = Column(Integer, default=0)  # 有效性评分 0-100
    source = Column(String(100))  # 来源：手动添加/AI总结/导入
    related_interface_id = Column(Integer, ForeignKey("interfaces.id"), nullable=True)  # 关联接口
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # 创建人
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class KnowledgeFeedback(Base):
    """知识库反馈表 - 记录知识有效性"""
    __tablename__ = "knowledge_feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    knowledge_id = Column(Integer, ForeignKey("knowledge.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_helpful = Column(Boolean, nullable=False)  # 是否有帮助
    comment = Column(String(500))  # 反馈备注
    created_at = Column(DateTime, default=datetime.utcnow)
