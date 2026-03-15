"""
AI Chat API - 支持 RAG 知识库增强 + 流式输出
"""
import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional, AsyncGenerator
from datetime import datetime
import httpx

from app.core.database import get_db
from app.core.config import settings
from app.models.models import Knowledge
from app.schemas.knowledge import ChatWithKnowledgeRequest, KNOWLEDGE_CATEGORIES

router = APIRouter(tags=["AI 聊天"])


async def search_knowledge_for_rag(
    query: str, 
    db: Session, 
    project_id: Optional[int] = None,
    top_k: int = 5
) -> List[dict]:
    """为 RAG 检索相关知识"""
    query_lower = query.lower()
    query_words = set(query_lower.split())
    
    # 构建查询
    q = db.query(Knowledge)
    if project_id:
        q = q.filter(Knowledge.project_id == project_id)
    
    candidates = q.limit(50).all()
    
    results = []
    for item in candidates:
        score = 0
        
        # 标题匹配
        if query_lower in item.title.lower():
            score += 20
        title_words = set(item.title.lower().split())
        score += len(query_words & title_words) * 5
        
        # 内容匹配
        if query_lower in item.content.lower():
            score += 10
        content_words = set(item.content.lower().split())
        score += len(query_words & content_words) * 2
        
        # 标签匹配
        if item.tags:
            for tag in item.tags:
                if query_lower in tag.lower():
                    score += 8
        
        # 关键词匹配
        if item.keywords and query_lower in item.keywords.lower():
            score += 15
        
        # 使用次数加权
        score += min(item.usage_count, 10)
        
        if score > 0:
            results.append({
                "id": item.id,
                "category": item.category,
                "title": item.title,
                "content": item.content,
                "score": float(score)
            })
    
    # 排序并返回 top_k
    results.sort(key=lambda x: x["score"], reverse=True)
    
    # 更新使用次数
    for r in results[:top_k]:
        knowledge = db.query(Knowledge).filter(Knowledge.id == r["id"]).first()
        if knowledge:
            knowledge.usage_count += 1
    db.commit()
    
    return results[:top_k]


def build_rag_prompt(
    user_message: str, 
    knowledge_results: List[dict],
    conversation_history: List[dict]
) -> str:
    """构建 RAG 增强的 prompt"""
    
    # 系统提示词
    system_prompt = """你是 AI TestHub 智能测试助手，专注于软件测试领域。你的职责是：
1. 帮助用户生成测试用例和测试方案
2. 分析测试结果，提供优化建议
3. 解答测试相关问题
4. 基于团队知识库提供专业建议

请用专业、友好的语气回答，必要时提供具体示例。"""

    # 知识库上下文
    knowledge_context = ""
    if knowledge_results:
        knowledge_context = "\n\n📚 以下是我找到的团队知识库相关内容，请参考：\n"
        for i, item in enumerate(knowledge_results, 1):
            knowledge_context += f"\n【{i}. {item['category']}】{item['title']}\n{item['content']}\n"
        knowledge_context += "\n请结合以上知识库内容回答用户问题，并在回答中引用相关知识点。\n"
    
    # 构建完整 prompt
    messages = [{"role": "system", "content": system_prompt}]
    
    # 添加历史对话
    for msg in conversation_history[-10:]:  # 最多保留10轮历史
        messages.append({
            "role": msg.get("role", "user"),
            "content": msg.get("content", "")
        })
    
    # 添加知识库上下文和当前问题
    enhanced_message = user_message + knowledge_context
    messages.append({"role": "user", "content": enhanced_message})
    
    return messages


async def stream_chat(
    messages: List[dict],
    model: str = None
) -> AsyncGenerator[str, None]:
    """流式调用 Ollama"""
    model = model or settings.ollama_model
    base_url = settings.ollama_base_url
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            async with client.stream(
                "POST",
                f"{base_url}/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": True
                }
            ) as response:
                async for line in response.aiter_lines():
                    if line:
                        try:
                            data = json.loads(line)
                            if "message" in data and "content" in data["message"]:
                                content = data["message"]["content"]
                                if content:
                                    yield f"data: {json.dumps({'content': content})}\n\n"
                        except json.JSONDecodeError:
                            continue
            
            # 发送结束标记
            yield f"data: {json.dumps({'done': True})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"


