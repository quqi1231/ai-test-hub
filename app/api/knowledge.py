"""
RAG 知识库 API - 让 AI 记住团队测试经验
支持数据库持久化 + 智能检索
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.models import Knowledge, KnowledgeFeedback, User
from app.schemas.knowledge import (
    KnowledgeItemCreate, KnowledgeItemUpdate, KnowledgeItemResponse,
    KnowledgeSearchRequest, KnowledgeSearchResult, KnowledgeFeedbackCreate,
    KnowledgeStats, KNOWLEDGE_CATEGORIES
)

router = APIRouter(tags=["RAG 知识库"])


def get_current_user_id() -> Optional[int]:
    """获取当前用户ID（简化版，实际应从JWT获取）"""
    return 1


# ==================== 静态路由（放在动态路由之前） ====================

@router.get("/categories")
def get_categories():
    """获取知识类别"""
    return KNOWLEDGE_CATEGORIES


@router.get("/stats", response_model=KnowledgeStats)
def get_stats(db: Session = Depends(get_db)):
    """获取知识库统计"""
    total = db.query(func.count(Knowledge.id)).scalar() or 0
    total_usage = db.query(func.sum(Knowledge.usage_count)).scalar() or 0
    avg_effectiveness = db.query(func.avg(Knowledge.effectiveness_score)).scalar() or 0
    
    # 按类别统计
    by_category = {}
    categories = db.query(Knowledge.category, func.count(Knowledge.id)) \
                   .group_by(Knowledge.category).all()
    for cat, count in categories:
        by_category[cat] = count
    
    return KnowledgeStats(
        total_count=total,
        by_category=by_category,
        total_usage=total_usage,
        avg_effectiveness=round(avg_effectiveness, 2)
    )


@router.get("/list", response_model=List[KnowledgeItemResponse])
def list_knowledge(
    category: Optional[str] = None,
    project_id: Optional[int] = None,
    keyword: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """获取知识列表"""
    query = db.query(Knowledge)
    
    if category:
        query = query.filter(Knowledge.category == category)
    if project_id:
        query = query.filter(Knowledge.project_id == project_id)
    if keyword:
        query = query.filter(
            or_(
                Knowledge.title.contains(keyword),
                Knowledge.content.contains(keyword),
                Knowledge.keywords.contains(keyword)
            )
        )
    
    return query.order_by(Knowledge.usage_count.desc(), Knowledge.created_at.desc()) \
                .offset(skip).limit(limit).all()


@router.post("/add", response_model=KnowledgeItemResponse)
def add_knowledge(item: KnowledgeItemCreate, db: Session = Depends(get_db)):
    """添加知识条目"""
    knowledge = Knowledge(
        project_id=item.project_id,
        category=item.category,
        title=item.title,
        content=item.content,
        tags=item.tags,
        keywords=item.keywords,
        related_interface_id=item.related_interface_id,
        source=item.source,
        created_by=get_current_user_id()
    )
    db.add(knowledge)
    db.commit()
    db.refresh(knowledge)
    return knowledge


@router.post("/search", response_model=List[KnowledgeSearchResult])
def search_knowledge(search: KnowledgeSearchRequest, db: Session = Depends(get_db)):
    """
    搜索知识 - 关键词匹配 + 相关性评分
    支持中文搜索
    """
    query = db.query(Knowledge)
    
    # 过滤条件
    if search.category:
        query = query.filter(Knowledge.category == search.category)
    if search.project_id:
        query = query.filter(Knowledge.project_id == search.project_id)
    
    # 获取所有候选
    candidates = query.all()
    
    # 计算相关性分数
    results = []
    query_lower = search.query.lower()
    query_words = set(query_lower.split())
    
    # 对于中文，还需要检查每个字符/双字组合
    chinese_ngrams = set()
    if len(query_lower) > 1:
        for i in range(len(query_lower) - 1):
            chinese_ngrams.add(query_lower[i:i+2])
    
    for item in candidates:
        score = 0
        title_lower = item.title.lower()
        content_lower = item.content.lower()
        
        # 标题完全匹配
        if query_lower in title_lower:
            score += 20
        
        # 标题包含关键词
        title_words = set(title_lower.split())
        score += len(query_words & title_words) * 5
        
        # 中文双字匹配
        for ngram in chinese_ngrams:
            if ngram in title_lower:
                score += 10
            if ngram in content_lower:
                score += 5
        
        # 内容匹配
        if query_lower in content_lower:
            score += 10
        content_words = set(content_lower.split())
        score += len(query_words & content_words) * 2
        
        # 标签匹配
        if item.tags:
            for tag in item.tags:
                tag_lower = tag.lower()
                if query_lower in tag_lower:
                    score += 8
                # 检查查询词是否包含标签
                for word in query_words:
                    if word in tag_lower:
                        score += 5
                # 中文匹配
                for ngram in chinese_ngrams:
                    if ngram in tag_lower:
                        score += 6
        
        # 关键词匹配
        if item.keywords:
            keywords_lower = item.keywords.lower()
            if query_lower in keywords_lower:
                score += 15
            # 检查查询词是否匹配关键词
            for word in query_words:
                if word in keywords_lower:
                    score += 5
            # 中文匹配
            for ngram in chinese_ngrams:
                if ngram in keywords_lower:
                    score += 8
        
        # 使用次数加权
        score += min(item.usage_count or 0, 10)
        
        if score > 0:
            results.append(KnowledgeSearchResult(
                id=item.id,
                category=item.category,
                title=item.title,
                content=item.content,
                tags=item.tags or [],
                score=float(score),
                usage_count=item.usage_count or 0
            ))
    
    # 按分数排序
    results.sort(key=lambda x: x.score, reverse=True)
    
    # 更新使用次数
    if results:
        for r in results[:search.top_k]:
            knowledge = db.query(Knowledge).filter(Knowledge.id == r.id).first()
            if knowledge:
                knowledge.usage_count = (knowledge.usage_count or 0) + 1
        db.commit()
    
    return results[:search.top_k]


@router.post("/feedback")
def add_feedback(feedback: KnowledgeFeedbackCreate, db: Session = Depends(get_db)):
    """添加反馈"""
    knowledge = db.query(Knowledge).filter(Knowledge.id == feedback.knowledge_id).first()
    if not knowledge:
        raise HTTPException(status_code=404, detail="知识条目不存在")
    
    # 创建反馈记录
    fb = KnowledgeFeedback(
        knowledge_id=feedback.knowledge_id,
        user_id=get_current_user_id(),
        is_helpful=feedback.is_helpful,
        comment=feedback.comment
    )
    db.add(fb)
    
    # 更新有效性评分
    if feedback.is_helpful:
        knowledge.effectiveness_score = min(100, (knowledge.effectiveness_score or 0) + 5)
    else:
        knowledge.effectiveness_score = max(0, (knowledge.effectiveness_score or 0) - 5)
    
    db.commit()
    return {"message": "反馈已提交"}


@router.post("/bulk-import")
def bulk_import(items: List[KnowledgeItemCreate], db: Session = Depends(get_db)):
    """批量导入知识"""
    count = 0
    for item in items:
        knowledge = Knowledge(
            project_id=item.project_id,
            category=item.category,
            title=item.title,
            content=item.content,
            tags=item.tags,
            keywords=item.keywords,
            related_interface_id=item.related_interface_id,
            source=item.source,
            created_by=get_current_user_id()
        )
        db.add(knowledge)
        count += 1
    
    db.commit()
    return {"message": f"成功导入 {count} 条知识", "count": count}


# ==================== 动态路由（放在静态路由之后） ====================

@router.get("/{item_id}", response_model=KnowledgeItemResponse)
def get_knowledge(item_id: int, db: Session = Depends(get_db)):
    """获取单个知识条目"""
    knowledge = db.query(Knowledge).filter(Knowledge.id == item_id).first()
    if not knowledge:
        raise HTTPException(status_code=404, detail="知识条目不存在")
    return knowledge


@router.put("/{item_id}", response_model=KnowledgeItemResponse)
def update_knowledge(item_id: int, item: KnowledgeItemUpdate, db: Session = Depends(get_db)):
    """更新知识条目"""
    knowledge = db.query(Knowledge).filter(Knowledge.id == item_id).first()
    if not knowledge:
        raise HTTPException(status_code=404, detail="知识条目不存在")
    
    update_data = item.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(knowledge, key, value)
    
    db.commit()
    db.refresh(knowledge)
    return knowledge


@router.delete("/{item_id}")
def delete_knowledge(item_id: int, db: Session = Depends(get_db)):
    """删除知识条目"""
    knowledge = db.query(Knowledge).filter(Knowledge.id == item_id).first()
    if not knowledge:
        raise HTTPException(status_code=404, detail="知识条目不存在")
    
    db.delete(knowledge)
    db.commit()
    return {"message": "删除成功", "id": item_id}
