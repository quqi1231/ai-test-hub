"""
AI 功能 API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.schemas.ai import AIGenerateRequest, AIGenerateResponse, AISummaryRequest, AISummaryResponse
from app.services.ai_service import OllamaService

router = APIRouter()

@router.post("/generate-cases", response_model=AIGenerateResponse)
async def generate_test_cases(request: AIGenerateRequest, db: Session = Depends(get_db)):
    """
    AI 生成测试用例
    基于需求描述或接口文档自动生成测试用例
    """
    ai_service = OllamaService()
    
    prompt = f"""请根据以下需求描述生成测试用例：
    
    需求：{request.requirement}
    
    请生成包含以下内容的测试用例：
    1. 用例名称
    2. 测试步骤
    3. 预期结果
    4. 优先级
    
    请以 JSON 数组格式返回，每个元素包含：name, steps, expected_result, priority
    """
    
    result = await ai_service.generate(prompt)
    
    return AIGenerateResponse(
        cases=result,
        model=settings.ollama_model
    )

@router.post("/summary", response_model=AISummaryResponse)
async def summarize_test_results(request: AISummaryRequest, db: Session = Depends(get_db)):
    """
    AI 总结测试报告
    自动分析测试结果，生成可读性高的总结报告
    """
    ai_service = OllamaService()
    
    prompt = f"""请总结以下测试结果：
    
    测试结果：{request.test_results}
    
    请提供：
    1. 总体概述
    2. 通过率分析
    3. 失败原因分析
    4. 改进建议
    
    请以 Markdown 格式返回
    """
    
    result = await ai_service.generate(prompt)
    
    return AISummaryResponse(
        summary=result,
        model=settings.ollama_model
    )

@router.post("/analyze-error")
async def analyze_error(error_description: str):
    """
    AI 分析错误原因
    根据错误信息自动归因并给出修复建议
    """
    ai_service = OllamaService()
    
    prompt = f"""请分析以下错误并给出修复建议：
    
    错误描述：{error_description}
    
    请提供：
    1. 错误原因分析
    2. 修复建议
    3. 预防措施
    """
    
    result = await ai_service.generate(prompt)
    
    return {"analysis": result, "model": settings.ollama_model}