async def non_stream_chat(
    messages: List[dict],
    model: str = None
) -> str:
    """非流式调用 Ollama"""
    model = model or settings.ollama_model
    base_url = settings.ollama_base_url
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(
                f"{base_url}/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": False
                }
            )
            result = response.json()
            return result.get("message", {}).get("content", "")
        except Exception as e:
            return f"AI 服务调用失败: {str(e)}"


@router.post("/chat")
async def chat_with_knowledge(
    request: ChatWithKnowledgeRequest,
    db: Session = Depends(get_db)
):
    """
    AI 聊天 - 支持 RAG 知识库增强
    
    - use_knowledge: 是否使用知识库增强
    - stream: 是否流式输出
    """
    knowledge_results = []
    
    # 检索知识库
    if request.use_knowledge:
        knowledge_results = await search_knowledge_for_rag(
            query=request.message,
            db=db,
            project_id=request.project_id,
            top_k=5
        )
    
    # 构建 prompt
    messages = build_rag_prompt(
        user_message=request.message,
        knowledge_results=knowledge_results,
        conversation_history=request.conversation_history
    )
    
    if request.stream:
        # 流式输出
        return StreamingResponse(
            stream_chat(messages),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Knowledge-References": json.dumps(knowledge_results, ensure_ascii=False)
            }
        )
    else:
        # 非流式输出
        content = await non_stream_chat(messages)
        return {
            "content": content,
            "knowledge_references": knowledge_results,
            "model": settings.ollama_model,
            "timestamp": datetime.now().isoformat()
        }


@router.get("/models")
async def get_available_models():
    """获取可用的 AI 模型列表"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{settings.ollama_base_url}/api/tags")
            data = response.json()
            models = [m["name"] for m in data.get("models", [])]
            return {"models": models, "current": settings.ollama_model}
    except Exception as e:
        return {"models": [settings.ollama_model], "error": str(e)}


@router.post("/generate-cases")
async def generate_test_cases(
    requirement: str,
    project_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    AI 生成测试用例 - 集成知识库
    """
    # 检索相关知识
    knowledge_results = await search_knowledge_for_rag(
        query=requirement,
        db=db,
        project_id=project_id,
        top_k=3
    )
    
    # 构建增强 prompt
    prompt = f"""请根据以下需求生成测试用例：

需求描述：
{requirement}
"""

    if knowledge_results:
        prompt += "\n\n📚 参考团队知识库：\n"
        for item in knowledge_results:
            prompt += f"\n【{item['category']}】{item['title']}\n{item['content']}\n"
    
    prompt += """

请生成完整的测试用例，包含以下字段：
- name: 用例名称
- description: 用例描述
- steps: 测试步骤（数组）
- expected_result: 预期结果
- priority: 优先级（P0/P1/P2/P3）

请以 JSON 数组格式返回。"""

    messages = [{"role": "user", "content": prompt}]
    content = await non_stream_chat(messages)
    
    return {
        "cases": content,
        "knowledge_used": len(knowledge_results),
        "references": [{"title": r["title"], "category": r["category"]} for r in knowledge_results],
        "model": settings.ollama_model
    }


@router.post("/analyze-error")
async def analyze_error(
    error_description: str,
    db: Session = Depends(get_db)
):
    """
    AI 分析错误 - 结合历史踩坑经验
    """
    # 检索历史踩坑
    knowledge_results = await search_knowledge_for_rag(
        query=error_description,
        db=db,
        top_k=5
    )
    
    prompt = f"""请分析以下错误并给出修复建议：

错误描述：
{error_description}
"""

    if knowledge_results:
        prompt += "\n\n📚 相关历史经验：\n"
        for item in knowledge_results:
            prompt += f"\n【{item['category']}】{item['title']}\n{item['content']}\n"
    
    prompt += """

请提供：
1. 错误原因分析
2. 修复建议
3. 预防措施"""

    messages = [{"role": "user", "content": prompt}]
    content = await non_stream_chat(messages)
    
    return {
        "analysis": content,
        "knowledge_used": len(knowledge_results),
        "references": [{"title": r["title"], "category": r["category"]} for r in knowledge_results],
        "model": settings.ollama_model
    }
