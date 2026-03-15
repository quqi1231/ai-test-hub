"""
RAG 知识库 Schema
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# 预设知识类别
KNOWLEDGE_CATEGORIES = {
    "业务规则": "📘 常见业务逻辑和验证规则",
    "测试模式": "📗 成熟的测试设计模式",
    "历史踩坑": "📙 团队遇到的易错点和缺陷",
    "风险场景": "📕 高风险和安全相关测试",
    "性能经验": "⚡ 性能测试相关经验",
    "安全规范": "🔒 安全测试规范和最佳实践"
}


class KnowledgeItemBase(BaseModel):
    """知识条目基础"""
    category: str = Field(..., description="知识类别")
    title: str = Field(..., max_length=200, description="标题")
    content: str = Field(..., description="内容")
    tags: List[str] = Field(default=[], description="标签")
    keywords: Optional[str] = Field(None, max_length=500, description="关键词")
    project_id: Optional[int] = Field(None, description="关联项目ID")
    related_interface_id: Optional[int] = Field(None, description="关联接口ID")


class KnowledgeItemCreate(KnowledgeItemBase):
    """创建知识条目"""
    source: str = Field(default="手动添加", description="来源")


class KnowledgeItemUpdate(BaseModel):
    """更新知识条目"""
    category: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    keywords: Optional[str] = None
    effectiveness_score: Optional[int] = None


class KnowledgeItemResponse(KnowledgeItemBase):
    """知识条目响应"""
    id: int
    source: str
    usage_count: int
    effectiveness_score: int
    created_by: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class KnowledgeSearchRequest(BaseModel):
    """知识搜索请求"""
    query: str = Field(..., description="搜索关键词")
    top_k: int = Field(default=5, ge=1, le=20, description="返回数量")
    category: Optional[str] = Field(None, description="限定类别")
    project_id: Optional[int] = Field(None, description="限定项目")


class KnowledgeSearchResult(BaseModel):
    """知识搜索结果"""
    id: int
    category: str
    title: str
    content: str
    tags: List[str]
    score: float = Field(..., description="匹配分数")
    usage_count: int


class KnowledgeFeedbackCreate(BaseModel):
    """创建反馈"""
    knowledge_id: int
    is_helpful: bool
    comment: Optional[str] = None


class KnowledgeStats(BaseModel):
    """知识库统计"""
    total_count: int
    by_category: dict
    total_usage: int
    avg_effectiveness: float


class ChatWithKnowledgeRequest(BaseModel):
    """带知识库的聊天请求"""
    message: str = Field(..., description="用户消息")
    conversation_history: List[dict] = Field(default=[], description="对话历史")
    project_id: Optional[int] = Field(None, description="项目ID")
    use_knowledge: bool = Field(default=True, description="是否使用知识库增强")
    stream: bool = Field(default=True, description="是否流式输出")


class ChatMessage(BaseModel):
    """聊天消息"""
    role: str  # user / assistant
    content: str
    knowledge_references: Optional[List[dict]] = None  # 引用的知识库内容
    timestamp: datetime = Field(default_factory=datetime.now)
